export type MathRangeId = '1-10' | '11-20' | 'tens-10-100' | '1-100';

export interface LessonWord {
  word: string;
  translation: string;
  emoji: string;
}

export interface LetterRiddle {
  /** Текст загадки (на русском, ответ — кыргызское слово из списка). */
  text: string;
  /** Индекс правильного слова в массиве words. */
  answerIndex: number;
}

export interface LetterLesson {
  id: string;
  isVowel: boolean;
  syllables: string[];
  words: LessonWord[];
  riddle: LetterRiddle;
}

export interface MathRange {
  id: MathRangeId;
  label: string;
  min: number;
  max: number;
  step: number;
}

const VOWELS_FOR_SYLLABLES = ['а', 'о', 'у', 'ы', 'э', 'ө', 'ү', 'и'];
const CONSONANTS_FOR_SYLLABLES = ['м', 'н', 'т', 'к', 'л', 'с'];

function makeSyllables(letter: string, isVowel: boolean): string[] {
  const lower = letter.toLowerCase();
  if (isVowel) {
    return CONSONANTS_FOR_SYLLABLES.map((c) => `${lower}${c}`);
  }
  // Для «Э» после согласной в кыргызском пишется «е».
  return VOWELS_FOR_SYLLABLES.map((v) => `${lower}${v === 'э' ? 'е' : v}`);
}

function lesson(
  id: string,
  isVowel: boolean,
  words: LessonWord[],
  riddle: LetterRiddle
): LetterLesson {
  return { id, isVowel, syllables: makeSyllables(id, isVowel), words, riddle };
}

export const LETTER_LESSONS: LetterLesson[] = [
  lesson(
    'А',
    true,
    [
      { word: 'алма', translation: 'яблоко', emoji: '🍎' },
      { word: 'ай', translation: 'луна', emoji: '🌙' },
      { word: 'ат', translation: 'конь', emoji: '🐎' },
      { word: 'апа', translation: 'мама', emoji: '👩' },
      { word: 'ата', translation: 'дедушка', emoji: '👴' },
    ],
    { text: 'Круглое, румяное, растёт на дереве в саду.', answerIndex: 0 }
  ),
  lesson(
    'О',
    true,
    [
      { word: 'от', translation: 'огонь', emoji: '🔥' },
      { word: 'оюн', translation: 'игра', emoji: '🎲' },
      { word: 'окуучу', translation: 'ученик', emoji: '🧒' },
      { word: 'орун', translation: 'место', emoji: '🪑' },
      { word: 'ой', translation: 'мысль', emoji: '💭' },
    ],
    { text: 'Горячий, яркий, греет и светит в костре.', answerIndex: 0 }
  ),
  lesson(
    'Б',
    false,
    [
      { word: 'бала', translation: 'ребёнок', emoji: '👶' },
      { word: 'бал', translation: 'мёд', emoji: '🍯' },
      { word: 'бака', translation: 'лягушка', emoji: '🐸' },
      { word: 'бөрү', translation: 'волк', emoji: '🐺' },
      { word: 'бут', translation: 'нога', emoji: '🦶' },
    ],
    { text: 'Зелёная, прыгает и квакает у пруда.', answerIndex: 2 }
  ),
  lesson(
    'М',
    false,
    [
      { word: 'мышык', translation: 'кошка', emoji: '🐱' },
      { word: 'мектеп', translation: 'школа', emoji: '🏫' },
      { word: 'муз', translation: 'лёд', emoji: '🧊' },
      { word: 'мөмө', translation: 'ягода, фрукт', emoji: '🍓' },
      { word: 'машина', translation: 'машина', emoji: '🚗' },
    ],
    { text: 'Мягкие лапки, а в лапках царапки, говорит «мяу».', answerIndex: 0 }
  ),
  lesson(
    'К',
    false,
    [
      { word: 'күн', translation: 'солнце', emoji: '☀️' },
      { word: 'кой', translation: 'овца', emoji: '🐑' },
      { word: 'китеп', translation: 'книга', emoji: '📖' },
      { word: 'кар', translation: 'снег', emoji: '❄️' },
      { word: 'куш', translation: 'птица', emoji: '🐦' },
    ],
    { text: 'Не лист, а с листочками; не человек, а рассказывает.', answerIndex: 2 }
  ),
  lesson(
    'Т',
    false,
    [
      { word: 'тоо', translation: 'гора', emoji: '⛰️' },
      { word: 'төө', translation: 'верблюд', emoji: '🐫' },
      { word: 'таш', translation: 'камень', emoji: '🪨' },
      { word: 'тоок', translation: 'курица', emoji: '🐔' },
      { word: 'туз', translation: 'соль', emoji: '🧂' },
    ],
    { text: 'Высокая, со снежной шапкой, до облаков достаёт.', answerIndex: 0 }
  ),
  lesson(
    'Ж',
    false,
    [
      { word: 'жылдыз', translation: 'звезда', emoji: '⭐' },
      { word: 'жылкы', translation: 'лошадь', emoji: '🐴' },
      { word: 'жаан', translation: 'дождь', emoji: '🌧️' },
      { word: 'жүзүм', translation: 'виноград', emoji: '🍇' },
      { word: 'жол', translation: 'дорога', emoji: '🛣️' },
    ],
    { text: 'Ночью на небе мигает, а днём пропадает.', answerIndex: 0 }
  ),
  lesson(
    'Ө',
    true,
    [
      { word: 'өрүк', translation: 'абрикос', emoji: '🍑' },
      { word: 'өрдөк', translation: 'утка', emoji: '🦆' },
      { word: 'өтүк', translation: 'сапог', emoji: '👢' },
      { word: 'өзөн', translation: 'речка', emoji: '🏞️' },
      { word: 'өгүз', translation: 'бык', emoji: '🐂' },
    ],
    { text: 'Плавает в пруду и говорит «кря-кря».', answerIndex: 1 }
  ),
  lesson(
    'Ү',
    true,
    [
      { word: 'үй', translation: 'дом', emoji: '🏠' },
      { word: 'үкү', translation: 'сова', emoji: '🦉' },
      { word: 'үтүк', translation: 'утюг', emoji: '🧺' },
      { word: 'үч', translation: 'три', emoji: '3️⃣' },
      { word: 'үн', translation: 'голос', emoji: '🔊' },
    ],
    { text: 'Днём спит, ночью летает, большими глазами всё видит.', answerIndex: 1 }
  ),
  lesson(
    'С',
    false,
    [
      { word: 'суу', translation: 'вода', emoji: '💧' },
      { word: 'сүт', translation: 'молоко', emoji: '🥛' },
      { word: 'саат', translation: 'часы', emoji: '⏰' },
      { word: 'сабиз', translation: 'морковь', emoji: '🥕' },
      { word: 'сары', translation: 'жёлтый', emoji: '🟡' },
    ],
    { text: 'Тикают, но не ходят; время всем показывают.', answerIndex: 2 }
  ),
  lesson(
    'Ч',
    false,
    [
      { word: 'чычкан', translation: 'мышь', emoji: '🐭' },
      { word: 'чымчык', translation: 'воробей', emoji: '🐦' },
      { word: 'чай', translation: 'чай', emoji: '🍵' },
      { word: 'чана', translation: 'санки', emoji: '🛷' },
      { word: 'чач', translation: 'волосы', emoji: '💇' },
    ],
    { text: 'Маленькая, серенькая, боится кошку и пищит.', answerIndex: 0 }
  ),
  lesson(
    'Э',
    true,
    [
      { word: 'эне', translation: 'мать', emoji: '👩‍👧' },
      { word: 'эшик', translation: 'дверь', emoji: '🚪' },
      { word: 'эшек', translation: 'осёл', emoji: '🫏' },
      { word: 'эт', translation: 'мясо', emoji: '🥩' },
      { word: 'элек', translation: 'сито', emoji: '🥣' },
    ],
    { text: 'Её открывают, когда входят в дом.', answerIndex: 1 }
  ),
];

