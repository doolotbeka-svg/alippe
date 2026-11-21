/**
 * Озвучка через Web Speech API. Кыргызский голос есть далеко не везде,
 * поэтому пробуем ky → kk → tr → ru, иначе голос по умолчанию.
 */
const LANG_PREFERENCE = ['ky', 'kk', 'tr', 'ru'];

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null;
  const voices = speechSynthesis.getVoices();
  for (const lang of LANG_PREFERENCE) {
    const v = voices.find((voice) => voice.lang.toLowerCase().startsWith(lang));
    if (v) return v;
  }
  return null;
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string, rate = 0.9): void {
  if (!isSpeechSupported()) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = 'ky-KG';
    }
    u.rate = Math.min(1.5, Math.max(0.5, rate));
    speechSynthesis.speak(u);
  } catch {
    // Озвучка — не критичная функция.
  }
}
