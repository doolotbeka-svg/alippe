/**
 * Озвучка.
 *
 * 1. Основной путь — готовые кыргызские mp3 из /audio (см. scripts/generate-audio.py).
 *    Любой файл можно заменить записью живого диктора с тем же именем.
 * 2. Запасной путь — Web Speech API. Кыргызского голоса почти нигде нет,
 *    поэтому ищем ky → kk → tr → ru и предпочитаем «естественные» нейроголоса.
 */

const AUDIO_BASE = '/audio/';
/** Скорость речи, при которой mp3 проигрывается без ускорения/замедления. */
const BASE_RATE = 0.88;

let manifest: Record<string, string> | null = null;
let manifestRequest: Promise<void> | null = null;
let currentAudio: HTMLAudioElement | null = null;
const audioCache = new Map<string, HTMLAudioElement>();

/** Должно совпадать с normalize() в scripts/generate-audio.py */
export function normalizeKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Загружает список аудиофайлов. Вызывается при старте, чтобы speak() работал синхронно. */
export function preloadSpeech(): Promise<void> {
  if (!manifestRequest) {
    initVoices();
    manifestRequest = fetch(`${AUDIO_BASE}index.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: unknown) => {
        manifest = data && typeof data === 'object' ? (data as Record<string, string>) : {};
      })
      .catch(() => {
        manifest = {};
      });
  }
  return manifestRequest;
}

function getAudio(file: string): HTMLAudioElement {
  let audio = audioCache.get(file);
  if (!audio) {
    audio = new Audio(AUDIO_BASE + file);
    audio.preload = 'auto';
    audioCache.set(file, audio);
  }
  return audio;
}

/** Заранее подгружает звуки (например, слоги и слова текущего урока). */
export function warmUp(texts: string[]): void {
  void preloadSpeech().then(() => {
    for (const t of texts) {
      const file = manifest?.[normalizeKey(t)];
      if (file) getAudio(file);
    }
  });
}

function stopAll(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (isSpeechSupported()) speechSynthesis.cancel();
}

// ---------- Web Speech (запасной вариант) ----------

const LANG_PREFERENCE = ['ky', 'kk', 'tr', 'ru'];
const NATURAL_HINTS = /natural|neural|online|google|premium|enhanced/i;

let cachedVoices: SpeechSynthesisVoice[] = [];

/** Chrome отдаёт список голосов асинхронно — подписываемся заранее. */
function initVoices(): void {
  if (!isSpeechSupported()) return;
  const load = () => {
    cachedVoices = speechSynthesis.getVoices();
  };
  load();
  speechSynthesis.addEventListener?.('voiceschanged', load);
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;
  const voices = cachedVoices.length ? cachedVoices : speechSynthesis.getVoices();
  for (const lang of LANG_PREFERENCE) {
    const matches = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
    if (matches.length) return matches.find((v) => NATURAL_HINTS.test(v.name)) ?? matches[0];
  }
  return null;
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function speakSynth(text: string, rate: number): void {
  if (!isSpeechSupported()) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      // Подходящих голосов нет в списке — просим хотя бы русский,
      // иначе браузер может взять английский голос, который не читает кириллицу.
      u.lang = 'ru-RU';
    }
    u.rate = Math.min(1.5, Math.max(0.5, rate));
    u.pitch = 1.05;
    speechSynthesis.speak(u);
  } catch {
    // Озвучка — не критичная функция.
  }
}

// ---------- Публичный API ----------

export function speak(text: string, rate = BASE_RATE): void {
  stopAll();
  const file = manifest?.[normalizeKey(text)];
  if (!file) {
    speakSynth(text, rate);
    return;
  }
  const audio = getAudio(file);
  audio.currentTime = 0;
  audio.playbackRate = Math.min(1.5, Math.max(0.6, rate / BASE_RATE));
  audio.preservesPitch = true;
  currentAudio = audio;
  audio.play().catch(() => {
    // Не удалось проиграть (нет файла офлайн и т.п.) — говорим синтезатором.
    if (currentAudio === audio) currentAudio = null;
    speakSynth(text, rate);
  });
}