export const MATH_RANGES: MathRange[] = [
  { id: '1-10', label: 'Числа 1–10', min: 1, max: 10, step: 1 },
  { id: '11-20', label: 'Числа 11–20', min: 11, max: 20, step: 1 },
  { id: 'tens-10-100', label: 'Десятки 10–100', min: 10, max: 100, step: 10 },
  { id: '1-100', label: 'Числа 1–100', min: 1, max: 100, step: 1 },
];

export const MATH_RANGE_IDS: MathRangeId[] = MATH_RANGES.map((r) => r.id);

export function isMathRangeId(value: unknown): value is MathRangeId {
  return typeof value === 'string' && (MATH_RANGE_IDS as string[]).includes(value);
}

export function getLetterLesson(id: string): LetterLesson {
  return LETTER_LESSONS.find((l) => l.id === id) ?? LETTER_LESSONS[0];
}

export function getMathRange(id: MathRangeId): MathRange {
  return MATH_RANGES.find((r) => r.id === id) ?? MATH_RANGES[0];
}

const ONES = ['', 'бир', 'эки', 'үч', 'төрт', 'беш', 'алты', 'жети', 'сегиз', 'тогуз'];
const TENS = ['', 'он', 'жыйырма', 'отуз', 'кырк', 'элүү', 'алтымыш', 'жетимиш', 'сексен', 'токсон'];

/** Число от 0 до 100 словами на кыргызском. */
export function numberToKyrgyz(n: number): string {
  if (n === 0) return 'нөл';
  if (n === 100) return 'жүз';
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return [TENS[tens], ONES[ones]].filter(Boolean).join(' ');
}

export interface MathQuestion {
  prompt: string;
  /** Число, которое показываем картинками (для небольших диапазонов). */
  visualCount: number | null;
  answer: number;
  options: number[];
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickValue(range: MathRange): number {
  const steps = Math.floor((range.max - range.min) / range.step);
  return range.min + randInt(0, steps) * range.step;
}

function buildOptions(answer: number, range: MathRange): number[] {
  const set = new Set<number>([answer]);
  let guard = 0;
  while (set.size < 3 && guard++ < 50) {
    const delta = (randInt(1, 3) * range.step) * (Math.random() < 0.5 ? -1 : 1);
    const candidate = answer + delta;
    if (candidate >= Math.max(1, range.min - range.step) && candidate <= range.max + range.step) {
      set.add(candidate);
    }
  }
  return shuffle([...set]);
}

export function generateMathQuestions(rangeId: MathRangeId, count = 3): MathQuestion[] {
  const range = getMathRange(rangeId);
  return Array.from({ length: count }, (_, i) => {
    const value = pickValue(range);
    if (range.id === '1-10' && i === 0) {
      return {
        prompt: 'Сколько здесь звёздочек? Канча?',
        visualCount: value,
        answer: value,
        options: buildOptions(value, range),
      };
    }
    if (i % 2 === 1 && value < range.max) {
      const next = value + range.step;
      return {
        prompt: `Какое число идёт после «${numberToKyrgyz(value)}» (${value})?`,
        visualCount: null,
        answer: next,
        options: buildOptions(next, range),
      };
    }
    return {
      prompt: `Найди число «${numberToKyrgyz(value)}»`,
      visualCount: null,
      answer: value,
      options: buildOptions(value, range),
    };
  });
}
