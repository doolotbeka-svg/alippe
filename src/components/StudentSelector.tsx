import { useState } from 'react';
import { Check, Plus, Star } from 'lucide-react';
import type { StudentAccount } from '../data/students';

const EMOJIS = ['🦅', '🌸', '🐎', '🦋', '🦁', '🐱', '🐻', '🦊', '🐼', '🌟'];

interface StudentSelectorProps {
  students: StudentAccount[];
  activeStudentId: string;
  onSelectStudent: (id: string) => void;
  onAddStudent: (name: string, emoji: string) => void;
}

export function StudentSelector({
  students,
  activeStudentId,
  onSelectStudent,
  onAddStudent,
}: StudentSelectorProps) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const trimmed = name.trim();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Кто сегодня занимается?</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Выбери себя, чтобы продолжить занятие.</p>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {students.map((s) => {
          const active = s.id === activeStudentId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectStudent(s.id)}
              className={`relative rounded-2xl border-2 p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md bg-white dark:bg-slate-900 ${
                active ? 'border-sky-500' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {active && (
                <span className="absolute top-3 right-3 grid place-items-center w-6 h-6 rounded-full bg-sky-500 text-white">
                  <Check className="w-4 h-4" />
                </span>
              )}
              <span className={`grid place-items-center w-14 h-14 rounded-2xl text-3xl ${s.avatarColor}`}>
                {s.avatarEmoji}
              </span>
              <div className="mt-3 font-display font-semibold text-lg">{s.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{s.grade}</div>
              <div className="mt-2 flex items-center gap-1 text-sm font-bold text-amber-600 dark:text-amber-400 font-mono-num">
                <Star className="w-4 h-4 fill-current" /> {s.stars}
              </div>
            </button>
          );
        })}
      </div>

      <form
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 max-w-xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (!trimmed) return;
          onAddStudent(trimmed.slice(0, 30), emoji);
          setName('');
        }}
      >
        <h2 className="font-semibold text-lg">Добавить ученика</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          placeholder="Имя ученика"
          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 outline-none focus:border-sky-500"
        />
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Аватар">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={e === emoji}
              onClick={() => setEmoji(e)}
              className={`w-10 h-10 rounded-xl text-xl border-2 ${
                e === emoji ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/50' : 'border-transparent bg-slate-100 dark:bg-slate-800'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={!trimmed}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white disabled:opacity-40"
        >
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </form>
    </div>
  );
}
