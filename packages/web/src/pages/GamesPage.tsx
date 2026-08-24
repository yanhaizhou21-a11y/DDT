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
} from 'lucide-react';

interface GamesPageProps {
  onNavigate: (tab: RouteTab) => void;
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
  const [hours, setHours] = useState('1');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [loggedDate, setLoggedDate] = useState(todayStr);

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

    try {
      await addGameEntry({
        gameName: gameName.trim(),
        hours: Number(hours) || 1,
        coverUrl: coverUrl || null,
        loggedAt: loggedDate,
      });

      setIsModalOpen(false);
      setGameName('');
      setHours('1');
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

  return (
    <div className="space-y-6">
      <Header
        title="Game Log"
        subtitle="Track gaming sessions, hours played & weekly milestones"
        dotLedgerData={days30}
        dotLedgerUnit="hours"
      >
        <button
          onClick={() => {
            setGameName('');
            setHours('1');
            setCoverUrl(null);
            setLoggedDate(todayStr);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-ledger-blue text-paper rounded text-xs font-medium hover:bg-ledger-hover transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Log Session</span>
        </button>
      </Header>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="ledger-card p-4">
          <div className="flex items-center gap-2 text-xs font-mono text-ink-soft uppercase tracking-wider mb-2">
            <Clock className="w-4 h-4 text-ledger-blue" />
            <span>Total Playtime</span>
          </div>
          <div className="font-mono text-2xl font-bold text-ink">
            {stats.totalHours} <span className="text-sm font-normal text-ink-soft">hours</span>
          </div>
          <p className="text-[11px] text-ink-soft mt-1">All-time logged gameplay</p>
        </div>

        <div className="ledger-card p-4">
          <div className="flex items-center gap-2 text-xs font-mono text-ink-soft uppercase tracking-wider mb-2">
            <Flame className="w-4 h-4 text-stamp-red" />
            <span>This Week</span>
          </div>
          <div className="font-mono text-2xl font-bold text-ink">
            {stats.thisWeekHours} <span className="text-sm font-normal text-ink-soft">hours</span>
          </div>
          <p className="text-[11px] text-ink-soft mt-1">Last 7 days of gameplay</p>
        </div>

        <div className="ledger-card p-4">
          <div className="flex items-center gap-2 text-xs font-mono text-ink-soft uppercase tracking-wider mb-2">
            <Trophy className="w-4 h-4 text-amber-600" />
            <span>Top Game This Week</span>
          </div>
          {stats.topGameThisWeek ? (
            <div>
              <div className="font-serif text-lg font-bold text-ink truncate">
                {stats.topGameThisWeek.name}
              </div>
              <p className="text-[11px] font-mono text-ink-soft mt-1">
                {stats.topGameThisWeek.hours} hours played
              </p>
            </div>
          ) : (
            <p className="text-xs text-ink-soft py-1">No sessions logged this week.</p>
          )}
        </div>
      </div>

      {/* Session Logs List */}
      <div>
        <h2 className="font-serif text-lg font-semibold text-ink mb-3">Logged Sessions</h2>

        {loading ? (
          <div className="py-16 text-center text-xs font-mono text-ink-soft animate-pulse">
            Reading game log entries...
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={Gamepad2}
            message="No game sessions logged yet."
            secondaryText="Log your playtime and keep track of hours spent in each title."
            actionLabel="Log a Game Session"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="ledger-card p-3.5 flex gap-3.5 items-center justify-between group"
              >
                <div className="flex gap-3 items-center overflow-hidden flex-1">
                  {entry.coverUrl ? (
                    <img
                      src={entry.coverUrl}
                      alt={entry.gameName}
                      className="w-12 h-16 object-cover rounded-[3px] border border-rule flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-16 bg-paper border border-rule rounded-[3px] flex items-center justify-center text-lg flex-shrink-0">
                      🎮
                    </div>
                  )}

                  <div className="overflow-hidden flex-1">
                    <h3 className="text-sm font-semibold text-ink truncate leading-tight">
                      {entry.gameName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 text-xs font-mono text-ink-soft">
                      <span className="font-semibold text-ink">{entry.hours} hrs</span>
                      <span>•</span>
                      <span>{entry.loggedAt}</span>
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
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Game Session">
        {/* RAWG Search Section */}
        <div className="mb-4 pb-4 border-b border-rule">
          <label className="block text-xs font-medium text-ink mb-1.5">
            Search Game Cover (via RAWG)
          </label>
          <form onSubmit={handleSearchRawg} className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Search title on RAWG..."
              value={rawgQuery}
              onChange={(e) => setRawgQuery(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs bg-paper border border-rule rounded-[3px] focus:bg-card focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSearching || !rawgQuery.trim()}
              className="px-3 py-1.5 bg-card border border-rule hover:border-ink-soft text-xs font-mono text-ink rounded"
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
                  className="p-2 bg-paper border border-rule rounded flex items-center justify-between cursor-pointer hover:border-ink-soft"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {res.coverUrl && (
                      <img
                        src={res.coverUrl}
                        alt={res.name}
                        className="w-8 h-8 object-cover rounded-[2px]"
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
            <label className="block text-xs font-medium text-ink mb-1">Game Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Baldur's Gate 3"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded-[3px] focus:bg-card focus:outline-none"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Hours Played</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded-[3px] focus:bg-card focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Date</label>
              <input
                type="date"
                required
                value={loggedDate}
                onChange={(e) => setLoggedDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded-[3px] focus:bg-card focus:outline-none font-mono"
              />
            </div>
          </div>

          {coverUrl && (
            <div className="flex items-center gap-3 p-2.5 bg-paper border border-rule rounded-[3px]">
              <img src={coverUrl} alt="Cover" className="w-10 h-10 object-cover rounded-[2px]" />
              <span className="text-xs text-ink-soft truncate">Cover art attached</span>
              <button
                type="button"
                onClick={() => setCoverUrl(null)}
                className="text-xs text-stamp-red ml-auto font-mono hover:underline"
              >
                Remove
              </button>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-rule">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 text-xs text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-ledger-blue text-paper text-xs font-medium rounded hover:bg-ledger-hover"
            >
              Save Entry
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
