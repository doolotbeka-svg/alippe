import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { isMathRangeId, LETTER_LESSONS, MATH_RANGES, MathRangeId } from './data/curriculum';
import {
  ActivityEvent,
  ClassAssignment,
  DEFAULT_SETTINGS,
  emptyLetterMastery,
  emptyMathMastery,
  loadStoredAssignment,
  loadStoredEvents,
  loadStoredStudents,
  makeId,
  MAX_EVENTS,
  pickAvatarColor,
  STORAGE_KEYS,
  StudentAccount,
  StudentSettings,
  SYNC_CHANNEL_NAME,
} from './data/students';
import { AppView, Header } from './components/Header';
import { LessonWorkspace } from './components/LessonWorkspace';
import { StudentSelector } from './components/StudentSelector';
import { ParentDashboard } from './components/ParentDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { useOnlineStatus, usePWAInstall } from './hooks/usePWA';

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch {
    // хранилище недоступно (приватный режим и т.п.)
  }
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Серия дней подряд: продолжаем, если прошлое занятие было вчера. */
function nextStreak(student: StudentAccount, nowIso: string): number {
  const last = student.history[0]?.timestamp;
  if (!last) return Math.max(1, student.streakDays);
  if (dayKey(last) === dayKey(nowIso)) return Math.max(1, student.streakDays);
  const yesterday = new Date(nowIso);
  yesterday.setDate(yesterday.getDate() - 1);
  return dayKey(last) === dayKey(yesterday.toISOString()) ? student.streakDays + 1 : 1;
}

