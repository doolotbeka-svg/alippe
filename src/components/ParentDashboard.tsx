import { BookOpen, Flame, Play, Star, Trophy } from 'lucide-react';
import { LETTER_LESSONS, MATH_RANGES } from '../data/curriculum';
import type { StudentAccount, StudentSettings } from '../data/students';

interface ParentDashboardProps {
  student: StudentAccount;
  onUpdateSettings: (patch: Partial<StudentSettings>) => void;
  onStartLetterLesson: (letterId: string) => void;
}

function Bar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const color = v >= 80 ? 'bg-emerald-500' : v >= 40 ? 'bg-sky-500' : 'bg-amber-500';
  return (
    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${v}%` }} />
    </div>
  );
}

const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function ParentDashboard({ student, onUpdateSettings, onStartLetterLesson }: ParentDashboardProps) {
  const weakest = [...LETTER_LESSONS].sort(
    (a, b) => (student.letterMastery[a.id] ?? 0) - (student.letterMastery[b.id] ?? 0)
  )[0];

  const stats = [
    { label: 'Звёзды', value: student.stars, icon: Star, tone: 'text-amber-500' },
    { label: 'Дней подряд', value: student.streakDays, icon: Flame, tone: 'text-rose-500' },
    { label: 'Занятий', value: student.completedLessons, icon: BookOpen, tone: 'text-sky-500' },
    {
      label: 'Букв освоено',
      value: LETTER_LESSONS.filter((l) => (student.letterMastery[l.id] ?? 0) >= 80).length,
      icon: Trophy,
      tone: 'text-emerald-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <span className={`grid place-items-center w-16 h-16 rounded-2xl text-4xl ${student.avatarColor}`}>
          {student.avatarEmoji}
        </span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{student.name}</h1>
          <p className="text-slate-500 dark:text-slate-400">{student.grade} · кабинет родителя</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="card">
            <Icon className={`w-5 h-5 ${tone}`} />
            <div className="mt-2 text-3xl font-bold font-mono-num">{value}</div>
            <div className="text-sm text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-lg">Буквы</h2>
            {weakest && (
              <button type="button" className="primary-btn text-sm" onClick={() => onStartLetterLesson(weakest.id)}>
                <Play className="w-4 h-4" /> Повторить «{weakest.id}»
              </button>
            )}
          </div>
          <ul className="mt-4 space-y-3">
            {LETTER_LESSONS.map((l) => (
              <li key={l.id} className="grid grid-cols-[2rem_1fr_3rem] items-center gap-3">
                <button
                  type="button"
                  onClick={() => onStartLetterLesson(l.id)}
                  className="font-display font-bold text-lg hover:text-sky-600"
                >
                  {l.id}
                </button>
                <Bar value={student.letterMastery[l.id] ?? 0} />
                <span className="text-right text-sm font-mono-num">{student.letterMastery[l.id] ?? 0}%</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="font-semibold text-lg">Счёт</h2>
            <ul className="mt-4 space-y-3">
              {MATH_RANGES.map((r) => (
                <li key={r.id} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3">
                  <span className="text-sm">{r.label}</span>
                  <Bar value={student.mathMastery[r.id] ?? 0} />
                  <span className="text-right text-sm font-mono-num">{student.mathMastery[r.id] ?? 0}%</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card space-y-4">
            <h2 className="font-semibold text-lg">Настройки</h2>
            <label className="flex items-center justify-between gap-4">
              <span>Озвучка</span>
              <input
                type="checkbox"
                checked={student.settings.soundEnabled}
                onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                className="w-5 h-5 accent-sky-600"
              />
            </label>
            <label className="flex items-center justify-between gap-4">
              <span>Тёмная тема</span>
              <input
                type="checkbox"
                checked={student.settings.theme === 'dark'}
                onChange={(e) => onUpdateSettings({ theme: e.target.checked ? 'dark' : 'light' })}
                className="w-5 h-5 accent-sky-600"
              />
            </label>
            <label className="block">
              <span className="flex justify-between">
                <span>Скорость речи</span>
                <span className="font-mono-num text-sm">{student.settings.speechRate.toFixed(2)}×</span>
              </span>
              <input
                type="range"
                min={0.5}
                max={1.3}
                step={0.05}
                value={student.settings.speechRate}
                onChange={(e) => onUpdateSettings({ speechRate: Number(e.target.value) })}
                className="mt-2 w-full accent-sky-600"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-lg">История занятий</h2>
        {student.history.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Пока нет завершённых занятий.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {student.history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  Буква «{h.letterId}» · Счёт {h.mathRange}
                </span>
                <span className="text-slate-500">{dateFmt.format(new Date(h.timestamp))}</span>
                <span className="flex items-center gap-1 font-bold text-amber-600 font-mono-num">
                  <Star className="w-4 h-4 fill-current" /> +{h.starsEarned}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
