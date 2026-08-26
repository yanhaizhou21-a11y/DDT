import React, { useEffect, useState } from 'react';
import type { GameEntry, GameLibraryItem, RAWGSearchResult, GameStatsResponse, RouteTab } from '../types';
import {
  fetchGames,
  fetchGameLibrary,
  addGameEntry,
  deleteGameEntry,
  fetchGameStats,
  searchRawg,
  uploadImage,
  updateGameCover,
} from '../api';
import { Header } from '../components/Header';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/AlertDialog';
import { EmptyState } from '../components/EmptyState';
import { Magnetic } from '../components/Magnetic';
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
  Layers,
  History,
  Play,
  Check,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Edit3,
  Camera,
  CheckCircle2,
} from 'lucide-react';


interface GamesPageProps {
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

export const GamesPage: React.FC<GamesPageProps> = () => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [library, setLibrary] = useState<GameLibraryItem[]>([]);
  const [historyEntries, setHistoryEntries] = useState<GameEntry[]>([]);
  const [stats, setStats] = useState<GameStatsResponse>({
    totalHours: 0,
    thisWeekHours: 0,
    topGameThisWeek: null,
    historyMap: {},
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'library' | 'history'>('library');
  const [searchFilter, setSearchFilter] = useState('');

  // Add / Log Session Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gameName, setGameName] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [loggedDate, setLoggedDate] = useState(todayStr);
  const [coverTab, setCoverTab] = useState<'upload' | 'url'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Edit Cover Modal (For Library cards)
  const [isEditCoverModalOpen, setIsEditCoverModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<{ gameName: string; coverUrl: string | null } | null>(null);
  const [editCoverTab, setEditCoverTab] = useState<'upload' | 'url'>('upload');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [editCoverUploading, setEditCoverUploading] = useState(false);
  const [editCoverSaving, setEditCoverSaving] = useState(false);
  const [editCoverError, setEditCoverError] = useState<string | null>(null);

  // Confirm delete session state
  const [sessionToDelete, setSessionToDelete] = useState<{ id: string; name: string; date?: string } | null>(null);

  // Playtime Dual-Input Mode ('detailed' with Hours & Minutes vs 'decimal')
  const [inputMode, setInputMode] = useState<'detailed' | 'decimal'>('detailed');
  const [inputHours, setInputHours] = useState('1');
  const [inputMinutes, setInputMinutes] = useState('30');
  const [decimalHours, setDecimalHours] = useState('1.5');


  // RAWG search
  const [rawgQuery, setRawgQuery] = useState('');
  const [rawgResults, setRawgResults] = useState<RAWGSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [rawgError, setRawgError] = useState<string | null>(null);


  const loadData = async () => {
    try {
      setLoading(true);
      const [libRes, gamesRes, statsRes] = await Promise.all([
        fetchGameLibrary(),
        fetchGames(),
        fetchGameStats(),
      ]);
      setLibrary(libRes);
      setHistoryEntries(gamesRes);
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

  const getCalculatedDecimalHours = (): number => {
    if (inputMode === 'detailed') {
      const h = Math.max(0, parseInt(inputHours, 10) || 0);
      const m = Math.max(0, parseInt(inputMinutes, 10) || 0);
      const total = h + m / 60;
      return Math.round(total * 100) / 100;
    } else {
      const normalized = String(decimalHours).replace(',', '.');
      const val = Math.max(0, parseFloat(normalized) || 0);
      return Math.round(val * 100) / 100;
    }
  };


  const handleOpenAddModal = (presetGame?: { name: string; coverUrl: string | null }) => {
    if (presetGame) {
      setGameName(presetGame.name);
      setCoverUrl(presetGame.coverUrl);
      setRawgQuery('');
      setRawgResults([]);
    } else {
      setGameName('');
      setCoverUrl(null);
      setRawgQuery('');
      setRawgResults([]);
    }
    setLoggedDate(todayStr);
    setInputHours('1');
    setInputMinutes('0');
    setDecimalHours('1.0');
    setInputMode('detailed');
    setCoverTab('upload');
    setUploadError(null);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (file: File, isForEditModal = false) => {
    const maxBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxBytes) {
      const msg = `File (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas 5 MB.`;
      if (isForEditModal) setEditCoverError(msg);
      else setUploadError(msg);
      return;
    }

    try {
      if (isForEditModal) {
        setEditCoverUploading(true);
        setEditCoverError(null);
        const res = await uploadImage(file);
        setEditCoverUrl(res.url);
      } else {
        setIsUploading(true);
        setUploadError(null);
        const res = await uploadImage(file);
        setCoverUrl(res.url);
      }
    } catch (err: any) {
      const msg = err.message || 'Gagal mengunggah gambar. Pastikan file valid (maksimal 5 MB).';
      if (isForEditModal) setEditCoverError(msg);
      else setUploadError(msg);
    } finally {
      if (isForEditModal) setEditCoverUploading(false);
      else setIsUploading(false);
    }
  };

  const handleOpenEditCover = (game: GameLibraryItem) => {
    setEditingGame({ gameName: game.gameName, coverUrl: game.coverUrl });
    setEditCoverUrl(game.coverUrl || '');
    setEditCoverTab('upload');
    setEditCoverError(null);
    setIsEditCoverModalOpen(true);
  };

  const handleSaveEditCover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGame) return;
    try {
      setEditCoverSaving(true);
      setEditCoverError(null);
      await updateGameCover(editingGame.gameName, editCoverUrl.trim() || null);
      setIsEditCoverModalOpen(false);
      loadData();
    } catch (err: any) {
      setEditCoverError(err.message || 'Gagal menyimpan cover game');
    } finally {
      setEditCoverSaving(false);
    }
  };


  const handleSearchRawg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawgQuery.trim()) return;
    try {
      setIsSearching(true);
      setRawgError(null);
      const results = await searchRawg(rawgQuery.trim());
      setRawgResults(results);
      if (results.length === 0) {
        setRawgError('No games found matching your query.');
      }
    } catch (err: any) {
      setRawgError(err.message || 'RAWG search error. Check your API key in Settings.');
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

    const calculatedHours = getCalculatedDecimalHours();
    if (calculatedHours <= 0) {
      alert('Please enter at least 1 minute or 0.05 hours of playtime.');
      return;
    }

    try {
      await addGameEntry({
        gameName: gameName.trim(),
        hours: calculatedHours,
        coverUrl,
        loggedAt: loggedDate,
      });

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to log game session');
    }
  };

  const handleDeleteSession = (id: string, name: string, date?: string) => {
    setSessionToDelete({ id, name, date });
  };

  const handleConfirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    try {
      await deleteGameEntry(sessionToDelete.id);
      setSessionToDelete(null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };


  // Generate 30 days for DotLedger
  const dotLedgerDays: { date: string; value: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().slice(0, 10);
    dotLedgerDays.push({ date: dStr, value: stats.historyMap[dStr] || 0 });
  }

  // Filtered lists
  const filteredLibrary = library.filter((g) =>
    g.gameName.toLowerCase().includes(searchFilter.toLowerCase())
  );
  const filteredHistory = historyEntries.filter((h) =>
    h.gameName.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const calculatedPreview = getCalculatedDecimalHours();

  return (
    <div className="space-y-6">
      <Header
        title="Game Ledger"
        subtitle="Consolidated playtime tracking with minute precision & RAWG cover art"
        dotLedgerData={dotLedgerDays}
        dotLedgerUnit="hrs"
      >
        <Magnetic>
          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-2 px-4 py-2 bg-ledger-blue text-paper text-xs font-semibold rounded-lg hover:bg-ledger-hover transition-all shadow-subtle"
          >
            <Plus className="w-4 h-4" />
            <span>+ Log Playtime</span>
          </button>
        </Magnetic>
      </Header>

      {/* Stats Summary Bento Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Time */}
        <div className="ledger-card p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-ink-soft">
              Total Playtime
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-mono text-2xl font-bold text-ink">
                {stats.totalHours.toFixed(2)}
              </span>
              <span className="text-xs text-ink-soft font-mono">
                hrs ({formatHoursHuman(stats.totalHours)})
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-paper flex items-center justify-center text-ledger-blue border border-rule/60">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* This Week */}
        <div className="ledger-card p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-ink-soft">
              This Week
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-mono text-2xl font-bold text-ink">
                {stats.thisWeekHours.toFixed(2)}
              </span>
              <span className="text-xs text-ink-soft font-mono">
                hrs ({formatHoursHuman(stats.thisWeekHours)})
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-paper flex items-center justify-center text-gold border border-rule/60">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        {/* Top Game This Week */}
        <div className="ledger-card p-4 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-soft">
              Top Title This Week
            </span>
            <div className="font-serif font-bold text-base text-ink truncate mt-1">
              {stats.topGameThisWeek?.name || 'No gameplay logged'}
            </div>
            {stats.topGameThisWeek && (
              <span className="text-xs font-mono text-ink-soft">
                {stats.topGameThisWeek.hours.toFixed(2)} hrs logged
              </span>
            )}
          </div>
          <div className="w-10 h-10 rounded-lg bg-paper flex items-center justify-center text-stamp-red shrink-0 border border-rule/60">
            <Trophy className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Navigation & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Tab Switcher: Library (No Duplicates) vs Session History */}
        <div className="flex items-center gap-1 p-1 bg-card rounded-lg border border-rule shadow-subtle w-fit">
          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'library'
                ? 'bg-paper text-ink font-semibold shadow-xs border border-rule/60'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Game Library ({library.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'history'
                ? 'bg-paper text-ink font-semibold shadow-xs border border-rule/60'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Session History ({historyEntries.length})</span>
          </button>
        </div>

        {/* Filter search bar */}
        <div className="relative sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft opacity-50" />
          <input
            type="text"
            placeholder="Search titles..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-card border border-rule rounded-lg text-xs font-sans text-ink placeholder:text-ink-soft/50 focus:outline-hidden focus:border-ledger-blue shadow-subtle"
          />
        </div>
      </div>

      {/* TAB 1: CONSOLIDATED GAME LIBRARY (NO DUPLICATES) */}
      {activeTab === 'library' && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="ledger-card h-64 animate-pulse bg-card/60 p-4" />
              ))}
            </div>
          ) : filteredLibrary.length === 0 ? (
            <EmptyState
              icon={Gamepad2}
              title="No games in your library"
              description={
                searchFilter
                  ? `No games match "${searchFilter}"`
                  : 'Start tracking your gameplay sessions without duplicate entries.'
              }
              action={
                searchFilter ? undefined : (
                  <button
                    onClick={() => handleOpenAddModal()}
                    className="px-4 py-2 bg-ledger-blue text-paper text-xs font-semibold rounded-lg hover:bg-ledger-hover transition-colors"
                  >
                    + Log Your First Game
                  </button>
                )
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredLibrary.map((item) => {
                const isPlayedToday = item.lastPlayed === todayStr;
                return (
                  <div
                    key={item.gameName}
                    className="ledger-card overflow-hidden flex flex-col group hover:shadow-card transition-all duration-200"
                  >
                    {/* Cover Art Box */}
                    <div className="relative h-40 w-full bg-paper overflow-hidden border-b border-rule/70">
                      {item.coverUrl ? (
                        <img
                          src={item.coverUrl}
                          alt={item.gameName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-ink-soft/40">
                          <Gamepad2 className="w-12 h-12 stroke-1" />
                          <span className="text-[10px] font-mono mt-1">No Cover Artwork</span>
                        </div>
                      )}

                      {/* Change Cover Quick Action (Hover) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditCover(item);
                        }}
                        className="absolute top-2 left-2 px-2 py-1 rounded-md bg-ink/75 hover:bg-ledger-blue text-paper font-mono text-[10px] backdrop-blur-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shadow-subtle z-10"
                        title="Change cover artwork"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Change Cover</span>
                      </button>

                      {/* Status Badges */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
                        {isPlayedToday && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/90 text-white font-mono text-[10px] font-bold shadow-xs backdrop-blur-xs">
                            PLAYED TODAY
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-ink/75 text-paper font-mono text-[10px] backdrop-blur-xs">
                          {item.sessionCount} {item.sessionCount === 1 ? 'session' : 'sessions'}
                        </span>
                      </div>
                    </div>


                    {/* Content Section */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3 className="font-serif font-bold text-base text-ink line-clamp-1 group-hover:text-ledger-blue transition-colors">
                          {item.gameName}
                        </h3>

                        {/* Playtime Metrics */}
                        <div className="flex items-baseline gap-1.5 mt-1.5">
                          <span className="font-mono text-xl font-bold text-ink">
                            {item.totalHours.toFixed(2)}
                          </span>
                          <span className="text-xs font-mono text-ink-soft">
                            hrs ({formatHoursHuman(item.totalHours)})
                          </span>
                        </div>

                        <div className="text-[11px] text-ink-soft font-mono mt-1">
                          Last played:{' '}
                          <span className="text-ink">
                            {item.lastPlayed === todayStr ? 'Today' : item.lastPlayed}
                          </span>
                        </div>
                      </div>

                      {/* Direct "+ Add Hours" Action on the Card */}
                      <button
                        onClick={() =>
                          handleOpenAddModal({
                            name: item.gameName,
                            coverUrl: item.coverUrl,
                          })
                        }
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-paper hover:bg-ledger-light hover:text-ledger-blue text-ink text-xs font-semibold rounded-md border border-rule transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add Playtime Today</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: CHRONOLOGICAL SESSION HISTORY */}
      {activeTab === 'history' && (
        <div className="ledger-card p-4">
          <h3 className="font-serif font-bold text-base text-ink pb-3 border-b border-rule mb-4 flex items-center justify-between">
            <span>Logged Sessions Log</span>
            <span className="text-xs font-mono text-ink-soft">
              {filteredHistory.length} total recorded entries
            </span>
          </h3>

          {filteredHistory.length === 0 ? (
            <p className="text-xs text-ink-soft font-mono py-8 text-center">
              No session entries found.
            </p>
          ) : (
            <div className="divide-y divide-rule/60">
              {filteredHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-paper/40 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-md bg-paper border border-rule shrink-0 overflow-hidden">
                      {entry.coverUrl ? (
                        <img
                          src={entry.coverUrl}
                          alt={entry.gameName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-ink-soft/40">
                          <Gamepad2 className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-serif font-semibold text-sm text-ink truncate">
                        {entry.gameName}
                      </div>
                      <div className="text-xs text-ink-soft font-mono flex items-center gap-2">
                        <span>{entry.loggedAt}</span>
                        <span>•</span>
                        <span className="text-ledger-blue font-semibold">
                          {entry.hours.toFixed(2)} hrs ({formatHoursHuman(entry.hours)})
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteSession(entry.id, entry.gameName)}
                    className="p-1.5 text-ink-soft hover:text-stamp-red rounded-md hover:bg-paper transition-colors"
                    title="Delete this session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QUICK LOG PLAYTIME MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={gameName ? `Log Playtime: ${gameName}` : 'Log Game Playtime'}
      >
        <form onSubmit={handleSaveGame} className="space-y-5">
          {/* Game Selection / RAWG Search */}
          {!gameName && (
            <div className="space-y-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-ink-soft">
                Search Game or Enter Title
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft opacity-50" />
                  <input
                    type="text"
                    value={rawgQuery}
                    onChange={(e) => setRawgQuery(e.target.value)}
                    placeholder="Search RAWG database (e.g. Elden Ring, Wuthering Waves)..."
                    className="w-full pl-9 pr-3 py-2 bg-paper border border-rule rounded-md text-sm text-ink focus:outline-hidden"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearchRawg}
                  disabled={isSearching || !rawgQuery.trim()}
                  className="px-3.5 py-2 bg-paper border border-rule hover:border-ink-soft text-ink text-xs font-mono rounded-md disabled:opacity-40 transition-colors"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>

              {rawgError && <p className="text-xs text-stamp-red font-mono">{rawgError}</p>}

              {/* RAWG Search Results */}
              {rawgResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1 border border-rule rounded-md p-1 bg-paper/50">
                  {rawgResults.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelectRawgGame(r)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-card rounded text-left transition-colors"
                    >
                      {r.coverUrl ? (
                        <img
                          src={r.coverUrl}
                          alt={r.name}
                          className="w-8 h-10 object-cover rounded shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-10 bg-paper border border-rule rounded flex items-center justify-center shrink-0">
                          <Gamepad2 className="w-4 h-4 text-ink-soft/40" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-serif font-semibold text-xs text-ink truncate">
                          {r.name}
                        </div>
                        <div className="text-[10px] text-ink-soft font-mono">
                          {r.released?.slice(0, 4)} • Rating: {r.rating || 'N/A'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Manual Name Input Fallback */}
              <div className="pt-2">
                <input
                  type="text"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="Or type custom game title directly..."
                  className="w-full px-3 py-2 bg-paper border border-rule rounded-md text-sm text-ink focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Selected Game Banner */}
          {gameName && (
            <div className="p-3 rounded-lg bg-paper border border-rule flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={gameName}
                    className="w-12 h-12 object-cover rounded-md border border-rule shrink-0 shadow-xs"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-md bg-card border border-rule flex items-center justify-center text-ink-soft shrink-0">
                    <Gamepad2 className="w-5 h-5 opacity-50" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-mono text-ink-soft">Target Game:</div>
                  <div className="font-serif font-bold text-sm text-ink truncate">{gameName}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGameName('')}
                className="text-xs font-mono text-ledger-blue hover:underline shrink-0"
              >
                Change Title
              </button>
            </div>
          )}

          {/* Custom Cover Art: Dual Mode (Upload File PC vs Paste URL) */}
          <div className="space-y-2 p-3 bg-paper border border-rule rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-ledger-blue" />
                Cover Artwork
              </span>

              {/* Mode Toggle: Upload vs URL */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center p-0.5 rounded-md bg-card border border-rule text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => setCoverTab('upload')}
                    className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                      coverTab === 'upload'
                        ? 'bg-ledger-blue text-paper font-semibold shadow-xs'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    <Upload className="w-3 h-3" />
                    Upload PC
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverTab('url')}
                    className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                      coverTab === 'url'
                        ? 'bg-ledger-blue text-paper font-semibold shadow-xs'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    <LinkIcon className="w-3 h-3" />
                    Image URL
                  </button>
                </div>

                {coverUrl && (
                  <button
                    type="button"
                    onClick={() => setCoverUrl(null)}
                    className="text-[11px] font-mono text-stamp-red hover:underline ml-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Tab 1: Upload File PC (Max 5MB) */}
            {coverTab === 'upload' ? (
              <div className="space-y-2">
                <label className="block border-2 border-dashed border-rule hover:border-ledger-blue/70 rounded-lg p-3 text-center cursor-pointer transition-colors bg-card hover:bg-card/80">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, false);
                    }}
                  />
                  {isUploading ? (
                    <div className="flex items-center justify-center gap-2 text-xs font-mono text-ledger-blue py-2">
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Mengunggah gambar (maks 5MB)...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-xs text-ink-soft py-1">
                      <Upload className="w-4 h-4 text-ledger-blue" />
                      <span className="font-mono">
                        Pilih atau Drag & Drop file gambar dari PC (Maks 5 MB)
                      </span>
                    </div>
                  )}
                </label>
                {uploadError && <p className="text-xs text-stamp-red font-mono">{uploadError}</p>}
              </div>
            ) : (
              /* Tab 2: Paste Image URL */
              <div className="space-y-1">
                <input
                  type="url"
                  value={coverUrl || ''}
                  onChange={(e) => setCoverUrl(e.target.value.trim() || null)}
                  placeholder="https://... (paste direct image URL e.g. .jpg, .png, .webp)"
                  className="w-full px-3 py-1.5 bg-card border border-rule rounded-md text-xs font-mono text-ink focus:outline-hidden"
                />
              </div>
            )}

            {/* Thumbnail Preview */}
            {coverUrl && (
              <div className="flex items-center gap-3 pt-1 border-t border-rule/50">
                <div className="w-12 h-12 rounded-md border border-rule overflow-hidden bg-card shrink-0">
                  <img
                    src={coverUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="min-w-0 text-xs font-mono">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Cover siap digunakan
                  </span>
                  <span className="text-ink-soft text-[11px] truncate block max-w-xs">{coverUrl}</span>
                </div>
              </div>
            )}
          </div>


          {/* Date Picker */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-ink-soft mb-1">
              Date Logged
            </label>
            <input
              type="date"
              value={loggedDate}
              onChange={(e) => setLoggedDate(e.target.value)}
              className="w-full px-3 py-2 bg-paper border border-rule rounded-md text-sm font-mono text-ink focus:outline-hidden"
            />
          </div>

          {/* DUAL-INPUT MODE: HOURS & MINUTES VS DECIMAL */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase tracking-wider text-ink-soft">
                Playtime Duration
              </label>
              <div className="flex items-center p-0.5 rounded-lg bg-paper border border-rule text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setInputMode('detailed')}
                  className={`px-2 py-1 rounded transition-all ${
                    inputMode === 'detailed'
                      ? 'bg-card text-ink font-semibold shadow-xs'
                      : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  Hours & Mins
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('decimal')}
                  className={`px-2 py-1 rounded transition-all ${
                    inputMode === 'decimal'
                      ? 'bg-card text-ink font-semibold shadow-xs'
                      : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  Direct Decimal
                </button>
              </div>
            </div>

            {/* Mode 1: Detailed Hours & Minutes */}
            {inputMode === 'detailed' && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-ink-soft font-mono mb-1">Hours (up to 10,000)</label>
                    <input
                      type="number"
                      min="0"
                      max="10000"
                      value={inputHours}
                      onChange={(e) => setInputHours(e.target.value)}
                      className="w-full px-3 py-2 bg-paper border border-rule rounded-md text-sm font-mono text-ink focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-ink-soft font-mono mb-1">
                      Minutes (0-59)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={inputMinutes}
                      onChange={(e) => setInputMinutes(e.target.value)}
                      className="w-full px-3 py-2 bg-paper border border-rule rounded-md text-sm font-mono text-ink focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Quick Minute & Hour Increments */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-ink-soft font-mono mr-1">Quick Add:</span>
                  {[15, 30, 45, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        const curM = parseInt(inputMinutes, 10) || 0;
                        const curH = parseInt(inputHours, 10) || 0;
                        const newTotal = curH * 60 + curM + m;
                        setInputHours(String(Math.floor(newTotal / 60)));
                        setInputMinutes(String(newTotal % 60));
                      }}
                      className="px-2 py-0.5 rounded bg-paper hover:bg-card border border-rule text-xs font-mono text-ink transition-colors"
                    >
                      +{m}m
                    </button>
                  ))}
                  {[5, 10, 50, 100].map((h) => (
                    <button
                      key={`h-${h}`}
                      type="button"
                      onClick={() => {
                        const curH = parseInt(inputHours, 10) || 0;
                        setInputHours(String(curH + h));
                      }}
                      className="px-2 py-0.5 rounded bg-paper hover:bg-card border border-rule text-xs font-mono text-ink transition-colors"
                    >
                      +{h}h
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setInputHours('0');
                      setInputMinutes('0');
                    }}
                    className="px-2 py-0.5 rounded bg-paper hover:bg-stamp-light text-stamp-red border border-rule text-xs font-mono ml-auto"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            {/* Mode 2: Direct Decimal */}
            {inputMode === 'decimal' && (
              <div className="space-y-2.5">
                <div>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    max="10000"
                    placeholder="e.g. 252.5"
                    value={decimalHours}
                    onChange={(e) => setDecimalHours(e.target.value)}
                    className="w-full px-3 py-2 bg-paper border border-rule rounded-md text-sm font-mono text-ink focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-ink-soft font-mono mr-1">Quick Add:</span>
                  {[0.5, 1.0, 5.0, 10.0, 50.0, 100.0].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => {
                        const normalized = String(decimalHours).replace(',', '.');
                        const cur = parseFloat(normalized) || 0;
                        setDecimalHours((cur + h).toFixed(2));
                      }}
                      className="px-2 py-0.5 rounded bg-paper hover:bg-card border border-rule text-xs font-mono text-ink transition-colors"
                    >
                      +{h}h
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDecimalHours('0.0')}
                    className="px-2 py-0.5 rounded bg-paper hover:bg-stamp-light text-stamp-red border border-rule text-xs font-mono ml-auto"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}


            {/* Calculated Output Indicator */}
            <div className="p-3 rounded-lg bg-ledger-light/60 border border-ledger-blue/20 flex items-center justify-between">
              <span className="text-xs font-mono text-ledger-blue flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" />
                Calculated Output Stored:
              </span>
              <span className="font-mono text-sm font-bold text-ledger-blue">
                {calculatedPreview.toFixed(2)} hrs ({formatHoursHuman(calculatedPreview)})
              </span>
            </div>
          </div>

          {/* Submit CTA */}
          <div className="flex justify-end gap-2 pt-3 border-t border-rule">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-mono text-ink-soft hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!gameName.trim()}
              className="px-4 py-2 bg-ledger-blue text-paper text-xs font-semibold rounded-lg hover:bg-ledger-hover disabled:opacity-40 transition-colors shadow-subtle"
            >
              Save Playtime Log
            </button>
          </div>
        </form>
      </Modal>

      {/* CHANGE COVER ARTWORK MODAL */}
      <Modal
        isOpen={isEditCoverModalOpen}
        onClose={() => setIsEditCoverModalOpen(false)}
        title={editingGame ? `Ganti Cover: ${editingGame.gameName}` : 'Ganti Cover Game'}
      >
        <form onSubmit={handleSaveEditCover} className="space-y-4">
          <div className="space-y-3 p-3 bg-paper border border-rule rounded-lg">
            {/* Mode Switcher */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-ledger-blue" />
                Pilih Sumber Cover
              </span>

              <div className="flex items-center p-0.5 rounded-md bg-card border border-rule text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setEditCoverTab('upload')}
                  className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 ${
                    editCoverTab === 'upload'
                      ? 'bg-ledger-blue text-paper font-semibold shadow-xs'
                      : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  Upload PC (Max 5MB)
                </button>
                <button
                  type="button"
                  onClick={() => setEditCoverTab('url')}
                  className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 ${
                    editCoverTab === 'url'
                      ? 'bg-ledger-blue text-paper font-semibold shadow-xs'
                      : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  <LinkIcon className="w-3 h-3" />
                  Paste URL
                </button>
              </div>
            </div>

            {/* Tab 1: Upload File PC */}
            {editCoverTab === 'upload' ? (
              <div className="space-y-2">
                <label className="block border-2 border-dashed border-rule hover:border-ledger-blue/70 rounded-lg p-4 text-center cursor-pointer transition-colors bg-card hover:bg-card/80">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, true);
                    }}
                  />
                  {editCoverUploading ? (
                    <div className="flex items-center justify-center gap-2 text-xs font-mono text-ledger-blue py-3">
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Mengunggah file ke komputer...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1.5 py-2 text-ink-soft">
                      <Upload className="w-6 h-6 text-ledger-blue mb-1" />
                      <span className="text-xs font-semibold text-ink">Klik untuk memilih gambar atau Drag & Drop</span>
                      <span className="text-[11px] font-mono text-ink-soft">Maksimal 5 MB (.jpg, .png, .webp, .gif)</span>
                    </div>
                  )}
                </label>
                {editCoverError && <p className="text-xs text-stamp-red font-mono">{editCoverError}</p>}
              </div>
            ) : (
              /* Tab 2: Paste Image URL */
              <div className="space-y-2">
                <label className="block text-[11px] font-mono text-ink-soft uppercase tracking-wider">
                  Direct Web Image Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={editCoverUrl}
                    onChange={(e) => setEditCoverUrl(e.target.value)}
                    placeholder="https://... (paste direct image URL)"
                    className="flex-1 px-3 py-2 bg-card border border-rule rounded-md text-xs font-mono text-ink focus:outline-hidden"
                  />
                  {editCoverUrl && (
                    <button
                      type="button"
                      onClick={() => setEditCoverUrl('')}
                      className="px-2.5 py-1 text-xs font-mono text-stamp-red hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Live Preview */}
            {editCoverUrl ? (
              <div className="space-y-1 pt-2 border-t border-rule/60">
                <span className="text-[11px] font-mono text-ink-soft">Pratinjau Cover Baru:</span>
                <div className="relative h-36 w-full rounded-lg overflow-hidden border border-rule bg-card">
                  <img
                    src={editCoverUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-xs font-mono text-ink-soft">
                Pilih file dari laptop atau masukkan link URL untuk melihat preview.
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-2 border-t border-rule">
            {editCoverUrl && (
              <button
                type="button"
                onClick={() => setEditCoverUrl('')}
                className="text-xs font-mono text-stamp-red hover:underline"
              >
                Hapus Cover
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setIsEditCoverModalOpen(false)}
                className="px-4 py-2 text-xs font-mono text-ink-soft hover:text-ink transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={editCoverSaving || editCoverUploading}
                className="px-4 py-2 bg-ledger-blue text-paper text-xs font-semibold rounded-lg hover:bg-ledger-hover disabled:opacity-40 transition-colors shadow-subtle flex items-center gap-1.5"
              >
                {editCoverSaving ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Simpan Cover</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Session Deletion */}
      <ConfirmDialog
        isOpen={sessionToDelete !== null}
        onClose={() => setSessionToDelete(null)}
        onConfirm={handleConfirmDeleteSession}
        title="Delete Gameplay Session?"
        description={
          sessionToDelete
            ? `Are you sure you want to remove this logged session for "${sessionToDelete.name}"? Total tracked library hours will update automatically.`
            : ''
        }
        confirmText="Delete Session"
        cancelText="Keep Session"
        variant="danger"
      />
    </div>
  );
};