export function App() {
  const [students, setStudents] = useState<StudentAccount[]>(() => loadStoredStudents());
  const [activeStudentId, setActiveStudentId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_STUDENT) ?? '';
    } catch {
      return '';
    }
  });
  const [assignment, setAssignment] = useState<ClassAssignment>(() => loadStoredAssignment());
  const [events, setEvents] = useState<ActivityEvent[]>(() => loadStoredEvents(students));

  const [activeView, setActiveView] = useState<AppView>('lesson');
  const [selectedLetterId, setSelectedLetterId] = useState<string>(() => assignment.letterId);
  const [selectedMathRange, setSelectedMathRange] = useState<MathRangeId>(() => assignment.mathRange);
  const [liveSimEnabled, setLiveSimEnabled] = useState(false);

  const isOnline = useOnlineStatus();
  const { isInstallable, install } = usePWAInstall();
  const channelRef = useRef<BroadcastChannel | null>(null);
  /** true, когда последнее изменение сделано в этой вкладке и его надо разослать. */
  const pendingBroadcastRef = useRef(false);
  const studentsRef = useRef(students);
  studentsRef.current = students;

  const activeStudent = useMemo(
    () => students.find((s) => s.id === activeStudentId) ?? students[0],
    [students, activeStudentId]
  );

  // Если сохранённого ученика больше нет — переключаемся на первого.
  useEffect(() => {
    if (activeStudent && activeStudent.id !== activeStudentId) setActiveStudentId(activeStudent.id);
  }, [activeStudent, activeStudentId]);

  // Тёмная тема на <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', activeStudent?.settings.theme === 'dark');
  }, [activeStudent?.settings.theme]);

  // Сохранение в localStorage
  useEffect(() => saveJson(STORAGE_KEYS.STUDENTS, students), [students]);
  useEffect(() => saveJson(STORAGE_KEYS.ACTIVE_STUDENT, activeStudentId), [activeStudentId]);
  useEffect(() => saveJson(STORAGE_KEYS.EVENTS, events.slice(0, MAX_EVENTS)), [events]);
  useEffect(() => saveJson(STORAGE_KEYS.ASSIGNMENT, assignment), [assignment]);

  // Синхронизация между вкладками через BroadcastChannel
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
    channelRef.current = ch;

    ch.onmessage = (msg: MessageEvent) => {
      const payload = msg.data;
      if (!payload || typeof payload !== 'object' || payload.type !== 'SYNC_STATE') return;
      if (Array.isArray(payload.students) && payload.students.length > 0) setStudents(payload.students);
      if (Array.isArray(payload.events)) setEvents(payload.events.slice(0, MAX_EVENTS));
      const a = payload.assignment;
      if (
        a &&
        typeof a.letterId === 'string' &&
        LETTER_LESSONS.some((l) => l.id === a.letterId) &&
        isMathRangeId(a.mathRange)
      ) {
        setAssignment({ note: '', updatedAt: new Date().toISOString(), ...a });
      }
    };

    return () => {
      ch.close();
      channelRef.current = null;
    };
  }, []);

  // Рассылаем состояние после локальных изменений (не в ответ на входящие сообщения —
  // иначе вкладки будут бесконечно пересылать друг другу одно и то же).
  useEffect(() => {
    if (!pendingBroadcastRef.current) return;
    pendingBroadcastRef.current = false;
    channelRef.current?.postMessage({ type: 'SYNC_STATE', students, events, assignment });
  }, [students, events, assignment]);

  const markLocalChange = () => {
    pendingBroadcastRef.current = true;
  };

  // Демо-режим класса для панели учителя
  useEffect(() => {
    if (!liveSimEnabled) return;
    const phrases = [
      (l: string) => `Прочитал(а) слоги буквы «${l}»`,
      (l: string) => `Узнал(а) все 5 кыргызских слов на букву «${l}»`,
      () => `Решил(а) задачи по счёту на кыргызском`,
      (l: string) => `Отгадал(а) загадку «Табышмак» на букву «${l}»`,
    ];

    const id = window.setInterval(() => {
      const list = studentsRef.current;
      const target = list[Math.floor(Math.random() * list.length)];
      if (!target) return;
      const letter = LETTER_LESSONS[Math.floor(Math.random() * LETTER_LESSONS.length)].id;
      const mathR = MATH_RANGES[Math.floor(Math.random() * MATH_RANGES.length)].id;
      const delta = 1 + Math.floor(Math.random() * 2);
      const nowIso = new Date().toISOString();

      markLocalChange();
      setStudents((prev) =>
        prev.map((s) =>
          s.id !== target.id
            ? s
            : {
                ...s,
                stars: s.stars + delta,
                status: 'active',
                lastActiveAt: nowIso,
                currentActivity: `Буква «${letter}» · Счёт ${mathR}`,
                letterMastery: {
                  ...s.letterMastery,
                  [letter]: Math.min(100, (s.letterMastery[letter] ?? 50) + 5),
                },
              }
        )
      );
      setEvents((prev) =>
        [
          {
            id: makeId('ev'),
            studentId: target.id,
            studentName: target.name,
            message: phrases[Math.floor(Math.random() * phrases.length)](letter),
            starsDelta: delta,
            timestamp: nowIso,
          },
          ...prev,
        ].slice(0, MAX_EVENTS)
      );
    }, 4500);

    return () => window.clearInterval(id);
  }, [liveSimEnabled]);

  const activeId = activeStudent?.id;
  const activeName = activeStudent?.name ?? '';

  const handleEarnStars = useCallback(
    (amount: number, reason: string, letterId: string, mathRange: MathRangeId, blockIndex: number) => {
      if (!activeId) return;
      const nowIso = new Date().toISOString();
      markLocalChange();
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id !== activeId) return s;
          const letterBlock = blockIndex === 0 || blockIndex === 1 || blockIndex === 3;
          return {
            ...s,
            stars: s.stars + amount,
            status: 'active',
            lastActiveAt: nowIso,
            currentActivity: `Буква «${letterId}» · Счёт ${mathRange}`,
            letterMastery: letterBlock
              ? { ...s.letterMastery, [letterId]: Math.min(100, (s.letterMastery[letterId] ?? 0) + 8) }
              : s.letterMastery,
            mathMastery:
              blockIndex === 2
                ? { ...s.mathMastery, [mathRange]: Math.min(100, (s.mathMastery[mathRange] ?? 0) + 10) }
                : s.mathMastery,
          };
        })
      );
      setEvents((prev) =>
        [
          {
            id: makeId('ev'),
            studentId: activeId,
            studentName: activeName,
            message: reason,
            starsDelta: amount,
            timestamp: nowIso,
          },
          ...prev,
        ].slice(0, MAX_EVENTS)
      );
    },
    [activeId, activeName]
  );

  const handleFinishLesson = useCallback(
    (letterId: string, mathRange: MathRangeId, sessionStars: number) => {
      if (!activeId) return;
      const nowIso = new Date().toISOString();
      markLocalChange();
      setStudents((prev) =>
        prev.map((s) =>
          s.id !== activeId
            ? s
            : {
                ...s,
                completedLessons: s.completedLessons + 1,
                streakDays: nextStreak(s, nowIso),
                status: 'idle',
                currentActivity: `Завершил(а) занятие: буква «${letterId}»`,
                history: [
                  {
                    id: makeId('hist'),
                    timestamp: nowIso,
                    letterId,
                    mathRange,
                    starsEarned: sessionStars,
                    blocksCompleted: 4,
                  },
                  ...s.history,
                ].slice(0, 20),
              }
        )
      );
      setEvents((prev) =>
        [
          {
            id: makeId('ev'),
            studentId: activeId,
            studentName: activeName,
            message: `Завершил(а) занятие (буква «${letterId}», счёт ${mathRange})`,
            starsDelta: 0,
            timestamp: nowIso,
          },
          ...prev,
        ].slice(0, MAX_EVENTS)
      );
    },
    [activeId, activeName]
  );

  const handleUpdateStudentSettings = useCallback(
    (patch: Partial<StudentSettings>) => {
      if (!activeId) return;
      markLocalChange();
      setStudents((prev) =>
        prev.map((s) => (s.id === activeId ? { ...s, settings: { ...s.settings, ...patch } } : s))
      );
    },
    [activeId]
  );

  const handleAddStudent = useCallback((name: string, emoji: string) => {
    const id = makeId('student');
    const created: StudentAccount = {
      id,
      name,
      avatarEmoji: emoji,
      avatarColor: pickAvatarColor(studentsRef.current.length + 1),
      grade: '1-«А» класс',
      stars: 0,
      streakDays: 1,
      completedLessons: 0,
      letterMastery: emptyLetterMastery(),
      mathMastery: emptyMathMastery(),
      lastActiveAt: new Date().toISOString(),
      status: 'active',
      currentActivity: 'Новый ученик',
      settings: { ...DEFAULT_SETTINGS },
      history: [],
    };

    markLocalChange();
    setStudents((prev) => [created, ...prev]);
    setActiveStudentId(id);
    setActiveView('lesson');
  }, []);

  const handleUpdateAssignment = useCallback((next: ClassAssignment) => {
    markLocalChange();
    setAssignment(next);
    setSelectedLetterId(next.letterId);
    setSelectedMathRange(next.mathRange);
  }, []);

  if (!activeStudent) return null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Header activeView={activeView} onSelectView={setActiveView} activeStudent={activeStudent} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeView === 'lesson' && (
          <LessonWorkspace
            student={activeStudent}
            assignment={assignment}
            selectedLetterId={selectedLetterId}
            selectedMathRange={selectedMathRange}
            onSelectLetter={setSelectedLetterId}
            onSelectMathRange={setSelectedMathRange}
            onEarnStars={handleEarnStars}
            onFinishLesson={handleFinishLesson}
            onToggleTheme={() =>
              handleUpdateStudentSettings({
                theme: activeStudent.settings.theme === 'dark' ? 'light' : 'dark',
              })
            }
            onToggleSound={() =>
              handleUpdateStudentSettings({ soundEnabled: !activeStudent.settings.soundEnabled })
            }
            isOnline={isOnline}
            isInstallable={isInstallable}
            onInstallPWA={() => {
              void install();
            }}
          />
        )}

        {activeView === 'students' && (
          <StudentSelector
            students={students}
            activeStudentId={activeStudent.id}
            onSelectStudent={(id) => {
              setActiveStudentId(id);
              setActiveView('lesson');
            }}
            onAddStudent={handleAddStudent}
          />
        )}

        {activeView === 'parent' && (
          <ParentDashboard
            student={activeStudent}
            onUpdateSettings={handleUpdateStudentSettings}
            onStartLetterLesson={(letterId) => {
              setSelectedLetterId(letterId);
              setActiveView('lesson');
            }}
          />
        )}

        {activeView === 'teacher' && (
          <TeacherDashboard
            students={students}
            events={events}
            assignment={assignment}
            liveSimEnabled={liveSimEnabled}
            onToggleLiveSim={() => setLiveSimEnabled((v) => !v)}
            onUpdateAssignment={handleUpdateAssignment}
            onInspectStudent={(id) => {
              setActiveStudentId(id);
              setActiveView('parent');
            }}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span>Алиппе Жолу · Кыргызский язык и счёт для 1 класса</span>
          <span>Работает офлайн · Все данные учеников сохраняются локально</span>
        </div>
      </footer>

      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg">
          <WifiOff className="w-4 h-4" />
          <span>Офлайн-режим — все базовые упражнения доступны</span>
        </div>
      )}
    </div>
  );
}

export default App;
