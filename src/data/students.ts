import { isMathRangeId, LETTER_LESSONS, MathRangeId } from './curriculum';

export interface StudentSettings {
  theme: 'light' | 'dark';
  speechRate: number;
  soundEnabled: boolean;
}

export interface LessonHistoryEntry {
  id: string;
  timestamp: string;
  letterId: string;
  mathRange: MathRangeId;
  starsEarned: number;
  blocksCompleted: number;
}

export type StudentStatus = 'active' | 'idle' | 'offline';

export interface StudentAccount {
  id: string;
  name: string;
  avatarEmoji: string;
  avatarColor: string;
  grade: string;
  stars: number;
  streakDays: number;
  completedLessons: number;
  letterMastery: Record<string, number>;
  mathMastery: Record<MathRangeId, number>;
  lastActiveAt: string;
  status: StudentStatus;
  currentActivity: string;
  settings: StudentSettings;
  history: LessonHistoryEntry[];
}

export interface ActivityEvent {
  id: string;
  studentId: string;
  studentName: string;
  message: string;
  starsDelta: number;
  timestamp: string;
}

export interface ClassAssignment {
  letterId: string;
  mathRange: MathRangeId;
  note: string;
  updatedAt: string;
}

export const STORAGE_KEYS = {
  STUDENTS: 'alippe:students:v1',
  ACTIVE_STUDENT: 'alippe:active-student:v1',
  EVENTS: 'alippe:events:v1',
  ASSIGNMENT: 'alippe:assignment:v1',
} as const;

export const SYNC_CHANNEL_NAME = 'alippe-class-sync';

export const MAX_EVENTS = 40;

export function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const DEFAULT_SETTINGS: StudentSettings = {
  theme: 'light',
  speechRate: 0.88,
  soundEnabled: true,
};

export function emptyLetterMastery(): Record<string, number> {
  const result: Record<string, number> = {};
  LETTER_LESSONS.forEach((l) => {
    result[l.id] = 0;
  });
  return result;
}

export function emptyMathMastery(): Record<MathRangeId, number> {
  return { '1-10': 0, '11-20': 0, 'tens-10-100': 0, '1-100': 0 };
}

const AVATAR_COLORS = [
  'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
];

export function pickAvatarColor(seed: number): string {
  return AVATAR_COLORS[Math.abs(seed) % AVATAR_COLORS.length];
}

function seedStudent(
  index: number,
  name: string,
  emoji: string,
  stars: number,
  progress: number
): StudentAccount {
  const letterMastery = emptyLetterMastery();
  LETTER_LESSONS.forEach((l, i) => {
    letterMastery[l.id] = Math.max(0, Math.min(100, progress - i * 12));
  });
  return {
    id: `student-${index}`,
    name,
    avatarEmoji: emoji,
    avatarColor: pickAvatarColor(index),
    grade: '1-«А» класс',
    stars,
    streakDays: Math.max(1, Math.round(progress / 20)),
    completedLessons: Math.round(progress / 10),
    letterMastery,
    mathMastery: {
      '1-10': Math.min(100, progress + 10),
      '11-20': Math.max(0, progress - 20),
      'tens-10-100': Math.max(0, progress - 40),
      '1-100': Math.max(0, progress - 60),
    },
    lastActiveAt: new Date(Date.now() - index * 3_600_000).toISOString(),
    status: 'idle',
    currentActivity: 'Ожидает занятия',
    settings: { ...DEFAULT_SETTINGS },
    history: [],
  };
}

export function createSeedStudents(): StudentAccount[] {
  return [
    seedStudent(1, 'Айбек', '🦅', 42, 80),
    seedStudent(2, 'Айгерим', '🌸', 55, 95),
    seedStudent(3, 'Нурлан', '🐎', 18, 45),
    seedStudent(4, 'Бермет', '🦋', 30, 60),
    seedStudent(5, 'Эмир', '🦁', 9, 25),
    seedStudent(6, 'Алина', '🐱', 24, 50),
  ];
}

export function createDefaultAssignment(): ClassAssignment {
  return {
    letterId: LETTER_LESSONS[0].id,
    mathRange: '1-10',
    note: '',
    updatedAt: new Date().toISOString(),
  };
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Дополняет сохранённого ученика недостающими полями (на случай старых версий данных). */
function normalizeStudent(raw: unknown): StudentAccount | null {
  if (!isObject(raw) || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  const s = raw as Partial<StudentAccount>;
  return {
    id: s.id!,
    name: s.name!,
    avatarEmoji: s.avatarEmoji ?? '🙂',
    avatarColor: s.avatarColor ?? pickAvatarColor(0),
    grade: s.grade ?? '1-«А» класс',
    stars: Number.isFinite(s.stars) ? (s.stars as number) : 0,
    streakDays: Number.isFinite(s.streakDays) ? (s.streakDays as number) : 1,
    completedLessons: Number.isFinite(s.completedLessons) ? (s.completedLessons as number) : 0,
    letterMastery: { ...emptyLetterMastery(), ...(isObject(s.letterMastery) ? s.letterMastery : {}) },
    mathMastery: { ...emptyMathMastery(), ...(isObject(s.mathMastery) ? s.mathMastery : {}) },
    lastActiveAt: s.lastActiveAt ?? new Date().toISOString(),
    status: s.status ?? 'idle',
    currentActivity: s.currentActivity ?? '',
    settings: { ...DEFAULT_SETTINGS, ...(isObject(s.settings) ? s.settings : {}) },
    history: Array.isArray(s.history) ? s.history : [],
  };
}

export function loadStoredStudents(): StudentAccount[] {
  const raw = readJson(STORAGE_KEYS.STUDENTS);
  if (Array.isArray(raw)) {
    const list = raw.map(normalizeStudent).filter((s): s is StudentAccount => s !== null);
    if (list.length > 0) return list;
  }
  return createSeedStudents();
}

export function loadStoredAssignment(): ClassAssignment {
  const raw = readJson(STORAGE_KEYS.ASSIGNMENT);
  const fallback = createDefaultAssignment();
  if (!isObject(raw)) return fallback;
  const letterOk = typeof raw.letterId === 'string' && LETTER_LESSONS.some((l) => l.id === raw.letterId);
  return {
    letterId: letterOk ? (raw.letterId as string) : fallback.letterId,
    mathRange: isMathRangeId(raw.mathRange) ? raw.mathRange : fallback.mathRange,
    note: typeof raw.note === 'string' ? raw.note : '',
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : fallback.updatedAt,
  };
}

export function loadStoredEvents(students: StudentAccount[]): ActivityEvent[] {
  const raw = readJson(STORAGE_KEYS.EVENTS);
  if (Array.isArray(raw)) {
    return raw
      .filter((e): e is ActivityEvent => isObject(e) && typeof e.id === 'string' && typeof e.message === 'string')
      .slice(0, MAX_EVENTS);
  }
  // Стартовая лента, чтобы панель учителя не была пустой.
  return students.slice(0, 3).map((s, i) => ({
    id: makeId('ev-seed'),
    studentId: s.id,
    studentName: s.name,
    message: 'Завершил(а) вчерашнее занятие',
    starsDelta: 3 + i,
    timestamp: new Date(Date.now() - (i + 1) * 5_400_000).toISOString(),
  }));
}
