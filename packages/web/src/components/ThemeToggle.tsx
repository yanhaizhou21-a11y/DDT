import React, { useEffect, useState, useRef } from 'react';
import {
  Sun,
  Moon,
  Zap,
  Leaf,
  BookOpen,
  Snowflake,
  Check,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export type ThemeMode = 'ledger' | 'sepia' | 'kinetic' | 'cyberpunk' | 'matcha' | 'nord';

export interface ThemeOption {
  id: ThemeMode;
  label: string;
  shortLabel: string;
  description: string;
  category: 'light' | 'dark';
  icon: React.ElementType;
  dotColor: string;
  isDark: boolean;
}

export const THEMES: ThemeOption[] = [
  {
    id: 'ledger',
    label: 'Field Ledger',
    shortLabel: 'Ledger',
    description: 'Warm paper & ink field notebook',
    category: 'light',
    icon: Sun,
    dotColor: '#C28B38',
    isDark: false,
  },
  {
    id: 'sepia',
    label: 'Vintage Sepia',
    shortLabel: 'Sepia',
    description: 'Antique parchment & leather binding',
    category: 'light',
    icon: BookOpen,
    dotColor: '#8C4A2F',
    isDark: false,
  },
  {
    id: 'kinetic',
    label: 'Kinetic Dark',
    shortLabel: 'Dark',
    description: 'High-contrast brutalism & acid yellow',
    category: 'dark',
    icon: Moon,
    dotColor: '#DFE104',
    isDark: true,
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk Night',
    shortLabel: 'Cyber',
    description: 'Midnight glow & neon cyan/magenta',
    category: 'dark',
    icon: Zap,
    dotColor: '#00F0FF',
    isDark: true,
  },
  {
    id: 'matcha',
    label: 'Matcha Forest',
    shortLabel: 'Matcha',
    description: 'Earthy botanical green & sage tone',
    category: 'dark',
    icon: Leaf,
    dotColor: '#4ADE80',
    isDark: true,
  },
  {
    id: 'nord',
    label: 'Nordic Frost',
    shortLabel: 'Nord',
    description: 'Arctic slate chill & polar cyan',
    category: 'dark',
    icon: Snowflake,
    dotColor: '#88C0D0',
    isDark: true,
  },
];

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
  placement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
}

