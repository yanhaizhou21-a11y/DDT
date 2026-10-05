import React, { useEffect, useState } from 'react';
import type { DashboardResponse, RouteTab } from '../types';
import { fetchDashboard, saveJournalEntry, addFoodEntry, addGameEntry } from '../api';
import { Header } from '../components/Header';
import { DotLedger } from '../components/DotLedger';
import { GithubGraph } from '../components/GithubGraph';
import { TextEffect } from '../components/TextEffect';
import { Magnetic } from '../components/Magnetic';
import { ThemeToggle } from '../components/ThemeToggle';
import { RichTextEditor } from '../components/RichTextEditor';
import { DiscordRecapModal, DiscordIcon } from '../components/DiscordRecapModal';
import { DashboardKpiCard } from '../components/charts/DashboardKpiCard';
import {
  DashboardActivityAreaChart,
  type DailyActivityPoint,
} from '../components/charts/DashboardActivityAreaChart';
import {
  DashboardCategoryDonutChart,
  type CategorySegment,
} from '../components/charts/DashboardCategoryDonutChart';
import {
  DashboardVelocityBarChart,
  type DailyVelocityData,
} from '../components/charts/DashboardVelocityBarChart';
import { DashboardGithubBranchWidget } from '../components/DashboardGithubBranchWidget';
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
  Activity,
  Layers,
  BarChart3,
  TrendingUp,
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
  const [isDiscordModalOpen, setIsDiscordModalOpen] = useState(false);

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

  // Chart and Stream calculations for Dashboard Overview
  const activityStreamPoints: DailyActivityPoint[] = React.useMemo(() => {
    if (!data?.dotLedgers) return [];
    const days = data.dotLedgers.days || [];
    const githubMap = Object.fromEntries((data.dotLedgers.github || []).map((d) => [d.date, d.value]));
    const gameMap = Object.fromEntries((data.dotLedgers.game || []).map((d) => [d.date, d.value]));
    const foodMap = Object.fromEntries((data.dotLedgers.food || []).map((d) => [d.date, d.value]));
    const journalMap = Object.fromEntries((data.dotLedgers.journal || []).map((d) => [d.date, d.value]));

    return days.map((dateStr) => {
      const d = new Date(dateStr + 'T00:00:00');
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        date: dateStr,
        label,
        commits: githubMap[dateStr] || 0,
        gameHours: Math.round((gameMap[dateStr] || 0) * 10) / 10,
        foodCount: foodMap[dateStr] || 0,
        journalWritten: journalMap[dateStr] || 0,
      };
    });
  }, [data]);

  const categorySegments: CategorySegment[] = React.useMemo(() => {
    if (!data?.dotLedgers) return [];
    const totalCommits = (data.dotLedgers.github || []).reduce((sum, d) => sum + d.value, 0) || data.github.todayCommits;
    const totalGameHours = Math.round((data.dotLedgers.game || []).reduce((sum, d) => sum + d.value, 0) * 10) / 10 || data.gameToday.hours;
    const totalFood = (data.dotLedgers.food || []).reduce((sum, d) => sum + d.value, 0) || data.foodToday.count;
    const totalJournal = (data.dotLedgers.journal || []).reduce((sum, d) => sum + d.value, 0) || (data.journal.hasWritten ? 1 : 0);

    return [
      {
        key: 'commits',
        label: 'Development',
        value: totalCommits,
        unit: 'commits',
        color: 'var(--ledger-blue)',
        icon: GitCommit,
      },
      {
        key: 'game',
        label: 'Gaming',
        value: totalGameHours,
        unit: 'hrs',
        color: 'var(--gold)',
        icon: Gamepad2,
      },
      {
        key: 'food',
        label: 'Nutrition',
        value: totalFood,
        unit: 'meals',
        color: '#10B981',
        icon: Utensils,
      },
      {
        key: 'journal',
        label: 'Reflection',
        value: totalJournal,
        unit: 'logs',
        color: 'var(--stamp-red)',
        icon: BookOpen,
      },
    ];
  }, [data]);

  const weeklyVelocityData: DailyVelocityData[] = React.useMemo(() => {
    if (!data?.dotLedgers) return [];
    const days = (data.dotLedgers.days || []).slice(-7);
    const githubMap = Object.fromEntries((data.dotLedgers.github || []).map((d) => [d.date, d.value]));
    const gameMap = Object.fromEntries((data.dotLedgers.game || []).map((d) => [d.date, d.value]));
    const foodMap = Object.fromEntries((data.dotLedgers.food || []).map((d) => [d.date, d.value]));

    return days.map((dateStr) => {
      const d = new Date(dateStr + 'T00:00:00');
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      return {
        dayName,
        date: dateStr,
        commits: githubMap[dateStr] || 0,
        gameHours: Math.round((gameMap[dateStr] || 0) * 10) / 10,
        foodCount: foodMap[dateStr] || 0,
      };
    });
  }, [data]);

  // Sparkline arrays for KPI cards
  const commitsSparkline = React.useMemo(() => {
    return (data?.dotLedgers.github || []).slice(-10).map((d) => d.value);
  }, [data]);

  const gamesSparkline = React.useMemo(() => {
    return (data?.dotLedgers.game || []).slice(-10).map((d) => d.value);
  }, [data]);

  const foodSparkline = React.useMemo(() => {
    return (data?.dotLedgers.food || []).slice(-10).map((d) => d.value);
  }, [data]);

  const journalSparkline = React.useMemo(() => {
    return (data?.dotLedgers.journal || []).slice(-10).map((d) => d.value);
  }, [data]);

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
            <TextEffect as="span" preset="fade-in-blur" speedReveal={1.2}>
              {dateFormatted}
            </TextEffect>
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsDiscordModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border border-[#5865F2]/30 text-[#5865F2] rounded-lg text-xs font-mono font-semibold transition-all shadow-xs group active:scale-95"
            title="Dispatch Discord Daily Activity Recap"
            aria-label="Dispatch Discord Daily Activity Recap"
          >
            <DiscordIcon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Discord Recap</span>
          </button>
          <ThemeToggle placement="bottom-end" />
          <span className="text-xs font-mono text-ink-soft bg-card/80 px-3 py-1.5 border border-rule rounded-lg shadow-subtle">
            {data.today}
          </span>
        </div>
      </div>

      {/* SECTION 1: SHADCN KPI METRICS ROW */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold tracking-widest text-ledger-blue uppercase">
            01. Daily Metric KPIs
          </span>
          <div className="h-px bg-rule/70 flex-1" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardKpiCard
            title="Today's Commits"
            value={data.github.todayCommits}
            unit="commits"
            icon={GitCommit}
            sparkline={commitsSparkline}
            sparklineColor="var(--ledger-blue)"
            changeLabel="10-day velocity"
            accentColor="var(--ledger-blue)"
            onClick={() => onNavigate('dev')}
          />
          <DashboardKpiCard
            title="Gaming Logged"
            value={data.gameToday.hours.toFixed(1)}
            unit="hrs"
            icon={Gamepad2}
            sparkline={gamesSparkline}
            sparklineColor="var(--gold)"
            changeLabel="Daily session"
            accentColor="var(--gold)"
            onClick={() => onNavigate('games')}
          />
          <DashboardKpiCard
            title="Meals & Fuel"
            value={data.foodToday.count}
            unit="entries"
            icon={Utensils}
            sparkline={foodSparkline}
            sparklineColor="#10B981"
            changeLabel="Nutrition intake"
            accentColor="#10B981"
            onClick={() => onNavigate('food')}
          />
          <DashboardKpiCard
            title="Daily Reflection"
            value={data.journal.hasWritten ? 'Recorded' : 'Pending'}
            unit={data.kanbanDue.length > 0 ? `${data.kanbanDue.length} due` : undefined}
            icon={BookOpen}
            sparkline={journalSparkline}
            sparklineColor="var(--stamp-red)"
            changeLabel={data.journal.hasWritten ? 'Saved today' : 'Awaiting entry'}
            accentColor="var(--stamp-red)"
            onClick={() => onNavigate('journal')}
          />
        </div>
      </div>

      {/* SECTION 2: MULTI-STREAM ACTIVITY & CATEGORY BREAKDOWN */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold tracking-widest text-ledger-blue uppercase">
            02. Output Streams & Effort Allocation
          </span>
          <div className="h-px bg-rule/70 flex-1" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8">
            <DashboardActivityAreaChart
              data={activityStreamPoints}
              title="Activity Velocity Streams"
              description="Multi-stream ledger activity distribution across time"
            />
          </div>
          <div className="lg:col-span-4">
            <DashboardCategoryDonutChart
              segments={categorySegments}
              title="Effort Allocation"
              description="Proportional breakdown across ledger domains"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: VELOCITY CADENCE & ACTIVE BRANCH CONTRIBUTION */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold tracking-widest text-ledger-blue uppercase">
            03. Cadence & Branch Contribution
          </span>
          <div className="h-px bg-rule/70 flex-1" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5">
            <DashboardVelocityBarChart
              data={weeklyVelocityData}
              title="7-Day Velocity Cadence"
              description="Comparative daily throughput across streams"
            />
          </div>

          {/* ACTIVE BRANCH CONTRIBUTION WIDGET (PUBLIC & PRIVATE REPOS) */}
          <div className="lg:col-span-7">
            <DashboardGithubBranchWidget
              onNavigateDev={() => onNavigate('dev')}
              onNavigateProjects={() => onNavigate('projects')}
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: DEV & GITHUB CONTRIBUTION MATRIX */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold tracking-widest text-ledger-blue uppercase">
            04. Local & Remote Commit Matrix
          </span>
          <div className="h-px bg-rule/70 flex-1" />
        </div>
        <div className="ledger-card p-5 flex flex-col justify-between group hover:shadow-card transition-all">
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
      </div>

      {/* SECTION 5: DAILY LEDGER ACTIONS & QUICK LOGS */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold tracking-widest text-ledger-blue uppercase">
            05. Daily Ledger Actions & Logs
          </span>
          <div className="h-px bg-rule/70 flex-1" />
        </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        {/* BENTO CARD: DAILY JOURNAL QUICK-ENTRY (7 cols) */}
        <div className="lg:col-span-7 ledger-card p-5 flex flex-col justify-between group hover:shadow-card transition-all h-full">
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
                onClick={() => onNavigate('journal')}
                className="text-xs font-semibold text-ledger-blue hover:underline flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
              >
                Full Page <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Compact Rich Text Editor with rendered markdown preview & formatting toolbar */}
          <div className="flex-1 flex flex-col pt-3 min-h-[220px]">
            <RichTextEditor
              value={quickJournal}
              onChange={setQuickJournal}
              onSave={handleManualSaveJournal}
              saveStatus={journalSaving ? 'saving' : journalSavedAt ? 'saved' : 'unsaved'}
              lastSavedAt={journalSavedAt}
              compact={true}
              minHeight="min-h-[165px]"
              className="flex-1 h-full shadow-none border-rule/70"
              placeholder="What happened today? Write thoughts, achievements, or notes..."
            />
          </div>
        </div>

        {/* BENTO CARD: NEXT DUE KANBAN TASKS (5 cols) */}
        <div className="lg:col-span-5 ledger-card p-5 flex flex-col justify-between hover:shadow-card transition-all">
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

        {/* BENTO CARD: GAME PLAYTIME & QUICK LOG (6 cols) */}
        <div className="lg:col-span-6 ledger-card p-5 flex flex-col justify-between hover:shadow-card transition-all">
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
                className="w-full px-3 py-1.5 bg-paper border border-rule rounded-md text-xs text-ink focus:outline-none focus:ring-2 focus:ring-ledger-blue focus:ring-offset-1"
              />
              <div className="flex gap-2">
                <div className="flex-1 flex gap-1 items-center">
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    value={quickGameHours}
                    onChange={(e) => setQuickGameHours(e.target.value)}
                    className="w-16 px-2 py-1 bg-paper border border-rule rounded-md text-xs font-mono text-ink focus:outline-none focus:ring-2 focus:ring-ledger-blue focus:ring-offset-1 text-center"
                    placeholder="h"
                  />
                  <span className="text-xs font-mono text-ink-soft">h</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={quickGameMinutes}
                    onChange={(e) => setQuickGameMinutes(e.target.value)}
                    className="w-12 px-2 py-1 bg-paper border border-rule rounded-md text-xs font-mono text-ink focus:outline-none focus:ring-2 focus:ring-ledger-blue focus:ring-offset-1 text-center"
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

        {/* BENTO CARD: WATCHLIST & UPCOMING CINEMA (6 cols) */}
        <div className="lg:col-span-6 ledger-card p-5 flex flex-col justify-between hover:shadow-card transition-all">
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
                className="px-3 py-1.5 bg-paper border border-rule rounded-md text-xs text-ink focus:outline-none focus:ring-2 focus:ring-ledger-blue focus:ring-offset-1 min-w-[200px]"
              />
              <select
                value={quickMealTag}
                onChange={(e) => setQuickMealTag(e.target.value as any)}
                className="px-2.5 py-1.5 bg-paper border border-rule rounded-md text-xs font-mono text-ink focus:outline-none focus:ring-2 focus:ring-ledger-blue focus:ring-offset-1"
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

      {/* Discord Daily Activity Recap Modal */}
      <DiscordRecapModal
        isOpen={isDiscordModalOpen}
        onClose={() => setIsDiscordModalOpen(false)}
        initialDate={data.today}
      />
    </div>
  );
};
