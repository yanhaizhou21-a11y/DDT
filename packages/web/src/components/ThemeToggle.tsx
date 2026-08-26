import React, { useEffect, useState } from 'react';
import { Sun, Moon, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

export type ThemeMode = 'ledger' | 'kinetic' | 'cyberpunk';

const THEMES: { id: ThemeMode; label: string; icon: typeof Sun; dotColor: string }[] = [
  { id: 'ledger', label: 'Ledger', icon: Sun, dotColor: '#C28B38' },
  { id: 'kinetic', label: 'Dark', icon: Moon, dotColor: '#DFE104' },
  { id: 'cyberpunk', label: 'Cyber', icon: Zap, dotColor: '#00F0FF' },
];

export function ThemeToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'ledger';
    const stored = localStorage.getItem('ddt-theme') as ThemeMode;
    return stored && ['ledger', 'kinetic', 'cyberpunk'].includes(stored) ? stored : 'ledger';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'kinetic' || theme === 'cyberpunk') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('ddt-theme', theme);
  }, [theme]);

  const cycleTheme = () => {
    const nextIndex = (THEMES.findIndex((t) => t.id === theme) + 1) % THEMES.length;
    setTheme(THEMES[nextIndex].id);
  };

  if (compact) {
    const current = THEMES.find((t) => t.id === theme) || THEMES[0];
    const Icon = current.icon;
    return (
      <button
        onClick={cycleTheme}
        title={`Current theme: ${current.label}. Click to switch theme.`}
        className={cn(
          'relative p-2 rounded-lg border border-rule bg-card hover:bg-paper-tint text-ink transition-all duration-200 focus:outline-hidden',
          className
        )}
      >
        <Icon className="w-4 h-4 transition-transform hover:rotate-12" />
        <span
          className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: current.dotColor }}
        />
      </button>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 p-1 rounded-lg bg-card/80 border border-rule shadow-subtle backdrop-blur-xs',
        className
      )}
    >
      {THEMES.map((t) => {
        const Icon = t.icon;
        const isActive = theme === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150',
              isActive
                ? 'bg-paper text-ink font-semibold shadow-xs border border-rule/70'
                : 'text-ink-soft hover:text-ink hover:bg-paper/50'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{t.label}</span>
            <span
              className="w-1.5 h-1.5 rounded-full ml-0.5"
              style={{ backgroundColor: t.dotColor, opacity: isActive ? 1 : 0.4 }}
            />
          </button>
        );
      })}
    </div>
  );
}
