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
        className={`hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-40 bg-card border-r border-rule transition-all duration-200 select-none ${
          isExpanded ? 'w-56' : 'w-[72px]'
        }`}
      >
        {/* Brand / Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-rule">
          <button
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-3 text-left focus-visible:outline-none"
          >
            <div className="w-8 h-8 rounded-[4px] bg-ledger-blue text-paper flex items-center justify-center font-serif font-bold text-sm">
              D
            </div>
            {isExpanded && (
              <div className="overflow-hidden">
                <span className="font-serif font-bold text-base text-ink tracking-tight">DDT</span>
                <span className="block text-[10px] text-ink-soft tracking-wider uppercase font-mono">Ledger</span>
              </div>
            )}
          </button>
          {isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded text-ink-soft hover:text-ink hover:bg-paper"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Nav Links */}
        <nav className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[4px] text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-ledger-light text-ledger-blue font-semibold border-l-2 border-ledger-blue'
                    : 'text-ink-soft hover:text-ink hover:bg-paper'
                } ${!isExpanded ? 'justify-center px-0' : ''}`}
                title={!isExpanded ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-ledger-blue' : 'text-ink-soft'}`} />
                {isExpanded && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Expand / Collapse bottom toggle */}
        {!isExpanded && (
          <div className="p-2 border-t border-rule flex justify-center">
            <button
              onClick={() => setIsExpanded(true)}
              className="p-2 rounded text-ink-soft hover:text-ink hover:bg-paper"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-rule flex items-center justify-around py-2 px-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded text-xs transition-colors ${
                isActive ? 'text-ledger-blue font-semibold' : 'text-ink-soft'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] truncate max-w-[45px]">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
