import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Download,
  Moon,
  PartyPopper,
  RotateCcw,
  Star,
  Sun,
  Volume2,
  VolumeX,
  WifiOff,
} from 'lucide-react';
import {
  generateMathQuestions,
  getLetterLesson,
  LETTER_LESSONS,
  MATH_RANGES,
  MathRangeId,
  letterSpeechText,
  numberToKyrgyz,
  PRAISE,
} from '../data/curriculum';
import type { ClassAssignment, StudentAccount } from '../data/students';
import { speak, warmUp } from '../lib/speech';

interface LessonWorkspaceProps {
  student: StudentAccount;
  assignment: ClassAssignment;
  selectedLetterId: string;
  selectedMathRange: MathRangeId;
  onSelectLetter: (id: string) => void;
  onSelectMathRange: (id: MathRangeId) => void;
  onEarnStars: (
    amount: number,
    reason: string,
    letterId: string,
    mathRange: MathRangeId,
    blockIndex: number
  ) => void;
  onFinishLesson: (letterId: string, mathRange: MathRangeId, sessionStars: number) => void;
  onToggleTheme: () => void;
  onToggleSound: () => void;
  isOnline: boolean;
  isInstallable: boolean;
  onInstallPWA: () => void;
}

const BLOCKS = [
  { title: 'Слоги', subtitle: 'Муундар' },
  { title: 'Слова', subtitle: 'Сөздөр' },
  { title: 'Счёт', subtitle: 'Эсеп' },
  { title: 'Загадка', subtitle: 'Табышмак' },
];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function LessonWorkspace(props: LessonWorkspaceProps) {
  const {
    student,
    assignment,
    selectedLetterId,
    selectedMathRange,
    onSelectLetter,
    onSelectMathRange,
    onEarnStars,
    onFinishLesson,
    onToggleTheme,
    onToggleSound,
    isOnline,
    isInstallable,
    onInstallPWA,
  } = props;

  const lesson = getLetterLesson(selectedLetterId);
  const { soundEnabled, speechRate, theme } = student.settings;

  const [blockIndex, setBlockIndex] = useState(0);
  const [completed, setCompleted] = useState<boolean[]>([false, false, false, false]);
  const [sessionStars, setSessionStars] = useState(0);
  const [heardSyllables, setHeardSyllables] = useState<Set<string>>(new Set());
  const [heardWords, setHeardWords] = useState<Set<number>>(new Set());
  const [mathSeed, setMathSeed] = useState(0);
  const [mathIndex, setMathIndex] = useState(0);
  const [mathFeedback, setMathFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [riddleResult, setRiddleResult] = useState<'correct' | 'wrong' | null>(null);
  const [finished, setFinished] = useState(false);

  const mathQuestions = useMemo(
    () => generateMathQuestions(selectedMathRange, 3),
    // mathSeed нужен, чтобы перегенерировать вопросы при перезапуске
    [selectedMathRange, mathSeed]
  );

  const riddleOptions = useMemo(() => {
    const answer = lesson.riddle.answerIndex;
    const others = shuffle(lesson.words.map((_, i) => i).filter((i) => i !== answer)).slice(0, 2);
    return shuffle([answer, ...others]);
  }, [lesson]);

  const resetSession = () => {
    setBlockIndex(0);
    setCompleted([false, false, false, false]);
    setSessionStars(0);
    setHeardSyllables(new Set());
    setHeardWords(new Set());
    setMathIndex(0);
    setMathFeedback(null);
    setRiddleResult(null);
    setFinished(false);
    setMathSeed((s) => s + 1);
  };

  // Новый урок при смене буквы или диапазона счёта.
  useEffect(() => {
    resetSession();
  }, [selectedLetterId, selectedMathRange]);

  // Заранее подгружаем звуки урока, чтобы не было задержки при нажатии.
  useEffect(() => {
    warmUp([
      letterSpeechText(lesson.id),
      ...lesson.syllables,
      ...lesson.words.map((w) => w.word),
      ...Object.values(PRAISE),
    ]);
  }, [lesson]);

  const say = (text: string) => {
    if (soundEnabled) speak(text, speechRate);
  };

  const earn = (amount: number, reason: string, block: number) => {
    setSessionStars((s) => s + amount);
    onEarnStars(amount, reason, lesson.id, selectedMathRange, block);
  };

  const completeBlock = (block: number, stars: number, reason: string) => {
    if (completed[block]) return;
    setCompleted((prev) => prev.map((v, i) => (i === block ? true : v)));
    earn(stars, reason, block);
  };

  const allDone = completed.every(Boolean);

  // --- Блок 0: слоги
  const tapSyllable = (syl: string) => {
    say(syl);
    const next = new Set(heardSyllables).add(syl);
    setHeardSyllables(next);
    if (next.size === lesson.syllables.length) {
      completeBlock(0, 2, `Прочитал(а) слоги буквы «${lesson.id}»`);
    }
  };

  // --- Блок 1: слова
  const tapWord = (index: number) => {
    say(lesson.words[index].word);
    const next = new Set(heardWords).add(index);
    setHeardWords(next);
    if (next.size === lesson.words.length) {
      completeBlock(1, 3, `Узнал(а) все ${lesson.words.length} слов на букву «${lesson.id}»`);
    }
  };

  // --- Блок 2: счёт
  const question = mathQuestions[Math.min(mathIndex, mathQuestions.length - 1)];
  const answerMath = (value: number) => {
    if (mathFeedback === 'correct' || completed[2]) return;
    if (value === question.answer) {
      setMathFeedback('correct');
      say(numberToKyrgyz(value));
      earn(1, `Решил(а) задачу: ${value} — «${numberToKyrgyz(value)}»`, 2);
      window.setTimeout(() => {
        if (mathIndex + 1 >= mathQuestions.length) {
          setCompleted((prev) => prev.map((v, i) => (i === 2 ? true : v)));
        } else {
          setMathIndex((i) => i + 1);
        }
        setMathFeedback(null);
      }, 900);
    } else {
      setMathFeedback('wrong');
      say(PRAISE.tryAgain);
    }
  };

  // --- Блок 3: загадка
  const answerRiddle = (index: number) => {
    if (completed[3]) return;
    if (index === lesson.riddle.answerIndex) {
      say(lesson.words[index].word);
      setRiddleResult('correct');
      completeBlock(3, 3, `Отгадал(а) загадку «Табышмак» на букву «${lesson.id}»`);
    } else {
      say(PRAISE.tryAgain);
      setRiddleResult('wrong');
    }
  };

  const finish = () => {
    onFinishLesson(lesson.id, selectedMathRange, sessionStars);
    setFinished(true);
    say(PRAISE.wellDone);
  };

  const isAssigned = assignment.letterId === lesson.id && assignment.mathRange === selectedMathRange;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Боковая панель */}
      <aside className="space-y-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Буква</div>
          <div className="mt-2 grid grid-cols-6 gap-1.5">
            {LETTER_LESSONS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => onSelectLetter(l.id)}
                className={`relative aspect-square rounded-lg font-display font-bold text-lg ${
                  l.id === selectedLetterId
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title={`Освоено: ${student.letterMastery[l.id] ?? 0}%`}
              >
                {l.id}
                {assignment.letterId === l.id && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500" />
                )}
              </button>
            ))}
          </div>

          <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Счёт</div>
          <div className="mt-2 grid gap-1.5">
            {MATH_RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelectMathRange(r.id)}
                className={`rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                  r.id === selectedMathRange
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {r.label}
                {assignment.mathRange === r.id && ' · задание'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onToggleSound} className="icon-btn" aria-label="Звук">
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {soundEnabled ? 'Звук вкл.' : 'Звук выкл.'}
          </button>
          <button type="button" onClick={onToggleTheme} className="icon-btn" aria-label="Тема">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === 'dark' ? 'Светлая' : 'Тёмная'}
          </button>
          {isInstallable && (
            <button type="button" onClick={onInstallPWA} className="icon-btn">
              <Download className="w-4 h-4" /> Установить
            </button>
          )}
        </div>
        {!isOnline && (
          <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <WifiOff className="w-3.5 h-3.5" /> Нет сети — урок работает офлайн.
          </p>
        )}
      </aside>

      {/* Основная часть */}
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-8 min-h-[480px]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => say(letterSpeechText(lesson.id))}
              className="grid place-items-center w-20 h-20 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-display font-bold text-5xl"
              aria-label={`Послушать букву ${lesson.id}`}
            >
              {lesson.id}
              <span className="sr-only">{lesson.id.toLowerCase()}</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold">
                Буква «{lesson.id} {lesson.id.toLowerCase()}»
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {lesson.isVowel ? 'Гласная · Үндүү тыбыш' : 'Согласная · Үнсүз тыбыш'}
                {isAssigned && ' · Задание учителя'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 font-bold text-amber-700 dark:text-amber-300 font-mono-num">
            <Star className="w-4 h-4 fill-current" /> +{sessionStars}
          </div>
        </div>

        {assignment.note && (
          <p className="mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
            Учитель: {assignment.note}
          </p>
        )}

        {/* Шаги */}
        <ol className="mt-6 grid grid-cols-4 gap-2">
          {BLOCKS.map((b, i) => (
            <li key={b.title}>
              <button
                type="button"
                onClick={() => setBlockIndex(i)}
                className={`w-full rounded-xl px-2 py-2 text-left border-2 transition-colors ${
                  i === blockIndex
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-1 text-sm font-semibold">
                  {completed[i] && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                  <span className="truncate">{b.title}</span>
                </div>
                <div className="text-xs text-slate-500 truncate">{b.subtitle}</div>
              </button>
            </li>
          ))}
        </ol>

        <div className="mt-6">
          {finished ? (
            <div className="text-center py-10 space-y-4">
              <PartyPopper className="w-14 h-14 mx-auto text-amber-500" />
              <h2 className="text-2xl font-bold">Азаматсың, {student.name}!</h2>
              <p className="text-slate-600 dark:text-slate-400">
                Занятие завершено. Получено звёзд: <b className="font-mono-num">{sessionStars}</b>
              </p>
              <button type="button" onClick={resetSession} className="primary-btn mx-auto">
                <RotateCcw className="w-4 h-4" /> Ещё раз
              </button>
            </div>
          ) : (
            <>
              {blockIndex === 0 && (
                <div>
                  <p className="text-slate-600 dark:text-slate-400">Нажми на каждый слог и повтори вслух.</p>
                  <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {lesson.syllables.map((syl) => (
                      <button
                        key={syl}
                        type="button"
                        onClick={() => tapSyllable(syl)}
                        className={`rounded-2xl py-5 font-display text-3xl font-bold border-2 transition-colors ${
                          heardSyllables.has(syl)
                            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                            : 'border-slate-200 dark:border-slate-700 hover:border-sky-400'
                        }`}
                      >
                        {syl}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {blockIndex === 1 && (
                <div>
                  <p className="text-slate-600 dark:text-slate-400">Нажми на картинку, чтобы услышать слово.</p>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {lesson.words.map((w, i) => (
                      <button
                        key={w.word}
                        type="button"
                        onClick={() => tapWord(i)}
                        className={`rounded-2xl p-4 border-2 transition-colors ${
                          heardWords.has(i)
                            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                            : 'border-slate-200 dark:border-slate-700 hover:border-sky-400'
                        }`}
                      >
                        <div className="text-5xl">{w.emoji}</div>
                        <div className="mt-2 font-display text-xl font-bold">
                          <span className="text-sky-600 dark:text-sky-400">{w.word.slice(0, 1)}</span>
                          {w.word.slice(1)}
                        </div>
                        <div className="text-xs text-slate-500">{w.translation}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {blockIndex === 2 && (
                <div>
                  {completed[2] ? (
                    <p className="text-emerald-600 font-semibold">Все задачи решены! Эсеп бүттү.</p>
                  ) : (
                    <>
                      <p className="text-sm text-slate-500">
                        Задача {mathIndex + 1} из {mathQuestions.length}
                      </p>
                      <p className="mt-1 text-xl font-semibold">{question.prompt}</p>
                      {question.visualCount !== null && (
                        <div className="mt-4 flex flex-wrap gap-2 text-3xl" aria-hidden>
                          {Array.from({ length: question.visualCount }, (_, i) => (
                            <span key={i}>⭐</span>
                          ))}
                        </div>
                      )}
                      <div className="mt-5 flex flex-wrap gap-3">
                        {question.options.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => answerMath(opt)}
                            className="min-w-24 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-sky-400 px-5 py-4 font-mono-num text-3xl font-bold"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      {mathFeedback === 'correct' && (
                        <p className="mt-3 font-semibold text-emerald-600">Туура! Правильно!</p>
                      )}
                      {mathFeedback === 'wrong' && (
                        <p className="mt-3 font-semibold text-rose-600">Попробуй ещё раз.</p>
                      )}
                    </>
                  )}
                </div>
              )}

              {blockIndex === 3 && (
                <div>
                  <p className="text-sm font-semibold text-slate-500">Табышмак</p>
                  <p className="mt-1 text-xl font-semibold">{lesson.riddle.text}</p>
                  <div className="mt-5 grid grid-cols-3 gap-3 max-w-lg">
                    {riddleOptions.map((i) => {
                      const w = lesson.words[i];
                      const isAnswer = completed[3] && i === lesson.riddle.answerIndex;
                      return (
                        <button
                          key={w.word}
                          type="button"
                          onClick={() => answerRiddle(i)}
                          className={`rounded-2xl p-4 border-2 ${
                            isAnswer
                              ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                              : 'border-slate-200 dark:border-slate-700 hover:border-sky-400'
                          }`}
                        >
                          <div className="text-4xl">{w.emoji}</div>
                          <div className="mt-1 font-display font-bold">{w.word}</div>
                        </button>
                      );
                    })}
                  </div>
                  {riddleResult === 'correct' && (
                    <p className="mt-3 font-semibold text-emerald-600">Туура! Ты отгадал(а)!</p>
                  )}
                  {riddleResult === 'wrong' && (
                    <p className="mt-3 font-semibold text-rose-600">Не то. Подумай ещё!</p>
                  )}
                </div>
              )}

              <div className="mt-8 flex flex-wrap justify-end gap-3">
                {allDone ? (
                  <button type="button" onClick={finish} className="primary-btn">
                    <PartyPopper className="w-4 h-4" /> Завершить занятие
                  </button>
                ) : (
                  blockIndex < BLOCKS.length - 1 && (
                    <button type="button" onClick={() => setBlockIndex((i) => i + 1)} className="primary-btn">
                      Дальше <ChevronRight className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
