import * as React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { RouteTab } from '../types';
import {
  LayoutDashboard,
  GitPullRequest,
  FolderKanban,
  Film,
  SquareKanban,
  BookOpen,
  Utensils,
  Gamepad2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { DiscordRecapModal, DiscordIcon } from './DiscordRecapModal';
import { cn } from '../lib/utils';

// ─── Types & Nav Structure ──────────────────────────────────────────────────

interface NavItemConfig {
  id: RouteTab;
  label: string;
  category: 'core' | 'tracking' | 'leisure' | 'system';
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'home', label: 'Dashboard', category: 'core', icon: LayoutDashboard },
  { id: 'dev', label: 'Dev Tracker', category: 'core', icon: GitPullRequest, badge: 'Live' },
  { id: 'projects', label: 'Projects', category: 'core', icon: FolderKanban },
  { id: 'kanban', label: 'Kanban Board', category: 'core', icon: SquareKanban },
  { id: 'journal', label: 'Daily Journal', category: 'tracking', icon: BookOpen },
  { id: 'food', label: 'Food Ledger', category: 'tracking', icon: Utensils },
  { id: 'games', label: 'Game Log', category: 'leisure', icon: Gamepad2 },
  { id: 'watchlist', label: 'Watchlist', category: 'leisure', icon: Film },
  { id: 'settings', label: 'Settings', category: 'system', icon: Settings },
];

// ─── Hover Context & Gliding Highlight ──────────────────────────────────────

interface HoverRect {
  top: number;
  height: number;
  left: number;
  width: number;
}

interface HoverContextValue {
  hovered: string | null;
  hoverRect: HoverRect | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  setHovered: (id: string | null, rect?: HoverRect | null) => void;
}

const HoverContext = createContext<HoverContextValue>({
  hovered: null,
  hoverRect: null,
  containerRef: { current: null },
  setHovered: () => {},
});

