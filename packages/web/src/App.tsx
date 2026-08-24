import React, { useState, useEffect } from 'react';
import type { RouteTab } from './types';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { DevPage } from './pages/DevPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { KanbanPage } from './pages/KanbanPage';
import { JournalPage } from './pages/JournalPage';
import { FoodPage } from './pages/FoodPage';
import { GamesPage } from './pages/GamesPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  const [activeTab, setActiveTab] = useState<RouteTab>(() => {
    const hash = window.location.hash.replace('#', '') as RouteTab;
    const validTabs: RouteTab[] = ['home', 'dev', 'watchlist', 'kanban', 'journal', 'food', 'games', 'settings'];
    return validTabs.includes(hash) ? hash : 'home';
  });

  const handleSelectTab = (tab: RouteTab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as RouteTab;
      const validTabs: RouteTab[] = ['home', 'dev', 'watchlist', 'kanban', 'journal', 'food', 'games', 'settings'];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div className="min-h-screen bg-paper text-ink flex">
      {/* Left Rail Sidebar */}
      <Sidebar activeTab={activeTab} onSelectTab={handleSelectTab} />

      {/* Main Content Area: max-width ~1100px, centered, 24px vertical rhythm */}
      <main className="flex-1 md:pl-20 px-4 sm:px-8 py-8 max-w-[1180px] mx-auto w-full pb-24 md:pb-12">
        {activeTab === 'home' && <DashboardPage onNavigate={handleSelectTab} />}
        {activeTab === 'dev' && <DevPage onNavigate={handleSelectTab} />}
        {activeTab === 'watchlist' && <WatchlistPage onNavigate={handleSelectTab} />}
        {activeTab === 'kanban' && <KanbanPage onNavigate={handleSelectTab} />}
        {activeTab === 'journal' && <JournalPage onNavigate={handleSelectTab} />}
        {activeTab === 'food' && <FoodPage onNavigate={handleSelectTab} />}
        {activeTab === 'games' && <GamesPage onNavigate={handleSelectTab} />}
        {activeTab === 'settings' && <SettingsPage onNavigate={handleSelectTab} />}
      </main>
    </div>
  );
}

export default App;
