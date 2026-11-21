import { useEffect, useState } from 'react';
import { Activity, Radio, Save, Star } from 'lucide-react';
import { isMathRangeId, LETTER_LESSONS, MATH_RANGES, MathRangeId } from '../data/curriculum';
import type { ActivityEvent, ClassAssignment, StudentAccount } from '../data/students';

interface TeacherDashboardProps {
  students: StudentAccount[];
  events: ActivityEvent[];
  assignment: ClassAssignment;
  liveSimEnabled: boolean;
  onToggleLiveSim: () => void;
  onUpdateAssignment: (next: ClassAssignment) => void;
  onInspectStudent: (id: string) => void;
}

const timeFmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });

function statusOf(s: StudentAccount, now: number): { label: string; cls: string } {
  const minutes = (now - new Date(s.lastActiveAt).getTime()) / 60_000;
  if (s.status === 'active' && minutes < 5) return { label: 'Занимается', cls: 'bg-emerald-500' };
  if (minutes < 60) return { label: 'Недавно', cls: 'bg-amber-400' };
  return { label: 'Не в сети', cls: 'bg-slate-300 dark:bg-slate-600' };
}

function avg(values: number[]): number {
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
}

export function TeacherDashboard({
  students,
  events,
  assignment,
  liveSimEnabled,
  onToggleLiveSim,
  onUpdateAssignment,
  onInspectStudent,
}: TeacherDashboardProps) {
  const [letterId, setLetterId] = useState(assignment.letterId);
  const [mathRange, setMathRange] = useState<MathRangeId>(assignment.mathRange);
  const [note, setNote] = useState(assignment.note);
  const [now, setNow] = useState(() => Date.now());

  // Подтягиваем изменения задания из другой вкладки.
  useEffect(() => {
    setLetterId(assignment.letterId);
    setMathRange(assignment.mathRange);
    setNote(assignment.note);
  }, [assignment]);

  // Обновляем статусы «онлайн» раз в 30 секунд.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const dirty =
    letterId !== assignment.letterId || mathRange !== assignment.mathRange || note !== assignment.note;

  const sorted = [...students].sort((a, b) => b.stars - a.stars);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Панель учителя</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {students.length} учеников · общий счёт{' '}
            <b className="font-mono-num">{students.reduce((a, s) => a + s.stars, 0)}</b> ⭐
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleLiveSim}
          aria-pressed={liveSimEnabled}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border-2 ${
            liveSimEnabled
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-slate-200 dark:border-slate-700'
          }`}
        >
          <Radio className="w-4 h-4" />
          Демо-режим класса {liveSimEnabled ? 'вкл.' : 'выкл.'}
        </button>
      </div>

      <form
        className="card grid gap-4 sm:grid-cols-[1fr_1fr_2fr_auto] items-end"
        onSubmit={(e) => {
          e.preventDefault();
          onUpdateAssignment({ letterId, mathRange, note: note.trim(), updatedAt: new Date().toISOString() });
        }}
      >
        <label className="block text-sm">
          <span className="font-semibold">Буква дня</span>
          <select value={letterId} onChange={(e) => setLetterId(e.target.value)} className="field mt-1">
            {LETTER_LESSONS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Счёт</span>
          <select
            value={mathRange}
            onChange={(e) => {
              if (isMathRangeId(e.target.value)) setMathRange(e.target.value);
            }}
            className="field mt-1"
          >
            {MATH_RANGES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Комментарий для учеников</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={140}
            placeholder="Например: повторите слоги дома"
            className="field mt-1"
          />
        </label>
        <button type="submit" disabled={!dirty} className="primary-btn disabled:opacity-40">
          <Save className="w-4 h-4" /> Выдать
        </button>
      </form>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-3 font-semibold">Ученик</th>
                <th className="py-2 pr-3 font-semibold">Статус</th>
                <th className="py-2 pr-3 font-semibold">Буквы</th>
                <th className="py-2 pr-3 font-semibold">Счёт</th>
                <th className="py-2 text-right font-semibold">⭐</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sorted.map((s) => {
                const st = statusOf(s, now);
                return (
                  <tr
                    key={s.id}
                    onClick={() => onInspectStudent(s.id)}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2">
                        <span className={`grid place-items-center w-8 h-8 rounded-full ${s.avatarColor}`}>
                          {s.avatarEmoji}
                        </span>
                        <span>
                          <span className="font-semibold">{s.name}</span>
                          <span className="block text-xs text-slate-500 truncate max-w-48">{s.currentActivity}</span>
                        </span>
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        <span className={`w-2 h-2 rounded-full ${st.cls}`} /> {st.label}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-mono-num">{avg(Object.values(s.letterMastery))}%</td>
                    <td className="py-2 pr-3 font-mono-num">{avg(Object.values(s.mathMastery))}%</td>
                    <td className="py-2 text-right font-bold font-mono-num">{s.stars}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="flex items-center gap-2 font-semibold text-lg">
            <Activity className="w-5 h-5 text-sky-500" /> Лента класса
          </h2>
          {events.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Пока нет активности.</p>
          ) : (
            <ul className="mt-3 space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {events.map((ev) => (
                <li key={ev.id} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{ev.studentName}</span>
                    <span className="text-xs text-slate-500">{timeFmt.format(new Date(ev.timestamp))}</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">{ev.message}</div>
                  {ev.starsDelta > 0 && (
                    <div className="flex items-center gap-0.5 text-xs font-bold text-amber-600">
                      <Star className="w-3 h-3 fill-current" /> +{ev.starsDelta}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
