import React, { useState } from 'react';
import type { RouteTab } from '../types';
import {
  LayoutDashboard,
  GitPullRequest,
  Film,
  SquareKanban,
  BookOpen,
  Utensils,
  Gamepad2,
  Settings,
  ChevronLeft,
  ChevronRight,
  BookMarked,
} from 'lucide-react';

interface SidebarProps {
  activeTab: RouteTab;
  onSelectTab: (tab: RouteTab) => void;
}

interface NavItem {
  id: RouteTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'dev', label: 'Dev Tracker', icon: GitPullRequest },
  { id: 'watchlist', label: 'Watchlist', icon: Film },
  { id: 'kanban', label: 'Kanban', icon: SquareKanban },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'food', label: 'Food Log', icon: Utensils },
  { id: 'games', label: 'Game Log', icon: Gamepad2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Desktop Left Rail Navigation */}
      <aside
        className={`hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-40 bg-card border-r border-rule/80 transition-all duration-200 select-none ${
          isExpanded ? 'w-56' : 'w-[74px]'
        }`}
      >
        {/* Brand / Logo with double-bezel */}
        <div className="h-16 flex items-center justify-between px-3.5 border-b border-rule/70 bg-paper/30">
          <button
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-3 text-left focus-visible:outline-none group"
          >
            <div className="bezel-shell p-0.5 rounded-[7px]">
              <div className="w-8 h-8 rounded-[5px] bg-ledger-blue text-paper flex items-center justify-center font-serif font-bold text-sm tracking-tighter shadow-sm group-hover:bg-ledger-hover transition-colors">
                D
              </div>
            </div>
            {isExpanded && (
              <div className="overflow-hidden">
                <span className="font-serif font-bold text-base text-ink tracking-tight">DDT</span>
                <span className="block text-[10px] text-ink-soft tracking-wider uppercase font-mono">Personal Ledger</span>
              </div>
            )}
          </button>
          {isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded-[4px] text-ink-soft hover:text-ink hover:bg-paper/80 active:scale-95 transition-all"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Nav Links */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[5px] text-xs font-medium transition-all duration-150 relative ${
                  isActive
                    ? 'bg-ledger-light/90 text-ledger-blue font-semibold shadow-xs'
                    : 'text-ink-soft hover:text-ink hover:bg-paper/70'
                } ${!isExpanded ? 'justify-center px-0' : ''}`}
                title={!isExpanded ? item.label : undefined}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-ledger-blue rounded-r" />
                )}
                <Icon className={`w-4 h-4 flex-shrink-0 transition-transform ${isActive ? 'text-ledger-blue scale-105' : 'text-ink-soft'}`} />
                {isExpanded && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Expand / Collapse bottom toggle */}
        {!isExpanded && (
          <div className="p-2 border-t border-rule/70 flex justify-center bg-paper/20">
            <button
              onClick={() => setIsExpanded(true)}
              className="p-1.5 rounded-[4px] text-ink-soft hover:text-ink hover:bg-paper/80 active:scale-95 transition-all"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-rule/80 flex items-center justify-around py-1.5 px-1 shadow-lg">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-[4px] text-xs transition-all relative ${
                isActive ? 'text-ledger-blue font-semibold scale-105' : 'text-ink-soft hover:text-ink'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[9px] font-mono tracking-tight truncate max-w-[42px]">{item.label}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-ledger-blue absolute -bottom-0.5" />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};
