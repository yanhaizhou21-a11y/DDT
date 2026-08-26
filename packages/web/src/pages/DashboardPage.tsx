import React, { useEffect, useState } from 'react';
import type { DashboardResponse, RouteTab } from '../types';
import { fetchDashboard, saveJournalEntry, addFoodEntry, addGameEntry } from '../api';
import { Header } from '../components/Header';
import { DotLedger } from '../components/DotLedger';
import { GithubGraph } from '../components/GithubGraph';
import { TextEffect } from '../components/TextEffect';
import { Magnetic } from '../components/Magnetic';
import { ThemeToggle } from '../components/ThemeToggle';
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
  Flame,
  AlertTriangle,
  Send,
  Zap,
  Save,
} from 'lucide-react';


interface DashboardPageProps {
  onNavigate: (tab: RouteTab) => void;
}

function formatHoursHuman(decimalHours: number): string {
  if (!decimalHours || decimalHours <= 0) return '0m';
  const hrs = Math.floor(decimalHours);
  const mins = Math.round((decimalHours - hrs) * 60);
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick journal state
  const [quickJournal, setQuickJournal] = useState('');
  const [journalSaving, setJournalSaving] = useState(false);
  const [journalSavedAt, setJournalSavedAt] = useState<string | null>(null);

  // Quick food log state
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

  const todayDate = new Date();
  const dateFormatted = todayDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Debounced autosave for quick journal on dashboard
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
    }, 1200);

    return () => clearTimeout(timer);
  }, [quickJournal, data]);

  const handleManualSaveJournal = async () => {
    if (!data) return;
    try {
      setJournalSaving(true);
      await saveJournalEntry(data.today, quickJournal);
      setJournalSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setData((prev) => (prev ? { ...prev, journal: { ...prev.journal, content: quickJournal, hasWritten: quickJournal.trim().length > 0 } } : prev));
    } catch (err) {
      console.error('Failed to manually save journal', err);
    } finally {
      setJournalSaving(false);
    }
  };

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
      <div className="py-24 text-center text-ink-soft font-mono text-xs animate-pulse">
        <Sparkles className="w-6 h-6 mx-auto mb-3 opacity-40 animate-spin" />
        Reading personal ledger entries...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="ledger-card p-8 text-center my-8 max-w-md mx-auto">
        <AlertTriangle className="w-8 h-8 text-stamp-red mx-auto mb-3" />
        <p className="text-stamp-red font-semibold mb-2">{error || 'Unable to load dashboard'}</p>
        <p className="text-xs text-ink-soft font-mono mb-4">Check server connection and try again.</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-ledger-blue text-paper text-xs font-semibold rounded-lg hover:bg-ledger-hover transition-all shadow-subtle"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Ledger Header with Live Text Animation & Theme Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-rule/70">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-wider text-ink-soft">
              Daily Ledger Overview
            </span>
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-ink">
            <TextEffect preset="fade-in-blur" speedReveal={1.2}>
              {dateFormatted}
            </TextEffect>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span className="text-xs font-mono text-ink-soft bg-card/80 px-3 py-1.5 border border-rule rounded-lg shadow-subtle">
            {data.today}
          </span>
        </div>
      </div>

      {/* GAPLESS BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        {/* BENTO CARD 1: DEV & GITHUB ACTIVITY (6 cols) */}
        <div className="lg:col-span-6 ledger-card p-5 flex flex-col justify-between group hover:shadow-card transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-rule/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-paper flex items-center justify-center text-ledger-blue border border-rule/60">
                  <GitCommit className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-serif text-base font-bold text-ink">Dev & GitHub Activity</h2>
                  <p className="text-[11px] text-ink-soft font-mono">
                    {data.github.username ? `@${data.github.username}` : 'Local Contribution Matrix'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('dev')}
                className="text-xs font-semibold text-ledger-blue hover:underline flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
              >
                Tracker <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-paper/60 border border-rule/60">
                <span className="text-[11px] font-mono text-ink-soft uppercase tracking-wider">
                  Today's Commits
                </span>
                <div className="font-mono text-2xl font-bold text-ink mt-0.5">
                  {data.github.todayCommits}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-paper/60 border border-rule/60">
                <span className="text-[11px] font-mono text-ink-soft uppercase tracking-wider">
                  12-Month Total
                </span>
                <div className="font-mono text-2xl font-bold text-ink mt-0.5">
                  {data.github.totalYearCommits || '—'}
                </div>
              </div>
            </div>

            {/* Interactive GitHub Graph */}
            <div className="pt-1">
              <div className="text-[11px] font-mono text-ink-soft uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Contribution Wave Matrix</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Live</span>
              </div>
              <GithubGraph
                account={data.github.username}
                months={5}
                cellSize={11}
                cellGap={3}
                animation="wave"
                variant="github"
                showAccount={false}
              />
            </div>
          </div>

          <div className="pt-3 mt-4 border-t border-rule/60 flex items-center justify-between text-xs text-ink-soft font-mono">
            <span>Local ledger sync: Active</span>
            <button
              onClick={() => onNavigate('settings')}
              className="text-ledger-blue hover:underline text-[11px]"
            >
              Config Token →
            </button>
          </div>
        </div>

        {/* BENTO CARD 2: DAILY JOURNAL QUICK-ENTRY (6 cols) */}
        <div className="lg:col-span-6 ledger-card p-5 flex flex-col justify-between group hover:shadow-card transition-all h-full">
          <div className="flex items-center justify-between pb-3 border-b border-rule/70 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-paper flex items-center justify-center text-ledger-blue border border-rule/60">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-serif text-base font-bold text-ink">Daily Journal</h2>
                <p className="text-[11px] text-ink-soft font-mono">Today's Reflection</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {journalSaving ? (
                <span className="text-xs font-mono text-gold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold animate-ping" />
                  Saving...
                </span>
              ) : journalSavedAt ? (
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved
                </span>
              ) : null}

              <button
                type="button"
                onClick={handleManualSaveJournal}
                disabled={journalSaving}
                className="flex items-center gap-1 px-2.5 py-1 bg-ledger-blue text-paper text-xs font-semibold rounded-md hover:bg-ledger-hover active:scale-95 disabled:opacity-50 transition-all shadow-xs"
              >
                <Save className="w-3 h-3" />
                <span>Save</span>
              </button>

              <button
                onClick={() => onNavigate('journal')}
                className="text-xs font-semibold text-ledger-blue hover:underline flex items-center gap-1 group-hover:translate-x-0.5 transition-transform ml-1"
              >
                Full Editor <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Journal Write Box - Stretches to fill empty card space */}
          <div className="flex-1 flex flex-col my-3 min-h-[190px]">
            <textarea
              value={quickJournal}
              onChange={(e) => setQuickJournal(e.target.value)}
              placeholder="What happened today? Write thoughts, achievements, or notes..."
              className="w-full flex-1 min-h-[190px] p-3.5 text-sm bg-paper/70 border border-rule rounded-lg focus:bg-card focus:outline-hidden resize-none font-sans text-ink leading-relaxed placeholder:text-ink-soft/40 shadow-xs transition-colors"
            />
          </div>

          <div className="pt-3 border-t border-rule/60 flex items-center justify-between text-xs text-ink-soft font-mono shrink-0">
            <span>
              <strong className="text-ink font-semibold">
                {quickJournal.trim() ? quickJournal.trim().split(/\s+/).length : 0}
              </strong>{' '}
              words written today
            </span>
            <span>Markdown enabled</span>
          </div>
        </div>


        {/* BENTO CARD 3: GAME PLAYTIME & QUICK LOG (4 cols) */}
        <div className="lg:col-span-4 ledger-card p-5 flex flex-col justify-between hover:shadow-card transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-rule/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-paper flex items-center justify-center text-ledger-blue border border-rule/60">
                  <Gamepad2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-serif text-base font-bold text-ink">Games Logged</h2>
                  <p className="text-[11px] text-ink-soft font-mono">
                    {data.gameToday.hours.toFixed(2)} hrs today ({formatHoursHuman(data.gameToday.hours)})
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('games')}
                className="text-xs font-semibold text-ledger-blue hover:underline flex items-center gap-1"
              >
                Library <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Today's Game Items */}
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {data.gameToday.items.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between p-2 rounded-md bg-paper/60 border border-rule/60 text-xs font-mono"
                >
                  <span className="font-serif font-semibold text-ink truncate pr-2">
                    {g.gameName}
                  </span>
                  <span className="text-ledger-blue font-bold shrink-0">
                    {g.hours.toFixed(2)}h
                  </span>
                </div>
              ))}
              {data.gameToday.items.length === 0 && (
                <p className="text-xs font-mono text-ink-soft/60 italic py-2 text-center">
                  No gameplay logged yet today.
                </p>
              )}
            </div>

            {/* Quick Game Log Form */}
            <form onSubmit={handleQuickGameSubmit} className="pt-2 space-y-2 border-t border-rule/60">
              <input
                type="text"
                value={quickGameName}
                onChange={(e) => setQuickGameName(e.target.value)}
                placeholder="Game title (e.g. Wuthering Waves)..."
                className="w-full px-3 py-1.5 bg-paper border border-rule rounded-md text-xs text-ink focus:outline-hidden"
              />
              <div className="flex gap-2">
                <div className="flex-1 flex gap-1 items-center">
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    value={quickGameHours}
                    onChange={(e) => setQuickGameHours(e.target.value)}
                    className="w-16 px-2 py-1 bg-paper border border-rule rounded-md text-xs font-mono text-ink focus:outline-hidden text-center"
                    placeholder="h"
                  />
                  <span className="text-xs font-mono text-ink-soft">h</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={quickGameMinutes}
                    onChange={(e) => setQuickGameMinutes(e.target.value)}
                    className="w-12 px-2 py-1 bg-paper border border-rule rounded-md text-xs font-mono text-ink focus:outline-hidden text-center"
                    placeholder="m"
                  />
                  <span className="text-xs font-mono text-ink-soft">m</span>
                </div>
                <button
                  type="submit"
                  disabled={gameLogging || !quickGameName.trim()}
                  className="px-3 py-1 bg-ledger-blue text-paper text-xs font-semibold rounded-md hover:bg-ledger-hover disabled:opacity-40 transition-colors shrink-0"
                >
                  + Add
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* BENTO CARD 4: NEXT DUE KANBAN TASKS (4 cols) */}
        <div className="lg:col-span-4 ledger-card p-5 flex flex-col justify-between hover:shadow-card transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-rule/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-paper flex items-center justify-center text-ledger-blue border border-rule/60">
                  <SquareKanban className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-serif text-base font-bold text-ink">Upcoming Tasks</h2>
                  <p className="text-[11px] text-ink-soft font-mono">Kanban Deadlines</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('kanban')}
                className="text-xs font-semibold text-ledger-blue hover:underline flex items-center gap-1"
              >
                Board <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Task List */}
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {data.kanbanDue.map((card) => (
                <div
                  key={card.id}
                  className="p-3 rounded-lg bg-paper/60 border border-rule/60 hover:border-ink-soft/60 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-serif font-semibold text-xs text-ink line-clamp-1">
                      {card.title}
                    </span>
                    {card.tag && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-card text-ink-soft border border-rule shrink-0">
                        {card.tag}
                      </span>
                    )}
                  </div>
                  {card.dueDate && (
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono">
                      <Clock className="w-3 h-3 text-ink-soft" />
                      <span
                        className={
                          card.isOverdue ? 'text-stamp-red font-semibold' : 'text-ink-soft'
                        }
                      >
                        {card.isOverdue ? `Overdue: ${card.dueDate}` : `Due: ${card.dueDate}`}
                      </span>
                    </div>
                  )}
                </div>
              ))}

              {data.kanbanDue.length === 0 && (
                <p className="text-xs font-mono text-ink-soft/60 italic py-6 text-center">
                  No upcoming deadlines on the board.
                </p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-rule/60 flex items-center justify-between text-xs text-ink-soft font-mono">
            <span>{data.kanbanDue.length} tasks scheduled</span>
            <button
              onClick={() => onNavigate('kanban')}
              className="text-ledger-blue hover:underline text-[11px]"
            >
              Manage Board →
            </button>
          </div>
        </div>

        {/* BENTO CARD 5: WATCHLIST & UPCOMING CINEMA (4 cols) */}
        <div className="lg:col-span-4 ledger-card p-5 flex flex-col justify-between hover:shadow-card transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-rule/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-paper flex items-center justify-center text-stamp-red border border-rule/60">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-serif text-base font-bold text-ink">Upcoming Releases</h2>
                  <p className="text-[11px] text-ink-soft font-mono">In Theaters Soon</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('watchlist')}
                className="text-xs font-semibold text-ledger-blue hover:underline flex items-center gap-1"
              >
                Watchlist <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Releases List */}
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {data.inTheaterSoon.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-paper/60 border border-rule/60"
                >
                  {w.posterPath ? (
                    <img
                      src={w.posterPath}
                      alt={w.title}
                      className="w-8 h-11 object-cover rounded shrink-0 border border-rule"
                    />
                  ) : (
                    <div className="w-8 h-11 bg-card border border-rule rounded flex items-center justify-center shrink-0">
                      <Film className="w-4 h-4 text-ink-soft/40" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-serif font-bold text-xs text-ink truncate">{w.title}</div>
                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-stamp-light text-stamp-red">
                      {w.releaseDate ? `Theaters: ${w.releaseDate}` : 'Upcoming'}
                    </span>
                  </div>
                </div>
              ))}

              {data.inTheaterSoon.length === 0 && (
                <p className="text-xs font-mono text-ink-soft/60 italic py-6 text-center">
                  No upcoming theatrical releases tagged.
                </p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-rule/60 flex items-center justify-between text-xs text-ink-soft font-mono">
            <span>Cinema Radar</span>
            <button
              onClick={() => onNavigate('watchlist')}
              className="text-ledger-blue hover:underline text-[11px]"
            >
              + Add Movie →
            </button>
          </div>
        </div>

        {/* BENTO CARD 6: FOOD & DAILY NUTRITION LOG (12 cols) */}
        <div className="col-span-12 ledger-card p-5 hover:shadow-card transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-rule/70 mb-4 gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-paper flex items-center justify-center text-ledger-blue border border-rule/60">
                <Utensils className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-serif text-base font-bold text-ink">Food & Meals Today</h2>
                <p className="text-[11px] text-ink-soft font-mono">
                  {data.foodToday.count} meals recorded today
                </p>
              </div>
            </div>

            {/* Quick Food Add Form */}
            <form onSubmit={handleQuickFoodSubmit} className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={quickFoodName}
                onChange={(e) => setQuickFoodName(e.target.value)}
                placeholder="Log meal (e.g. Oatmeal & Banana)..."
                className="px-3 py-1.5 bg-paper border border-rule rounded-md text-xs text-ink focus:outline-hidden min-w-[200px]"
              />
              <select
                value={quickMealTag}
                onChange={(e) => setQuickMealTag(e.target.value as any)}
                className="px-2.5 py-1.5 bg-paper border border-rule rounded-md text-xs font-mono text-ink focus:outline-hidden"
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
              <button
                type="submit"
                disabled={foodLogging || !quickFoodName.trim()}
                className="px-3 py-1.5 bg-ledger-blue text-paper text-xs font-semibold rounded-md hover:bg-ledger-hover disabled:opacity-40 transition-colors"
              >
                + Log Food
              </button>
            </form>
          </div>

          {/* Food items pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            {data.foodToday.items.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-paper/70 border border-rule text-xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="font-medium text-ink">{f.itemName}</span>
                <span className="text-[10px] font-mono uppercase text-ink-soft opacity-75">
                  ({f.mealTag})
                </span>
              </div>
            ))}

            {data.foodToday.items.length === 0 && (
              <p className="text-xs font-mono text-ink-soft/60 italic py-1">
                No food logged yet for today. Use the input above or jump to the Food log.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
