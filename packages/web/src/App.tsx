import React, { useState, useEffect } from 'react';
import type { RouteTab } from './types';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { DevPage } from './pages/DevPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { KanbanPage } from './pages/KanbanPage';
import { JournalPage } from './pages/JournalPage';
import { FoodPage } from './pages/FoodPage';
import { GamesPage } from './pages/GamesPage';
import { LogsChangesPage } from './pages/LogsChangesPage';
import { SettingsPage } from './pages/SettingsPage';

import { applyTheme, getActiveTheme } from './theme';
import { cn } from './lib/utils';

export function App() {
  const [activeTab, setActiveTab] = useState<RouteTab>(() => {
    const hash = window.location.hash.replace('#', '') as RouteTab;
    const validTabs: RouteTab[] = ['home', 'dev', 'projects', 'watchlist', 'kanban', 'journal', 'food', 'games', 'changes', 'settings'];
    return validTabs.includes(hash) ? hash : 'home';
  });

  useEffect(() => {
    applyTheme(getActiveTheme().id);
  }, []);

  const handleSelectTab = (tab: RouteTab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as RouteTab;
      const validTabs: RouteTab[] = ['home', 'dev', 'projects', 'watchlist', 'kanban', 'journal', 'food', 'games', 'changes', 'settings'];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [desktopNavMode, setDesktopNavMode] = useState<'sidebar' | 'dock'>(() => {
    if (typeof window !== 'undefined') {
      return (window.localStorage.getItem('ddt_desktop_nav_mode') as 'sidebar' | 'dock') || 'sidebar';
    }
    return 'sidebar';
  });

  useEffect(() => {
    const handleNavModeEvent = () => {
      const mode = (window.localStorage.getItem('ddt_desktop_nav_mode') as 'sidebar' | 'dock') || 'sidebar';
      setDesktopNavMode(mode);
    };
    window.addEventListener('ddt_nav_mode_changed', handleNavModeEvent);
    return () => window.removeEventListener('ddt_nav_mode_changed', handleNavModeEvent);
  }, []);

  return (
    <div className="min-h-screen bg-paper text-ink flex">
      {/* Left Rail Sidebar or Desktop Floating Dock */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        desktopNavMode={desktopNavMode}
        onToggleDesktopNavMode={setDesktopNavMode}
      />

      {/* Main Content Area: max-width ~1240px, centered, responsive margins */}
      <main
        className={cn(
          'flex-1 px-3.5 sm:px-8 py-6 sm:py-8 max-w-[1240px] mx-auto w-full min-h-[100dvh]',
          desktopNavMode === 'dock' ? 'pb-28' : 'md:pl-20 pb-24 md:pb-12'
        )}
      >
        <div key={activeTab} className="t-page-enter">
          {activeTab === 'home' && <DashboardPage onNavigate={handleSelectTab} />}
          {activeTab === 'dev' && <DevPage onNavigate={handleSelectTab} />}
          {activeTab === 'projects' && <ProjectsPage onNavigate={handleSelectTab} />}
          {activeTab === 'watchlist' && <WatchlistPage onNavigate={handleSelectTab} />}
          {activeTab === 'kanban' && <KanbanPage onNavigate={handleSelectTab} />}
          {activeTab === 'journal' && <JournalPage onNavigate={handleSelectTab} />}
          {activeTab === 'food' && <FoodPage onNavigate={handleSelectTab} />}
          {activeTab === 'games' && <GamesPage onNavigate={handleSelectTab} />}
          {activeTab === 'changes' && <LogsChangesPage onNavigate={handleSelectTab} />}
          {activeTab === 'settings' && <SettingsPage onNavigate={handleSelectTab} />}
        </div>
      </main>
    </div>
  );
}

export default App;
