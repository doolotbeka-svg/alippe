import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { LETTER_LESSONS, MATH_RANGES, MathRangeId } from './data/curriculum';
import {
  ActivityEvent,
  ClassAssignment,
  loadStoredAssignment,
  loadStoredEvents,
  loadStoredStudents,
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

export function App() {
  const [students, setStudents] = useState<StudentAccount[]>(() => loadStoredStudents());
  const [activeStudentId, setActiveStudentId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_STUDENT);
      if (saved) return saved;
    } catch {
      // ignore
    }
    return 'student-1';
  });
  const [assignment, setAssignment] = useState<ClassAssignment>(() => loadStoredAssignment());
  const [events, setEvents] = useState<ActivityEvent[]>(() => loadStoredEvents(loadStoredStudents()));

  const [activeView, setActiveView] = useState<AppView>('lesson');
  const [selectedLetterId, setSelectedLetterId] = useState<string>(() => loadStoredAssignment().letterId);
  const [selectedMathRange, setSelectedMathRange] = useState<MathRangeId>(
    () => loadStoredAssignment().mathRange
  );
  const [liveSimEnabled, setLiveSimEnabled] = useState(false);

  const isOnline = useOnlineStatus();
  const { isInstallable, install } = usePWAInstall();
  const channelRef = useRef<BroadcastChannel | null>(null);

  const activeStudent = useMemo(
    () => students.find((s) => s.id === activeStudentId) || students[0],
    [students, activeStudentId]
  );

  // Sync dark mode class on <html>
  useEffect(() => {
    const isDark = activeStudent?.settings.theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
  }, [activeStudent?.settings.theme]);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    } catch {
      // ignore
    }
  }, [students]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_STUDENT, activeStudentId);
    } catch {
      // ignore
    }
  }, [activeStudentId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events.slice(0, 40)));
    } catch {
      // ignore
    }
  }, [events]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ASSIGNMENT, JSON.stringify(assignment));
    } catch {
      // ignore
    }
  }, [assignment]);

  // Real-time cross-tab BroadcastChannel sync
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
    channelRef.current = ch;

    ch.onmessage = (msg) => {
      const payload = msg.data;
      if (!payload || typeof payload !== 'object') return;
      if (payload.type === 'SYNC_STATE') {
        if (Array.isArray(payload.students)) setStudents(payload.students);
        if (Array.isArray(payload.events)) setEvents(payload.events);
        if (payload.assignment) setAssignment(payload.assignment);
      }
    };

    return () => {
      ch.close();
      channelRef.current = null;
    };
  }, []);

  const broadcastState = useCallback(
    (nextStudents: StudentAccount[], nextEvents: ActivityEvent[], nextAssignment: ClassAssignment) => {
      channelRef.current?.postMessage({
        type: 'SYNC_STATE',
        students: nextStudents,
        events: nextEvents,
        assignment: nextAssignment,
      });
    },
    []
  );

  // Optional Real-time Classroom Simulation for Teacher Dashboard
  useEffect(() => {
    if (!liveSimEnabled) return;
    const phrases = [
      (l: string) => `Прочитал(а) слоги буквы «${l}» на горной реке`,
      (l: string) => `Узнал(а) все 5 кыргызских слов на букву «${l}»`,
      () => `Решил(а) задачи по счету на кыргызском`,
      (l: string) => `Отгадал(а) загадку «Табышмак» на букву «${l}»`,
    ];

    const id = window.setInterval(() => {
      setStudents((prev) => {
        const idx = Math.floor(Math.random() * prev.length);
        const target = prev[idx];
        if (!target) return prev;
        const letter = LETTER_LESSONS[Math.floor(Math.random() * LETTER_LESSONS.length)].id;
        const mathR = MATH_RANGES[Math.floor(Math.random() * MATH_RANGES.length)].id;
        const delta = 1 + Math.floor(Math.random() * 2);
        const msg = phrases[Math.floor(Math.random() * phrases.length)](letter);

        const updatedStudent: StudentAccount = {
          ...target,
          stars: target.stars + delta,
          status: 'active',
          lastActiveAt: new Date().toISOString(),
          currentActivity: `Буква «${letter}» · Счет ${mathR}`,
          letterMastery: {
            ...target.letterMastery,
            [letter]: Math.min(100, (target.letterMastery[letter] ?? 50) + 5),
          },
        };

        const nextStudents = prev.map((s, i) => (i === idx ? updatedStudent : s));
        const newEvent: ActivityEvent = {
          id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          studentId: target.id,
          studentName: target.name,
          message: msg,
          starsDelta: delta,
          timestamp: new Date().toISOString(),
        };

        setEvents((prevEv) => [newEvent, ...prevEv].slice(0, 40));
        return nextStudents;
      });
    }, 4500);

    return () => window.clearInterval(id);
  }, [liveSimEnabled]);

  const handleEarnStars = useCallback(
    (
      amount: number,
      reason: string,
      letterId: string,
      mathRange: MathRangeId,
      blockIndex: number
    ) => {
      const nowIso = new Date().toISOString();
      setStudents((prev) => {
        const nextStudents = prev.map((s) => {
          if (s.id !== activeStudent.id) return s;
          const nextLetterVal =
            blockIndex === 0 || blockIndex === 1 || blockIndex === 3
              ? Math.min(100, (s.letterMastery[letterId] ?? 0) + 8)
              : s.letterMastery[letterId] ?? 0;
          const nextMathVal =
            blockIndex === 2
              ? Math.min(100, (s.mathMastery[mathRange] ?? 0) + 10)
              : s.mathMastery[mathRange] ?? 0;

          return {
            ...s,
            stars: s.stars + amount,
            status: 'active' as const,
            lastActiveAt: nowIso,
            currentActivity: `Буква «${letterId}» · Счет ${mathRange}`,
            letterMastery: { ...s.letterMastery, [letterId]: nextLetterVal },
            mathMastery: { ...s.mathMastery, [mathRange]: nextMathVal },
          };
        });

        const newEv: ActivityEvent = {
          id: `ev-${Date.now()}`,
          studentId: activeStudent.id,
          studentName: activeStudent.name,
          message: reason,
          starsDelta: amount,
          timestamp: nowIso,
        };

        setEvents((prevEv) => {
          const nextEv = [newEv, ...prevEv].slice(0, 40);
          broadcastState(nextStudents, nextEv, assignment);
          return nextEv;
        });

        return nextStudents;
      });
    },
    [activeStudent, assignment, broadcastState]
  );

  const handleFinishLesson = useCallback(
    (letterId: string, mathRange: MathRangeId, sessionStars: number) => {
      const nowIso = new Date().toISOString();
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id !== activeStudent.id) return s;
          return {
            ...s,
            completedLessons: s.completedLessons + 1,
            history: [
              {
                id: `hist-${Date.now()}`,
                timestamp: nowIso,
                letterId,
                mathRange,
                starsEarned: sessionStars,
                blocksCompleted: 4,
              },
              ...s.history,
            ].slice(0, 20),
          };
        })
      );
    },
    [activeStudent]
  );

  const handleUpdateStudentSettings = useCallback(
    (patch: Partial<StudentSettings>) => {
      setStudents((prev) =>
        prev.map((s) =>
          s.id === activeStudent.id
            ? { ...s, settings: { ...s.settings, ...patch } }
            : s
        )
      );
    },
    [activeStudent]
  );

  const handleAddStudent = useCallback((name: string, emoji: string) => {
    const id = `student-${Date.now()}`;
    const letterMastery: Record<string, number> = {};
    LETTER_LESSONS.forEach((l) => {
      letterMastery[l.id] = 0;
    });

    const created: StudentAccount = {
      id,
      name,
      avatarEmoji: emoji,
      avatarColor: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
      grade: '1-«А» класс',
      stars: 0,
      streakDays: 1,
      completedLessons: 0,
      letterMastery,
      mathMastery: { '1-10': 0, '11-20': 0, 'tens-10-100': 0, '1-100': 0 },
      lastActiveAt: new Date().toISOString(),
      status: 'active',
      currentActivity: 'Новый ученик',
      settings: { theme: 'light', speechRate: 0.88, soundEnabled: true },
      history: [],
    };

    setStudents((prev) => [created, ...prev]);
    setActiveStudentId(id);
    setActiveView('lesson');
  }, []);

  const handleUpdateAssignment = useCallback(
    (next: ClassAssignment) => {
      setAssignment(next);
      setSelectedLetterId(next.letterId);
      setSelectedMathRange(next.mathRange);
      broadcastState(students, events, next);
    },
    [students, events, broadcastState]
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Header
        activeView={activeView}
        onSelectView={setActiveView}
        activeStudent={activeStudent}
      />

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
              handleUpdateStudentSettings({
                soundEnabled: !activeStudent.settings.soundEnabled,
              })
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
          <span>Алиппе Жолу · Кыргызский язык и счет для 1 класса</span>
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
