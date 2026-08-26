import React, { useEffect, useState } from 'react';
import type { DashboardResponse, RouteTab } from '../types';
import { fetchDashboard, saveJournalEntry, addFoodEntry, addGameEntry } from '../api';
import { Header } from '../components/Header';
import { DotLedger } from '../components/DotLedger';
import {
  GitCommit,
  BookOpen,
  SquareKanban,
  Film,
  Utensils,
  Gamepad2,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: RouteTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick journal state
  const [quickJournal, setQuickJournal] = useState('');
  const [journalSaving, setJournalSaving] = useState(false);
  const [journalSavedAt, setJournalSavedAt] = useState<string | null>(null);

  // Quick food log modal/state
  const [quickFoodName, setQuickFoodName] = useState('');
  const [quickMealTag, setQuickMealTag] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [foodLogging, setFoodLogging] = useState(false);

  // Quick game log state
  const [quickGameName, setQuickGameName] = useState('');
  const [quickGameHours, setQuickGameHours] = useState('1');
  const [quickGameMinutes, setQuickGameMinutes] = useState('0');
  const [gameLogging, setGameLogging] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchDashboard();
      setData(res);
      setQuickJournal(res.journal.content || '');
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Format today's date header (e.g. "Today — Mon, Aug 24")
  const todayDate = new Date();
  const dateStrFormatted = `Today — ${todayDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })}`;

  // Debounced autosave for quick journal on home page
  useEffect(() => {
    if (!data) return;
    if (quickJournal === (data.journal.content || '')) return;

    const timer = setTimeout(async () => {
      try {
        setJournalSaving(true);
        await saveJournalEntry(data.today, quickJournal);
        setJournalSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (err) {
        console.error('Failed to autosave journal', err);
      } finally {
        setJournalSaving(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [quickJournal, data]);

  const handleQuickFoodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFoodName.trim() || !data) return;
    try {
      setFoodLogging(true);
      await addFoodEntry({
        itemName: quickFoodName.trim(),
        mealTag: quickMealTag,
        status: 'eaten',
        loggedAt: data.today,
      });
      setQuickFoodName('');
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setFoodLogging(false);
    }
  };

  const handleQuickGameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickGameName.trim() || !data) return;
    const h = Math.max(0, parseInt(quickGameHours, 10) || 0);
    const m = Math.max(0, parseInt(quickGameMinutes, 10) || 0);
    const calculated = Math.round((h + m / 60) * 100) / 100;
    const finalHours = calculated > 0 ? calculated : 0.5;

    try {
      setGameLogging(true);
      await addGameEntry({
        gameName: quickGameName.trim(),
        hours: finalHours,
        loggedAt: data.today,
      });
      setQuickGameName('');
      setQuickGameHours('1');
      setQuickGameMinutes('0');
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setGameLogging(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="py-20 text-center text-ink-soft font-mono text-xs animate-pulse">
        Reading ledger entries...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="ledger-card p-6 text-center my-8">
        <p className="text-stamp-red font-medium mb-3">{error || 'Unable to load dashboard'}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-ledger-blue text-paper text-xs font-medium rounded-[4px] hover:bg-ledger-hover active:scale-95 transition-all shadow-xs"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header title={dateStrFormatted} subtitle="Personal daily log & ledger overview">
        <span className="text-xs font-mono text-ink-soft bg-card px-2.5 py-1 border border-rule rounded-[4px] shadow-xs">
          {data.today}
        </span>
      </Header>

      {/* Grid Row 1: Dev Square + Daily Journal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GitHub / Dev Box (5 cols) */}
        <div className="lg:col-span-5 ledger-card p-5 flex flex-col justify-between hover:border-ink-soft/70 transition-all">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-rule/70 mb-4">
              <div className="flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-ledger-blue" />
                <h2 className="font-serif text-base font-semibold text-ink">Dev Activity</h2>
              </div>
              <button
                onClick={() => onNavigate('dev')}
                className="text-xs font-medium text-ledger-blue hover:underline flex items-center gap-0.5"
              >
                Tracker <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {data.github.hasToken ? (
              <div className="space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-3xl font-bold text-ink">
                    {data.github.todayCommits}
                  </span>
                  <span className="text-xs text-ink-soft font-mono">
                    {data.github.todayCommits === 1 ? 'commit today' : 'commits today'}
                  </span>
                </div>
                <div className="pt-2">
                  <div className="text-[11px] font-mono text-ink-soft uppercase tracking-wider mb-1.5">
                    30-Day Activity Heatmap
                  </div>
                  <DotLedger data={data.dotLedgers.github} unit="commits" />
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-xs text-ink-soft mb-3">No GitHub Personal Access Token configured.</p>
                <button
                  onClick={() => onNavigate('settings')}
                  className="px-3.5 py-1.5 bg-card border border-rule text-ink hover:border-ink-soft text-xs font-medium rounded-[4px] active:scale-95 transition-all shadow-xs"
                >
                  Connect GitHub
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-rule/60 flex items-center justify-between text-xs text-ink-soft font-mono">
            <span>Status: Local ledger</span>
            <span>Single user</span>
          </div>
        </div>

        {/* Journal Today (7 cols) */}
        <div className="lg:col-span-7 ledger-card p-5 flex flex-col hover:border-ink-soft/70 transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-rule/70 mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-ledger-blue" />
              <h2 className="font-serif text-base font-semibold text-ink">Today's Journal</h2>
            </div>
            <div className="flex items-center gap-3">
              {journalSaving ? (
                <span className="text-[11px] font-mono text-ink-soft">Saving...</span>
              ) : journalSavedAt ? (
                <span className="text-[11px] font-mono text-ink-soft">Saved at {journalSavedAt}</span>
              ) : null}
              <button
                onClick={() => onNavigate('journal')}
                className="text-xs font-medium text-ledger-blue hover:underline flex items-center gap-0.5"
              >
                Full Editor <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <textarea
              value={quickJournal}
              onChange={(e) => setQuickJournal(e.target.value)}
              placeholder="What happened today? Notes, logs, reflections..."
              className="w-full flex-1 min-h-[120px] p-3 text-sm bg-paper border border-rule rounded-[4px] focus:bg-card focus:outline-none resize-none font-sans text-ink leading-relaxed"
            />
            <div className="flex items-center justify-between mt-2 pt-2 text-xs font-mono text-ink-soft">
              <span>
                {quickJournal.trim() ? quickJournal.trim().split(/\s+/).length : 0} words
              </span>
              <span>Autosaves as you write</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Row 2: Next 2 Kanban Due + In Theaters This Week + Quick Log (3 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Next 2 Kanban Cards */}
        <div className="ledger-card p-5 flex flex-col justify-between hover:border-ink-soft/70 transition-all">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-rule/70 mb-3">
              <div className="flex items-center gap-2">
                <SquareKanban className="w-4 h-4 text-ledger-blue" />
                <h2 className="font-serif text-base font-semibold text-ink">Next Due</h2>
              </div>
              <button
                onClick={() => onNavigate('kanban')}
                className="text-xs font-medium text-ledger-blue hover:underline flex items-center gap-0.5"
              >
                Board <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {data.kanbanDue && data.kanbanDue.length > 0 ? (
              <div className="space-y-2.5">
                {data.kanbanDue.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => onNavigate('kanban')}
                    className="p-3 bg-paper border border-rule rounded-[4px] hover:border-ink-soft cursor-pointer transition-colors"
                  >
                    <div className="text-sm font-medium text-ink leading-snug line-clamp-2">
                      {card.title}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs font-mono">
                      <span className="text-ink-soft text-[11px]">{card.tag || 'General'}</span>
                      {card.dueDate && (
                        <span
                          className={`px-1.5 py-0.5 rounded-[3px] text-[10px] ${
                            card.isOverdue
                              ? 'bg-stamp-light text-stamp-red font-semibold'
                              : 'bg-card border border-rule text-ink-soft'
                          }`}
                        >
                          {card.isOverdue ? `Overdue: ${card.dueDate}` : card.dueDate}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-ink-soft">
                <p>No upcoming cards due.</p>
              </div>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-rule/60 text-right">
            <button
              onClick={() => onNavigate('kanban')}
              className="text-xs text-ink-soft hover:text-ink font-mono"
            >
              + Add new card
            </button>
          </div>
        </div>

        {/* Watchlist: In Theaters This Week */}
        <div className="ledger-card p-5 flex flex-col justify-between hover:border-ink-soft/70 transition-all">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-rule/70 mb-3">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-ledger-blue" />
                <h2 className="font-serif text-base font-semibold text-ink">Upcoming Watchlist</h2>
              </div>
              <button
                onClick={() => onNavigate('watchlist')}
                className="text-xs font-medium text-ledger-blue hover:underline flex items-center gap-0.5"
              >
                Watchlist <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {data.inTheaterSoon && data.inTheaterSoon.length > 0 ? (
              <div className="space-y-2.5">
                {data.inTheaterSoon.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onNavigate('watchlist')}
                    className="flex items-center gap-3 p-2 bg-paper border border-rule rounded-[4px] cursor-pointer hover:border-ink-soft transition-colors"
                  >
                    {item.posterPath ? (
                      <img
                        src={item.posterPath}
                        alt={item.title}
                        className="w-9 h-12 object-cover rounded-[3px] border border-rule flex-shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-12 bg-card border border-rule rounded-[3px] flex items-center justify-center text-[10px] text-ink-soft flex-shrink-0">
                        🎬
                      </div>
                    )}
                    <div className="overflow-hidden flex-1">
                      <div className="text-sm font-medium text-ink truncate">{item.title}</div>
                      {item.releaseDate && (
                        <span className="inline-block mt-1 text-[10px] font-mono px-1.5 py-0.5 bg-stamp-light text-stamp-red border border-stamp-red/30 rounded-[3px]">
                          In theaters {item.releaseDate}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-ink-soft">
                <p>No upcoming theatrical releases in your queue.</p>
              </div>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-rule/60 text-right">
            <button
              onClick={() => onNavigate('watchlist')}
              className="text-xs text-ink-soft hover:text-ink font-mono"
            >
              + Search titles
            </button>
          </div>
        </div>

        {/* Quick Log: Food & Game */}
        <div className="ledger-card p-5 flex flex-col justify-between hover:border-ink-soft/70 transition-all">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-rule/70 mb-3">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-ledger-blue" />
                <h2 className="font-serif text-base font-semibold text-ink">Quick Log</h2>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-ink-soft">
                <span>{data.foodToday.count} meals</span>
                <span>•</span>
                <span>{data.gameToday.hours.toFixed(2)}h played</span>
              </div>
            </div>

            {/* Quick Food input */}
            <form onSubmit={handleQuickFoodSubmit} className="mb-4">
              <label className="block text-[11px] font-mono uppercase text-ink-soft mb-1">
                Log Food / Meal
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="e.g. Sourdough sandwich"
                  value={quickFoodName}
                  onChange={(e) => setQuickFoodName(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-xs bg-paper border border-rule rounded-[4px] focus:bg-card focus:outline-none"
                />
                <select
                  value={quickMealTag}
                  onChange={(e) => setQuickMealTag(e.target.value as any)}
                  className="px-2 py-1.5 text-xs bg-paper border border-rule rounded-[4px] focus:bg-card focus:outline-none capitalize text-ink font-mono"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
                <button
                  type="submit"
                  disabled={foodLogging || !quickFoodName.trim()}
                  className="px-2.5 py-1.5 bg-ledger-blue text-paper text-xs rounded-[4px] hover:bg-ledger-hover active:scale-95 disabled:opacity-50 transition-all shadow-xs"
                  title="Add meal"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {/* Quick Game input */}
            <form onSubmit={handleQuickGameSubmit}>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-mono uppercase text-ink-soft">
                  Log Game Playtime
                </label>
                <span className="text-[10px] font-mono text-ledger-blue">
                  {Math.round(((parseInt(quickGameHours, 10) || 0) + (parseInt(quickGameMinutes, 10) || 0) / 60) * 100) / 100}h decimal
                </span>
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Game name..."
                  value={quickGameName}
                  onChange={(e) => setQuickGameName(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-xs bg-paper border border-rule rounded-[4px] focus:bg-card focus:outline-none"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Hrs"
                  value={quickGameHours}
                  onChange={(e) => setQuickGameHours(e.target.value)}
                  className="w-12 px-1.5 py-1.5 text-xs bg-paper border border-rule rounded-[4px] focus:bg-card focus:outline-none font-mono text-center"
                  title="Hours"
                />
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="Min"
                  value={quickGameMinutes}
                  onChange={(e) => setQuickGameMinutes(e.target.value)}
                  className="w-12 px-1.5 py-1.5 text-xs bg-paper border border-rule rounded-[4px] focus:bg-card focus:outline-none font-mono text-center"
                  title="Minutes"
                />
                <button
                  type="submit"
                  disabled={gameLogging || !quickGameName.trim()}
                  className="px-2.5 py-1.5 bg-ledger-blue text-paper text-xs rounded-[4px] hover:bg-ledger-hover active:scale-95 disabled:opacity-50 transition-all shadow-xs"
                  title="Log hours"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>

          <div className="pt-3 mt-3 border-t border-rule/60 flex justify-between text-xs">
            <button
              onClick={() => onNavigate('food')}
              className="text-ink-soft hover:text-ink font-mono"
            >
              Food journal →
            </button>
            <button
              onClick={() => onNavigate('games')}
              className="text-ink-soft hover:text-ink font-mono"
            >
              Game stats →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