function HoverHighlight() {
  const { hoverRect, hovered } = useContext(HoverContext);

  return (
    <AnimatePresence>
      {hovered && hoverRect && (
        <motion.div
          key="sidebar-gliding-hover"
          className="pointer-events-none absolute z-0 rounded-lg bg-paper border border-rule/60 shadow-xs"
          initial={false}
          animate={{
            top: hoverRect.top,
            height: hoverRect.height,
            left: hoverRect.left,
            width: hoverRect.width,
            opacity: 1,
          }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
        />
      )}
    </AnimatePresence>
  );
}

// ─── Sidebar Item Component ──────────────────────────────────────────────────

interface SidebarItemProps {
  item: NavItemConfig;
  isActive: boolean;
  isExpanded: boolean;
  onClick: () => void;
}

const SidebarItem = React.memo(function SidebarItem({
  item,
  isActive,
  isExpanded,
  onClick,
}: SidebarItemProps) {
  const { hovered, setHovered, containerRef } = useContext(HoverContext);
  const itemRef = useRef<HTMLButtonElement>(null);
  const isHovered = hovered === item.id;
  const Icon = item.icon;

  const opacity = isActive ? 1 : hovered !== null ? (isHovered ? 1 : 0.45) : 0.7;
  const x = isExpanded ? (isActive ? 4 : isHovered ? 2 : 0) : 0;

  const handleMouseEnter = () => {
    const el = itemRef.current;
    const container = containerRef.current;
    if (el && container) {
      const elRect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setHovered(item.id, {
        top: elRect.top - containerRect.top,
        height: elRect.height,
        left: elRect.left - containerRect.left,
        width: elRect.width,
      });
    } else {
      setHovered(item.id);
    }
  };

  const handleMouseLeave = () => {
    setHovered(null);
  };

  return (
    <div className="relative group/item my-0.5">
      {/* Active spring bar indicator on the left */}
      {isActive && (
        <motion.span
          layoutId="sidebar-active-indicator"
          className="pointer-events-none absolute z-20 left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-ledger-blue shadow-[0_0_8px_rgba(42,75,124,0.4)]"
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}

      {/* Subtle tick line */}
      {isExpanded && (
        <motion.span
          className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-px bg-rule"
          animate={{ width: isActive ? 0 : isHovered ? 12 : 6, opacity: isHovered ? 0.8 : 0.3 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}

      <motion.button
        ref={itemRef}
        type="button"
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        animate={{ opacity, x }}
        transition={{ type: 'spring', stiffness: 600, damping: 32 }}
        className={cn(
          'relative z-10 w-full flex items-center gap-3 py-2 text-xs select-none rounded-lg transition-colors duration-150',
          isExpanded ? 'px-3' : 'justify-center px-0'
        )}
        title={!isExpanded ? item.label : undefined}
      >
        <div
          className={cn(
            'w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200 shrink-0',
            isActive
              ? 'bg-ledger-light text-ledger-blue shadow-xs font-semibold'
              : 'text-ink-soft group-hover/item:text-ink'
          )}
        >
          <Icon className={cn('w-4 h-4 transition-transform duration-200', isActive && 'scale-110')} />
        </div>

        {isExpanded && (
          <div className="flex items-center justify-between flex-1 min-w-0 pr-1">
            <span
              className={cn(
                'truncate font-sans text-xs tracking-tight',
                isActive ? 'font-bold text-ink' : 'font-medium text-ink-soft group-hover/item:text-ink'
              )}
            >
              {item.label}
            </span>
            {item.badge && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-ledger-light text-ledger-blue border border-ledger-blue/20 shrink-0">
                {item.badge}
              </span>
            )}
          </div>
        )}
      </motion.button>
    </div>
  );
});

// ─── Main Sidebar Component ──────────────────────────────────────────────────

interface SidebarProps {
  activeTab: RouteTab;
  onSelectTab: (tab: RouteTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isDiscordModalOpen, setIsDiscordModalOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHoveredId] = useState<string | null>(null);
  const [hoverRect, setHoverRect] = useState<HoverRect | null>(null);

  const setHovered = useCallback((id: string | null, rect?: HoverRect | null) => {
    setHoveredId(id);
    setHoverRect(rect ?? null);
  }, []);

  const hoverContextValue = useMemo(
    () => ({ hovered, hoverRect, containerRef, setHovered }),
    [hovered, hoverRect, setHovered]
  );

  return (
    <>
      {/* Desktop Animated Rail Navigation */}
      <aside
        className={cn(
          'hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-40 bg-card border-r border-rule/80 transition-all duration-300 ease-out select-none shadow-subtle',
          isExpanded ? 'w-56' : 'w-[74px]'
        )}
      >
        {/* Brand / Logo Header */}
        <div className="h-16 flex items-center justify-between px-3.5 border-b border-rule/70 bg-paper/40">
          <button
            onClick={() => onSelectTab('home')}
            aria-label="Daily Dashboard Tracker Home"
            className="flex items-center gap-3 text-left focus-visible:outline-hidden group"
          >
            <div className="bezel-shell p-0.5 rounded-[9px] group-hover:scale-105 transition-transform">
              <img
                src="/logo.png"
                alt="DDT Logo"
                className="w-8 h-8 rounded-[7px] object-cover shadow-sm border border-rule/60"
              />
            </div>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <span className="font-serif font-bold text-base text-ink tracking-tight">DDT</span>
                <span className="block text-[10px] text-ink-soft tracking-wider uppercase font-mono">
                  Personal Ledger
                </span>
              </motion.div>
            )}
          </button>

          {isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 rounded-md text-ink-soft hover:text-ink hover:bg-paper/80 active:scale-95 transition-all"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Items with Gliding Hover Spring */}
        <HoverContext.Provider value={hoverContextValue}>
          <div className="flex-1 py-3 px-2 overflow-y-auto no-scrollbar" data-scroll-viewport>
            <div ref={containerRef} className="relative space-y-0.5">
              <HoverHighlight />
              {NAV_ITEMS.map((item) => (
                <SidebarItem
                  key={item.id}
                  item={item}
                  isActive={activeTab === item.id}
                  isExpanded={isExpanded}
                  onClick={() => onSelectTab(item.id)}
                />
              ))}
            </div>
          </div>
        </HoverContext.Provider>

        {/* Footer: Theme Toggle & Expand Button */}
        <div className="p-2.5 border-t border-rule/70 flex flex-col items-center gap-2 bg-paper/30">
          <ThemeToggle
            compact={!isExpanded}
            placement="top-start"
            className={isExpanded ? 'w-full' : ''}
          />

          {!isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="p-1.5 rounded-md text-ink-soft hover:text-ink hover:bg-paper active:scale-95 transition-all"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Animated Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-rule/80 py-1.5 px-2 shadow-lg overflow-x-auto no-scrollbar"
      >
        <div className="flex items-center justify-between min-w-full gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-lg min-h-[44px] min-w-[40px] text-xs transition-all relative shrink-0 active:scale-95',
                  isActive
                    ? 'text-ledger-blue font-bold bg-ledger-light/50'
                    : 'text-ink-soft hover:text-ink hover:bg-paper/60'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[9px] font-mono tracking-tight">{item.label}</span>
                {isActive && (
                  <motion.span
                    layoutId="mobile-nav-dot"
                    className="w-1.5 h-1.5 rounded-full bg-ledger-blue absolute bottom-0.5"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