export function ThemeToggle({
  className,
  compact = false,
  placement = 'bottom-end',
}: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'ledger';
    const stored = localStorage.getItem('ddt-theme') as ThemeMode;
    return stored && THEMES.some((t) => t.id === stored) ? stored : 'ledger';
  });

  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const active = THEMES.find((t) => t.id === theme);
    if (active?.isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('ddt-theme', theme);
  }, [theme]);

  // Click outside to dismiss
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Keyboard navigation inside dropdown
  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (focusedIndex + 1) % THEMES.length;
      setFocusedIndex(next);
      itemRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (focusedIndex - 1 + THEMES.length) % THEMES.length;
      setFocusedIndex(prev);
      itemRefs.current[prev]?.focus();
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const handleSelectTheme = (id: ThemeMode) => {
    setTheme(id);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const activeTheme = THEMES.find((t) => t.id === theme) || THEMES[0];
  const ActiveIcon = activeTheme.icon;

  const placementClasses = {
    'top-start': 'bottom-full left-0 mb-2 origin-bottom-left',
    'top-end': 'bottom-full right-0 mb-2 origin-bottom-right',
    'bottom-start': 'top-full left-0 mt-2 origin-top-left',
    'bottom-end': 'top-full right-0 mt-2 origin-top-right',
  }[placement];

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      {/* Dropdown Trigger Button */}
      {compact ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            setIsOpen((prev) => !prev);
            setFocusedIndex(THEMES.findIndex((t) => t.id === theme));
          }}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label={`Current theme: ${activeTheme.label}. Select visual theme.`}
          title={`Theme: ${activeTheme.label}`}
          className="relative w-9 h-9 rounded-lg border border-rule bg-card hover:bg-paper text-ink transition-all duration-150 flex items-center justify-center shadow-subtle active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ledger-blue"
        >
          <ActiveIcon className="w-4 h-4 transition-transform hover:scale-110" />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-1 ring-card"
            style={{ backgroundColor: activeTheme.dotColor }}
          />
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            setIsOpen((prev) => !prev);
            setFocusedIndex(THEMES.findIndex((t) => t.id === theme));
          }}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label={`Current theme: ${activeTheme.label}. Open theme menu.`}
          className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-rule bg-card/90 hover:bg-paper hover:border-ink-soft text-xs font-medium text-ink transition-all duration-150 shadow-subtle active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ledger-blue"
        >
          <div className="flex items-center gap-2 min-w-0">
            <ActiveIcon className="w-3.5 h-3.5 text-ledger-blue shrink-0" />
            <span className="truncate">{activeTheme.shortLabel}</span>
            <span
              className="w-2 h-2 rounded-full shrink-0 ring-1 ring-card"
              style={{ backgroundColor: activeTheme.dotColor }}
            />
          </div>
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 text-ink-soft shrink-0 transition-transform duration-200 ml-1.5',
              isOpen && 'rotate-180'
            )}
          />
        </button>
      )}

      {/* Dropdown Popover Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            aria-label="Color Theme Selection"
            onKeyDown={handleMenuKeyDown}
            initial={{
              opacity: 0,
              scale: 0.96,
              y: placement.startsWith('top') ? 6 : -6,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.98,
              y: placement.startsWith('top') ? 4 : -4,
            }}
            transition={{
              duration: 0.18,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={cn(
              'absolute z-50 w-72 p-1.5 rounded-xl bg-card border border-rule shadow-xl backdrop-blur-md text-ink overflow-hidden',
              placementClasses
            )}
          >
            {/* Menu Header */}
            <div className="px-3 py-2 border-b border-rule/70 flex items-center justify-between bg-paper/40 rounded-t-lg">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-ledger-blue" />
                <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-ink">
                  Interface Theme
                </span>
              </div>
              <span className="text-[10px] font-mono text-ink-soft">
                {THEMES.length} styles
              </span>
            </div>

            {/* Theme Options List */}
            <div className="py-1 max-h-80 overflow-y-auto space-y-0.5 no-scrollbar">
              {THEMES.map((t, idx) => {
                const Icon = t.icon;
                const isSelected = theme === t.id;

                return (
                  <button
                    key={t.id}
                    ref={(el) => (itemRefs.current[idx] = el)}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isSelected}
                    onClick={() => handleSelectTheme(t.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors group focus-visible:outline-hidden',
                      isSelected
                        ? 'bg-paper text-ink font-medium border border-rule/80 shadow-xs'
                        : 'hover:bg-paper/60 text-ink-soft hover:text-ink'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          'p-1.5 rounded-md border border-rule shrink-0 transition-colors',
                          isSelected
                            ? 'bg-card text-ledger-blue border-ledger-blue/40 shadow-xs'
                            : 'bg-paper/80 text-ink-soft group-hover:text-ink'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'truncate',
                              isSelected ? 'font-semibold text-ink' : 'text-ink'
                            )}
                          >
                            {t.label}
                          </span>
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: t.dotColor }}
                          />
                        </div>
                        <p className="text-[10px] text-ink-soft truncate font-sans">
                          {t.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 pl-2">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-ledger-blue text-paper flex items-center justify-center shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-rule group-hover:bg-ink-soft/40 transition-colors" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Menu Footer Tip */}
            <div className="px-3 py-1.5 border-t border-rule/70 bg-paper/20 rounded-b-lg">
              <p className="text-[10px] text-ink-soft font-mono truncate">
                Theme choice is automatically saved locally.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
