import React, { useEffect, useState } from 'react';
import type { GameEntry, RAWGSearchResult, GameStatsResponse, RouteTab } from '../types';
import {
  fetchGames,
  addGameEntry,
  deleteGameEntry,
  fetchGameStats,
  searchRawg,
} from '../api';
import { Header } from '../components/Header';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import {
  Gamepad2,
  Plus,
  Trash2,
  Search,
  Trophy,
  Clock,
  Calendar,
  Flame,
  Star,
  Sparkles,
  Calculator,
  Timer,
} from 'lucide-react';

interface GamesPageProps {
  onNavigate: (tab: RouteTab) => void;
}

// Helper to convert decimal hours to humanized string "1h 30m"
function formatHoursHuman(decimalHours: number): string {
  if (!decimalHours || decimalHours <= 0) return '0m';
  const hrs = Math.floor(decimalHours);
  const mins = Math.round((decimalHours - hrs) * 60);
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

export const GamesPage: React.FC<GamesPageProps> = ({ onNavigate }) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [entries, setEntries] = useState<GameEntry[]>([]);
  const [stats, setStats] = useState<GameStatsResponse>({
    totalHours: 0,
    thisWeekHours: 0,
    topGameThisWeek: null,
    historyMap: {},
  });
  const [loading, setLoading] = useState(true);

  // Manual & RAWG Search modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gameName, setGameName] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [loggedDate, setLoggedDate] = useState(todayStr);

  // Playtime Dual-Input Mode ('detailed' with Hours & Minutes vs 'decimal')
  const [inputMode, setInputMode] = useState<'detailed' | 'decimal'>('detailed');
  // Detailed mode state
  const [inputHours, setInputHours] = useState('1');
  const [inputMinutes, setInputMinutes] = useState('30');
  // Direct decimal mode state
  const [decimalHours, setDecimalHours] = useState('1.5');

  // RAWG search
  const [rawgQuery, setRawgQuery] = useState('');
  const [rawgResults, setRawgResults] = useState<RAWGSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [rawgError, setRawgError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [gamesRes, statsRes] = await Promise.all([fetchGames(), fetchGameStats()]);
      setEntries(gamesRes);
      setStats(statsRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute final decimal hours based on active input mode
  const getCalculatedDecimalHours = (): number => {
    if (inputMode === 'detailed') {
      const h = Math.max(0, parseInt(inputHours, 10) || 0);
      const m = Math.max(0, parseInt(inputMinutes, 10) || 0);
      const total = h + (m / 60);
      return Math.round(total * 100) / 100;
    } else {
      const val = parseFloat(decimalHours) || 0;
      return Math.round(val * 100) / 100;
    }
  };

  const currentComputedDecimal = getCalculatedDecimalHours();

  // Generate 30 days dot-ledger array
  const days30: { date: string; value: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().slice(0, 10);
    days30.push({ date: dStr, value: stats.historyMap[dStr] || 0 });
  }

  const handleSearchRawg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawgQuery.trim()) return;
    try {
      setIsSearching(true);
      setRawgError(null);
      const results = await searchRawg(rawgQuery.trim());
      setRawgResults(results);
    } catch (err: any) {
      setRawgError(err.message || 'RAWG search failed. Add your RAWG key in Settings.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectRawgGame = (game: RAWGSearchResult) => {
    setGameName(game.name);
    setCoverUrl(game.coverUrl);
    setRawgResults([]);
    setRawgQuery('');
  };

  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameName.trim()) return;

    const finalHours = currentComputedDecimal > 0 ? currentComputedDecimal : 0.5;

    try {
      await addGameEntry({
        gameName: gameName.trim(),
        hours: finalHours,
        coverUrl: coverUrl || null,
        loggedAt: loggedDate,
      });

      setIsModalOpen(false);
      setGameName('');
      setInputHours('1');
      setInputMinutes('30');
      setDecimalHours('1.5');
      setCoverUrl(null);
      setLoggedDate(todayStr);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGameEntry(id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Quick increment helpers
  const addMinutes = (mins: number) => {
    const currentM = parseInt(inputMinutes, 10) || 0;
    const currentH = parseInt(inputHours, 10) || 0;
    const totalM = currentM + mins;
    const newH = currentH + Math.floor(totalM / 60);
    const newM = totalM % 60;
    setInputHours(String(newH));
    setInputMinutes(String(newM));
  };

  const addDecimalHours = (hrs: number) => {
    const cur = parseFloat(decimalHours) || 0;
    const next = Math.round((cur + hrs) * 100) / 100;
    setDecimalHours(String(next));
  };

  return (
    <div className="space-y-6">
      <Header
        title="Game Log"
        subtitle="Track gaming sessions, precise minutes/hours & weekly milestones"
        dotLedgerData={days30}
        dotLedgerUnit="hours"
      >
        <button
          onClick={() => {
            setGameName('');
            setInputHours('1');
            setInputMinutes('30');
            setDecimalHours('1.5');
            setCoverUrl(null);
            setLoggedDate(todayStr);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-ledger-blue text-paper rounded-[4px] text-xs font-medium hover:bg-ledger-hover active:scale-95 transition-all shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Log Session</span>
        </button>
      </Header>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="ledger-card p-4">
          <div className="flex items-center gap-2 text-xs font-mono text-ink-soft uppercase tracking-wider mb-2">
            <Clock className="w-4 h-4 text-ledger-blue" />
            <span>Total Playtime</span>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-bold text-ink">
            {stats.totalHours.toFixed(2)}{' '}
            <span className="text-sm font-normal text-ink-soft">hrs</span>
          </div>
          <p className="text-[11px] font-mono text-ink-soft mt-1.5">
            ≈ {formatHoursHuman(stats.totalHours)} logged all-time
          </p>
        </div>

        <div className="ledger-card p-4">
          <div className="flex items-center gap-2 text-xs font-mono text-ink-soft uppercase tracking-wider mb-2">
            <Flame className="w-4 h-4 text-stamp-red" />
            <span>This Week</span>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-bold text-ink">
            {stats.thisWeekHours.toFixed(2)}{' '}
            <span className="text-sm font-normal text-ink-soft">hrs</span>
          </div>
          <p className="text-[11px] font-mono text-ink-soft mt-1.5">
            ≈ {formatHoursHuman(stats.thisWeekHours)} in the last 7 days
          </p>
        </div>

        <div className="ledger-card p-4 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-xs font-mono text-ink-soft uppercase tracking-wider mb-2">
            <Trophy className="w-4 h-4 text-gold" />
            <span>Top Game This Week</span>
          </div>
          {stats.topGameThisWeek ? (
            <div>
              <div className="font-serif text-lg font-bold text-ink truncate">
                {stats.topGameThisWeek.name}
              </div>
              <p className="text-[11px] font-mono text-ink-soft mt-1">
                <span className="font-semibold text-ink">{stats.topGameThisWeek.hours.toFixed(2)} hrs</span> ({formatHoursHuman(stats.topGameThisWeek.hours)})
              </p>
            </div>
          ) : (
            <p className="text-xs text-ink-soft py-1">No sessions logged this week.</p>
          )}
        </div>
      </div>

      {/* Session Logs List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-lg font-semibold text-ink">Logged Sessions</h2>
          <span className="text-xs font-mono text-ink-soft">{entries.length} entries</span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs font-mono text-ink-soft animate-pulse">
            Reading game log entries...
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={Gamepad2}
            message="No game sessions logged yet."
            secondaryText="Log your exact hours and minutes to track your gaming journey."
            actionLabel="Log a Game Session"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="ledger-card p-3.5 flex gap-3.5 items-center justify-between group hover:border-ink-soft/70 transition-all"
              >
                <div className="flex gap-3 items-center overflow-hidden flex-1">
                  {entry.coverUrl ? (
                    <img
                      src={entry.coverUrl}
                      alt={entry.gameName}
                      className="w-12 h-16 object-cover rounded-[4px] border border-rule flex-shrink-0 shadow-xs"
                    />
                  ) : (
                    <div className="w-12 h-16 bg-paper/80 border border-rule rounded-[4px] flex items-center justify-center text-xl flex-shrink-0">
                      🎮
                    </div>
                  )}

                  <div className="overflow-hidden flex-1">
                    <h3 className="text-sm font-semibold text-ink truncate leading-tight">
                      {entry.gameName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs font-mono text-ink-soft flex-wrap">
                      <span className="font-bold text-ink bg-ledger-light/80 px-1.5 py-0.5 rounded text-[11px] text-ledger-blue">
                        {entry.hours.toFixed(2)} hrs
                      </span>
                      <span className="text-[10px] text-ink-soft">
                        ({formatHoursHuman(entry.hours)})
                      </span>
                      <span>•</span>
                      <span className="text-[11px]">{entry.loggedAt}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(entry.id)}
                  className="p-1 text-ink-soft hover:text-stamp-red opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete log"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log Session Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Game Session" maxWidth="max-w-lg">
        {/* RAWG Search Section */}
        <div className="mb-4 pb-4 border-b border-rule/70">
          <label className="block text-xs font-medium text-ink mb-1.5">
            Search Cover Art (via RAWG)
          </label>
          <form onSubmit={handleSearchRawg} className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Search title on RAWG..."
              value={rawgQuery}
              onChange={(e) => setRawgQuery(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs bg-paper border border-rule rounded-[4px] focus:bg-card focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSearching || !rawgQuery.trim()}
              className="px-3 py-1.5 bg-card border border-rule hover:border-ink-soft text-xs font-mono text-ink rounded-[4px] active:scale-95 transition-all"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {rawgError && (
            <p className="text-[11px] text-stamp-red font-mono mb-2">{rawgError}</p>
          )}

          {rawgResults.length > 0 && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {rawgResults.map((res) => (
                <div
                  key={res.id}
                  onClick={() => handleSelectRawgGame(res)}
                  className="p-2 bg-paper border border-rule rounded flex items-center justify-between cursor-pointer hover:border-ink-soft transition-colors"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {res.coverUrl && (
                      <img
                        src={res.coverUrl}
                        alt={res.name}
                        className="w-8 h-8 object-cover rounded-[3px]"
                      />
                    )}
                    <span className="text-xs font-medium text-ink truncate">{res.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-ledger-blue font-semibold">Select</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSaveGame} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Game Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Elden Ring, Cyberpunk 2077, Hollow Knight"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded-[4px] focus:bg-card focus:outline-none"
              autoFocus
            />
          </div>

          {/* Dual Input Mode Switcher */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-ink">Playtime Input Mode</label>
              <div className="flex items-center gap-1 bg-paper border border-rule p-0.5 rounded-[4px]">
                <button
                  type="button"
                  onClick={() => setInputMode('detailed')}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded-[3px] transition-all flex items-center gap-1 ${
                    inputMode === 'detailed'
                      ? 'bg-ledger-blue text-paper font-semibold shadow-xs'
                      : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  <Timer className="w-3 h-3" />
                  <span>Hours & Mins</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('decimal')}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded-[3px] transition-all flex items-center gap-1 ${
                    inputMode === 'decimal'
                      ? 'bg-ledger-blue text-paper font-semibold shadow-xs'
                      : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  <Calculator className="w-3 h-3" />
                  <span>Direct Decimal</span>
                </button>
              </div>
            </div>

            {/* Type 1: Hours & Minutes Detailed Input */}
            {inputMode === 'detailed' ? (
              <div className="p-3 bg-paper border border-rule rounded-[6px] space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-ink-soft mb-1">
                      Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={inputHours}
                      onChange={(e) => setInputHours(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-card border border-rule rounded-[4px] font-mono text-ink focus:outline-none focus:border-ledger-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-ink-soft mb-1">
                      Minutes (0-59)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={inputMinutes}
                      onChange={(e) => setInputMinutes(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-card border border-rule rounded-[4px] font-mono text-ink focus:outline-none focus:border-ledger-blue"
                    />
                  </div>
                </div>

                {/* Quick Minute add pills */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-mono text-ink-soft">Quick add:</span>
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => addMinutes(mins)}
                      className="px-2 py-0.5 bg-card border border-rule hover:border-ink-soft rounded text-[10px] font-mono text-ink active:scale-95"
                    >
                      +{mins}m
                    </button>
                  ))}
                </div>

                {/* Live Output in Decimal */}
                <div className="flex items-center justify-between pt-2 border-t border-rule/60 text-xs font-mono">
                  <span className="text-ink-soft">Calculated Decimal Output:</span>
                  <span className="font-bold text-ledger-blue text-sm bg-card px-2 py-0.5 rounded border border-rule">
                    {currentComputedDecimal.toFixed(2)} hrs
                  </span>
                </div>
              </div>
            ) : (
              /* Type 2: Direct Decimal Input */
              <div className="p-3 bg-paper border border-rule rounded-[6px] space-y-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-ink-soft mb-1">
                    Playtime (in Decimal Hours)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.05"
                    required
                    value={decimalHours}
                    onChange={(e) => setDecimalHours(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-card border border-rule rounded-[4px] font-mono text-ink focus:outline-none focus:border-ledger-blue"
                  />
                </div>

                {/* Quick Decimal Add pills */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-mono text-ink-soft">Quick add:</span>
                  {[0.25, 0.5, 1.0, 2.0].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => addDecimalHours(h)}
                      className="px-2 py-0.5 bg-card border border-rule hover:border-ink-soft rounded text-[10px] font-mono text-ink active:scale-95"
                    >
                      +{h}h
                    </button>
                  ))}
                </div>

                {/* Live Humanized Output */}
                <div className="flex items-center justify-between pt-2 border-t border-rule/60 text-xs font-mono">
                  <span className="text-ink-soft">Time Equivalent:</span>
                  <span className="font-bold text-ledger-blue text-sm bg-card px-2 py-0.5 rounded border border-rule">
                    ≈ {formatHoursHuman(currentComputedDecimal)} ({currentComputedDecimal.toFixed(2)} hrs)
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Date Played</label>
            <input
              type="date"
              required
              value={loggedDate}
              onChange={(e) => setLoggedDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded-[4px] focus:bg-card focus:outline-none font-mono"
            />
          </div>

          {coverUrl && (
            <div className="flex items-center gap-3 p-2.5 bg-paper border border-rule rounded-[4px]">
              <img src={coverUrl} alt="Cover" className="w-10 h-10 object-cover rounded-[3px]" />
              <span className="text-xs text-ink-soft truncate">RAWG cover art attached</span>
              <button
                type="button"
                onClick={() => setCoverUrl(null)}
                className="text-xs text-stamp-red ml-auto font-mono hover:underline"
              >
                Remove
              </button>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-rule">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 text-xs text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-ledger-blue text-paper text-xs font-medium rounded-[4px] hover:bg-ledger-hover active:scale-95 transition-all shadow-xs"
            >
              Save Session ({currentComputedDecimal.toFixed(2)}h)
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

