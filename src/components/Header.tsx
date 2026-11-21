import { BookOpen, GraduationCap, Star, Users, UserRound } from 'lucide-react';
import type { StudentAccount } from '../data/students';

export type AppView = 'lesson' | 'students' | 'parent' | 'teacher';

const NAV: { id: AppView; label: string; icon: typeof BookOpen }[] = [
  { id: 'lesson', label: 'Занятие', icon: BookOpen },
  { id: 'students', label: 'Ученики', icon: Users },
  { id: 'parent', label: 'Родителям', icon: UserRound },
  { id: 'teacher', label: 'Учителю', icon: GraduationCap },
];

interface HeaderProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  activeStudent: StudentAccount;
}

export function Header({ activeView, onSelectView, activeStudent }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        <button
          type="button"
          onClick={() => onSelectView('lesson')}
          className="flex items-center gap-2 shrink-0"
        >
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-sky-600 text-white font-display font-bold text-lg">
            А
          </span>
          <span className="hidden sm:block font-display font-bold text-lg">Алиппе Жолу</span>
        </button>

        <nav className="flex-1 flex items-center gap-1 overflow-x-auto" aria-label="Разделы">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = id === activeView;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectView(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{label}</span>
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => onSelectView('students')}
          className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 pl-1 pr-3 py-1 shrink-0"
          title="Сменить ученика"
        >
          <span className={`grid place-items-center w-8 h-8 rounded-full text-lg ${activeStudent.avatarColor}`}>
            {activeStudent.avatarEmoji}
          </span>
          <span className="hidden sm:inline text-sm font-semibold">{activeStudent.name}</span>
          <span className="flex items-center gap-0.5 text-sm font-bold text-amber-600 dark:text-amber-400 font-mono-num">
            <Star className="w-4 h-4 fill-current" />
            {activeStudent.stars}
          </span>
        </button>
      </div>
    </header>
  );
}
