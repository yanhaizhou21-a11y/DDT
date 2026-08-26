import React, { useEffect, useState } from 'react';
import type { WatchlistItem, TMDBSearchResult, RouteTab } from '../types';
import {
  fetchWatchlist,
  addWatchlistItem,
  updateWatchlistItem,
  deleteWatchlistItem,
  searchTmdb,
  fetchSettings,
} from '../api';
import { Header } from '../components/Header';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import {
  Film,
  Search,
  Plus,
  Trash2,
  Tv,
  Calendar,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  Clapperboard,
  Filter,
  ExternalLink,
  Tag,
  Key,
} from 'lucide-react';

interface WatchlistPageProps {
  onNavigate: (tab: RouteTab) => void;
}

// Curated popular title presets for quick-adding even without TMDB key
const CURATED_PRESETS = [
  {
    title: 'Dune: Part Two',
    mediaType: 'movie' as const,
    releaseDate: '2024-03-01',
    overview: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
    posterPath: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
  },
  {
    title: 'Oppenheimer',
    mediaType: 'movie' as const,
    releaseDate: '2023-07-21',
    overview: 'The story of J. Robert Oppenheimer’s role in the development of the atomic bomb during World War II.',
    posterPath: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
  },
  {
    title: 'Severance',
    mediaType: 'tv' as const,
    releaseDate: '2022-02-18',
    overview: 'Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives.',
    posterPath: 'https://image.tmdb.org/t/p/w500/AadFrb9gmUcr6n7hA3D3j9qQ7R6.jpg',
  },
  {
    title: 'Interstellar',
    mediaType: 'movie' as const,
    releaseDate: '2014-11-05',
    overview: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity’s survival.',
    posterPath: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
  },
];

export const WatchlistPage: React.FC<WatchlistPageProps> = ({ onNavigate }) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'want' | 'watching' | 'watched'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [localSearch, setLocalSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasTmdbKey, setHasTmdbKey] = useState(false);

  // Add Movie Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<'search' | 'manual'>('search');

  // TMDB search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Manual Movie Entry
  const [manualTitle, setManualTitle] = useState('');
  const [manualMediaType, setManualMediaType] = useState<'movie' | 'tv'>('movie');
  const [manualStatus, setManualStatus] = useState<'want' | 'watching' | 'watched'>('want');
  const [manualReleaseDate, setManualReleaseDate] = useState('');
  const [manualPosterUrl, setManualPosterUrl] = useState('');
  const [manualOverview, setManualOverview] = useState('');

  // Item Detail Modal
  const [selectedItem, setSelectedItem] = useState<WatchlistItem | null>(null);
  const [editPosterUrl, setEditPosterUrl] = useState('');
  const [savingPoster, setSavingPoster] = useState(false);


  const loadData = async () => {
    try {
      setLoading(true);
      const [listRes, settingsRes] = await Promise.allSettled([
        fetchWatchlist(),
        fetchSettings(),
      ]);

      if (listRes.status === 'fulfilled') {
        setItems(listRes.value);
      }
      if (settingsRes.status === 'fulfilled') {
        setHasTmdbKey(!!settingsRes.value.flags.hasTmdbKey);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      setIsSearching(true);
      setSearchError(null);
      const results = await searchTmdb(searchQuery.trim());
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError('No matching titles found on TMDB.');
      }
    } catch (err: any) {
      setSearchError(err.message || 'TMDB search error. You can add the title manually below or configure your TMDB key in Settings.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFromSearch = async (result: TMDBSearchResult | typeof CURATED_PRESETS[0], targetStatus: 'want' | 'watching' | 'watched') => {
    try {
      const newItem = await addWatchlistItem({
        title: result.title,
        tmdbId: (result as any).tmdbId || null,
        posterPath: result.posterPath,
        status: targetStatus,
        releaseDate: result.releaseDate,
        mediaType: result.mediaType,
        overview: result.overview,
      });
      setItems((prev) => [newItem, ...prev]);
      setIsAddModalOpen(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;
    try {
      const newItem = await addWatchlistItem({
        title: manualTitle.trim(),
        status: manualStatus,
        releaseDate: manualReleaseDate.trim() || null,
        mediaType: manualMediaType,
        posterPath: manualPosterUrl.trim() || null,
        overview: manualOverview.trim() || null,
      });
      setItems((prev) => [newItem, ...prev]);
      setIsAddModalOpen(false);
      setManualTitle('');
      setManualReleaseDate('');
      setManualPosterUrl('');
      setManualOverview('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'want' | 'watching' | 'watched') => {
    try {
      await updateWatchlistItem(id, { status: newStatus });
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item)));
      if (selectedItem?.id === id) {
        setSelectedItem((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectItem = (item: WatchlistItem) => {
    setSelectedItem(item);
    setEditPosterUrl(item.posterPath || '');
  };

  const handleSaveCustomPoster = async () => {
    if (!selectedItem) return;
    try {
      setSavingPoster(true);
      const newPath = editPosterUrl.trim() || null;
      await updateWatchlistItem(selectedItem.id, { posterPath: newPath });
      setItems((prev) =>
        prev.map((item) => (item.id === selectedItem.id ? { ...item, posterPath: newPath } : item))
      );
      setSelectedItem((prev) => (prev ? { ...prev, posterPath: newPath } : null));
    } catch (err) {
      console.error('Failed to update poster', err);
    } finally {
      setSavingPoster(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWatchlistItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (selectedItem?.id === id) setSelectedItem(null);
    } catch (err) {
      console.error(err);
    }
  };


  // Filter items
  const filteredItems = items.filter((item) => {
    if (activeTab !== 'all' && item.status !== activeTab) return false;
    if (typeFilter !== 'all' && item.mediaType !== typeFilter) return false;
    if (localSearch.trim()) {
      const q = localSearch.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.overview && item.overview.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const wantCount = items.filter((i) => i.status === 'want').length;
  const watchingCount = items.filter((i) => i.status === 'watching').length;
  const watchedCount = items.filter((i) => i.status === 'watched').length;

  return (
    <div className="space-y-6">
      <Header
        title="Watchlist & Cinema"
        subtitle="Track movies, TV series, theatrical release dates & watch progress"
      >
        <button
          onClick={() => {
            setAddMode('manual');
            setIsAddModalOpen(true);
          }}
          className="px-3 py-1.5 bg-card border border-rule hover:border-ink-soft rounded-[4px] text-xs font-mono text-ink active:scale-95 transition-all hidden sm:block"
        >
          + Manual Entry
        </button>
        <button
          onClick={() => {
            setAddMode(hasTmdbKey ? 'search' : 'manual');
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-ledger-blue text-paper rounded-[4px] text-xs font-medium hover:bg-ledger-hover active:scale-95 transition-all shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Movie / Show</span>
        </button>
      </Header>

      {/* Controls Bar: Search, Status Tabs & Type Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 border border-rule/70 bg-card p-1 rounded-[6px] overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 text-xs font-medium rounded-[4px] transition-all ${
              activeTab === 'all'
                ? 'bg-ledger-light text-ledger-blue font-semibold shadow-xs'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setActiveTab('want')}
            className={`px-3 py-1 text-xs font-medium rounded-[4px] transition-all flex items-center gap-1 ${
              activeTab === 'want'
                ? 'bg-ledger-light text-ledger-blue font-semibold shadow-xs'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Want to Watch ({wantCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('watching')}
            className={`px-3 py-1 text-xs font-medium rounded-[4px] transition-all flex items-center gap-1 ${
              activeTab === 'watching'
                ? 'bg-ledger-light text-ledger-blue font-semibold shadow-xs'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Watching ({watchingCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('watched')}
            className={`px-3 py-1 text-xs font-medium rounded-[4px] transition-all flex items-center gap-1 ${
              activeTab === 'watched'
                ? 'bg-ledger-light text-ledger-blue font-semibold shadow-xs'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Watched ({watchedCount})</span>
          </button>
        </div>

        {/* Filter by search query & media type */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              placeholder="Filter titles..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs bg-card border border-rule/80 rounded-[4px] text-ink focus:outline-none focus:border-ledger-blue font-sans"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-2.5 py-1 text-xs bg-card border border-rule/80 rounded-[4px] text-ink font-mono focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="movie">Movies</option>
            <option value="tv">TV Series</option>
          </select>
        </div>
      </div>

      {/* Watchlist Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs font-mono text-ink-soft animate-pulse">
          Reading watchlist entries...
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          message={localSearch ? 'No matching titles in your watchlist.' : 'No movies or shows in this view.'}
          secondaryText="Search and add movies from TMDB or create your own custom log."
          actionLabel="Add Movie or Series"
          onAction={() => {
            setAddMode(hasTmdbKey ? 'search' : 'manual');
            setIsAddModalOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isUpcoming = item.releaseDate && item.releaseDate >= todayStr;
            return (
              <div
                key={item.id}
                className="ledger-card p-4 flex gap-3.5 items-start relative group justify-between hover:border-ink-soft/70 transition-all"
              >
                <div className="flex gap-3 overflow-hidden flex-1">
                  {/* Poster Thumbnail */}
                  {item.posterPath ? (
                    <img
                      src={item.posterPath}
                      alt={item.title}
                      onClick={() => handleSelectItem(item)}
                      className="w-16 h-24 object-cover rounded-md border border-rule shrink-0 cursor-pointer shadow-xs hover:opacity-90 transition-opacity"
                    />
                  ) : (
                    <div
                      onClick={() => handleSelectItem(item)}
                      className="w-16 h-24 bg-paper/80 border border-rule rounded-md flex flex-col items-center justify-center text-xs text-ink-soft shrink-0 cursor-pointer hover:bg-paper"
                    >
                      {item.mediaType === 'tv' ? <Tv className="w-5 h-5 mb-1 text-ledger-blue" /> : <Film className="w-5 h-5 mb-1 text-ledger-blue" />}
                      <span className="text-[9px] font-mono uppercase tracking-wider text-ink-soft">
                        {item.mediaType || 'Title'}
                      </span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h3
                        onClick={() => handleSelectItem(item)}
                        className="text-sm font-semibold text-ink leading-tight truncate cursor-pointer hover:text-ledger-blue transition-colors"
                        title={item.title}
                      >
                        {item.title}
                      </h3>
                    </div>


                    <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-ink-soft">
                      <span className="uppercase font-semibold">{item.mediaType || 'Movie'}</span>
                      {item.releaseDate && <span>• {item.releaseDate.slice(0, 4)}</span>}
                    </div>

                    {item.overview && (
                      <p className="text-xs text-ink-soft line-clamp-2 mt-1 font-sans leading-snug">
                        {item.overview}
                      </p>
                    )}

                    {/* In theaters due badge */}
                    {isUpcoming && item.releaseDate && (
                      <div className="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 bg-stamp-light border border-stamp-red/40 text-stamp-red text-[10px] font-mono font-medium rounded-[3px]">
                        <Calendar className="w-3 h-3" />
                        <span>In theaters {item.releaseDate}</span>
                      </div>
                    )}

                    {/* Status change actions */}
                    <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                      {item.status !== 'watching' && (
                        <button
                          onClick={() => handleStatusChange(item.id, 'watching')}
                          className="px-2 py-0.5 bg-paper border border-rule text-ink-soft hover:text-ink hover:border-ink-soft text-[10px] font-mono rounded active:scale-95 transition-all"
                        >
                          + Watching
                        </button>
                      )}
                      {item.status !== 'watched' && (
                        <button
                          onClick={() => handleStatusChange(item.id, 'watched')}
                          className="px-2 py-0.5 bg-paper border border-rule text-ink-soft hover:text-ink hover:border-ink-soft text-[10px] font-mono rounded active:scale-95 transition-all"
                        >
                          ✓ Watched
                        </button>
                      )}
                      {item.status !== 'want' && (
                        <button
                          onClick={() => handleStatusChange(item.id, 'want')}
                          className="px-2 py-0.5 bg-paper border border-rule text-ink-soft hover:text-ink hover:border-ink-soft text-[10px] font-mono rounded active:scale-95 transition-all"
                        >
                          Move to Want
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1 text-ink-soft hover:text-stamp-red opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove from list"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Movie / Show Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Movie or Series"
        maxWidth="max-w-xl"
      >
        {/* Mode Switcher */}
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-rule/70">
          <button
            type="button"
            onClick={() => setAddMode('search')}
            className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-[4px] transition-all flex items-center justify-center gap-1.5 ${
              addMode === 'search'
                ? 'bg-ledger-blue text-paper font-semibold shadow-xs'
                : 'bg-paper text-ink-soft hover:text-ink border border-rule'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search TMDB Database</span>
          </button>
          <button
            type="button"
            onClick={() => setAddMode('manual')}
            className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-[4px] transition-all flex items-center justify-center gap-1.5 ${
              addMode === 'manual'
                ? 'bg-ledger-blue text-paper font-semibold shadow-xs'
                : 'bg-paper text-ink-soft hover:text-ink border border-rule'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manual Entry</span>
          </button>
        </div>

        {addMode === 'search' ? (
          <div>
            {!hasTmdbKey && (
              <div className="p-3 bg-gold-light border border-gold/40 rounded-[5px] text-xs text-ink mb-4 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">TMDB API Key Recommended</p>
                  <p className="text-ink-soft mt-0.5">
                    Add a free TMDB key in Settings to search millions of movie & TV posters. Or click quick presets below or switch to Manual Entry!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      onNavigate('settings');
                    }}
                    className="mt-1.5 text-[11px] font-mono text-ledger-blue font-semibold underline"
                  >
                    Open Settings →
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSearchSubmit} className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search movie or TV title (e.g. Dune, Inception, Breaking Bad)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-paper border border-rule rounded-[4px] focus:bg-card focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-2 bg-ledger-blue text-paper text-xs font-medium rounded-[4px] hover:bg-ledger-hover active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </form>

            {searchError && (
              <div className="p-3 bg-stamp-light border border-stamp-red/30 rounded text-xs text-stamp-red mb-4">
                {searchError}
              </div>
            )}

            {/* Search Results List */}
            {searchResults.length > 0 ? (
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {searchResults.map((result) => (
                  <div
                    key={result.tmdbId}
                    className="p-3 bg-paper border border-rule rounded-[4px] flex gap-3 items-center justify-between hover:border-ink-soft transition-colors"
                  >
                    <div className="flex gap-3 items-center overflow-hidden flex-1">
                      {result.posterPath ? (
                        <img
                          src={result.posterPath}
                          alt={result.title}
                          className="w-10 h-14 object-cover rounded-[3px] border border-rule flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-14 bg-card border border-rule rounded-[3px] flex items-center justify-center text-xs flex-shrink-0">
                          🎬
                        </div>
                      )}
                      <div className="overflow-hidden flex-1">
                        <div className="text-sm font-semibold text-ink truncate">{result.title}</div>
                        <div className="text-xs font-mono text-ink-soft">
                          {result.mediaType.toUpperCase()} {result.releaseDate ? `• ${result.releaseDate}` : ''}
                        </div>
                        {result.overview && (
                          <p className="text-[11px] text-ink-soft line-clamp-1 mt-0.5 font-sans">
                            {result.overview}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAddFromSearch(result, 'want')}
                        className="px-2.5 py-1 bg-card border border-rule hover:border-ink-soft text-xs font-mono text-ink rounded-[3px] active:scale-95 transition-all"
                      >
                        + Want
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddFromSearch(result, 'watching')}
                        className="px-2.5 py-1 bg-ledger-blue text-paper text-xs font-medium rounded-[3px] hover:bg-ledger-hover active:scale-95 transition-all"
                      >
                        + Watching
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <p className="text-xs font-mono text-ink-soft uppercase tracking-wider mb-2">
                  Popular Quick Suggestions
                </p>
                <div className="space-y-2">
                  {CURATED_PRESETS.map((preset) => (
                    <div
                      key={preset.title}
                      className="p-2.5 bg-paper border border-rule rounded-[4px] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <img
                          src={preset.posterPath}
                          alt={preset.title}
                          className="w-8 h-11 object-cover rounded-[2px] border border-rule flex-shrink-0"
                        />
                        <div className="overflow-hidden">
                          <span className="text-xs font-semibold text-ink block truncate">{preset.title}</span>
                          <span className="text-[10px] font-mono text-ink-soft">
                            {preset.mediaType.toUpperCase()} • {preset.releaseDate}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAddFromSearch(preset, 'want')}
                          className="px-2 py-1 bg-card border border-rule text-[11px] font-mono text-ink rounded hover:border-ink-soft active:scale-95"
                        >
                          + Want
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddFromSearch(preset, 'watching')}
                          className="px-2 py-1 bg-ledger-blue text-paper text-[11px] font-medium rounded hover:bg-ledger-hover active:scale-95"
                        >
                          + Watching
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Manual Movie Form */
          <form onSubmit={handleManualAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Gladiator II, Arcane, Breaking Bad"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded-[4px] focus:bg-card focus:outline-none"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Type</label>
                <select
                  value={manualMediaType}
                  onChange={(e) => setManualMediaType(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded-[4px] focus:bg-card focus:outline-none capitalize"
                >
                  <option value="movie">Movie</option>
                  <option value="tv">TV Series / Show</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Initial Status</label>
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded-[4px] focus:bg-card focus:outline-none"
                >
                  <option value="want">Want to Watch</option>
                  <option value="watching">Currently Watching</option>
                  <option value="watched">Watched / Finished</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Theatrical / Release Date (Optional)</label>
                <input
                  type="date"
                  value={manualReleaseDate}
                  onChange={(e) => setManualReleaseDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded-[4px] focus:bg-card focus:outline-none font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-ink">Poster Image URL (Optional)</label>
                  {manualPosterUrl && (
                    <button
                      type="button"
                      onClick={() => setManualPosterUrl('')}
                      className="text-[11px] font-mono text-stamp-red hover:underline"
                    >
                      Clear URL
                    </button>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  {manualPosterUrl ? (
                    <div className="w-9 h-12 rounded border border-rule overflow-hidden bg-card shrink-0 flex items-center justify-center">
                      <img
                        src={manualPosterUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : null}
                  <input
                    type="url"
                    placeholder="https://... (direct image URL)"
                    value={manualPosterUrl}
                    onChange={(e) => setManualPosterUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-paper border border-rule rounded-md focus:bg-card focus:outline-hidden font-mono"
                  />
                </div>
              </div>
            </div>


            <div>
              <label className="block text-xs font-medium text-ink mb-1">Synopsis / Personal Notes (Optional)</label>
              <textarea
                rows={2}
                placeholder="Log your thoughts, director notes, or synopsis..."
                value={manualOverview}
                onChange={(e) => setManualOverview(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded-[4px] focus:bg-card focus:outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-rule">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1.5 text-xs text-ink-soft hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-ledger-blue text-paper text-xs font-medium rounded-[4px] hover:bg-ledger-hover active:scale-95 transition-all"
              >
                Save to Watchlist
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Item Detail Modal */}
      {selectedItem && (
        <Modal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title={selectedItem.title}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <div className="flex gap-4">
              {selectedItem.posterPath ? (
                <img
                  src={selectedItem.posterPath}
                  alt={selectedItem.title}
                  className="w-24 h-36 object-cover rounded-[4px] border border-rule flex-shrink-0 shadow-sm"
                />
              ) : (
                <div className="w-24 h-36 bg-paper border border-rule rounded-[4px] flex items-center justify-center text-3xl flex-shrink-0">
                  🎬
                </div>
              )}

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-card border border-rule text-ink text-[11px] font-mono rounded uppercase">
                    {selectedItem.mediaType || 'Movie'}
                  </span>
                  <span className="px-2 py-0.5 bg-ledger-light text-ledger-blue text-[11px] font-mono rounded capitalize font-medium">
                    {selectedItem.status}
                  </span>
                </div>

                {selectedItem.releaseDate && (
                  <p className="text-xs font-mono text-ink-soft">
                    Release Date: <span className="text-ink font-semibold">{selectedItem.releaseDate}</span>
                  </p>
                )}

                {selectedItem.overview && (
                  <p className="text-xs text-ink leading-relaxed font-sans mt-2">
                    {selectedItem.overview}
                  </p>
                )}
              </div>
            </div>

            {/* Custom Poster Image URL Section */}
            <div className="p-3 bg-paper border border-rule rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-ink-soft uppercase tracking-wider">
                  Custom Poster Image URL (Direct Link)
                </span>
                {editPosterUrl && (
                  <button
                    type="button"
                    onClick={() => setEditPosterUrl('')}
                    className="text-[11px] font-mono text-stamp-red hover:underline"
                  >
                    Clear URL
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://... (paste direct image URL e.g. .jpg, .png, .webp)"
                  value={editPosterUrl}
                  onChange={(e) => setEditPosterUrl(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-card border border-rule rounded-md text-xs font-mono text-ink focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleSaveCustomPoster}
                  disabled={savingPoster}
                  className="px-3.5 py-1.5 bg-ledger-blue text-paper text-xs font-semibold rounded-md hover:bg-ledger-hover disabled:opacity-40 transition-colors shrink-0"
                >
                  {savingPoster ? 'Saving...' : 'Save Poster'}
                </button>
              </div>
            </div>

            {/* Quick Status Bar */}
            <div className="p-3 bg-paper border border-rule rounded-md flex items-center justify-between">
              <span className="text-xs font-mono text-ink-soft">Change Status:</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleStatusChange(selectedItem.id, 'want')}
                  className={`px-2.5 py-1 text-xs font-mono rounded border ${
                    selectedItem.status === 'want'
                      ? 'bg-ledger-blue text-paper border-ledger-blue font-semibold'
                      : 'bg-card border-rule text-ink hover:border-ink-soft'
                  }`}
                >
                  Want
                </button>
                <button
                  onClick={() => handleStatusChange(selectedItem.id, 'watching')}
                  className={`px-2.5 py-1 text-xs font-mono rounded border ${
                    selectedItem.status === 'watching'
                      ? 'bg-ledger-blue text-paper border-ledger-blue font-semibold'
                      : 'bg-card border-rule text-ink hover:border-ink-soft'
                  }`}
                >
                  Watching
                </button>
                <button
                  onClick={() => handleStatusChange(selectedItem.id, 'watched')}
                  className={`px-2.5 py-1 text-xs font-mono rounded border ${
                    selectedItem.status === 'watched'
                      ? 'bg-ledger-blue text-paper border-ledger-blue font-semibold'
                      : 'bg-card border-rule text-ink hover:border-ink-soft'
                  }`}
                >
                  Watched
                </button>
              </div>
            </div>


            <div className="flex justify-between items-center pt-2 border-t border-rule">
              <button
                type="button"
                onClick={() => handleDelete(selectedItem.id)}
                className="px-3 py-1.5 text-xs text-stamp-red hover:underline font-mono"
              >
                Delete Title
              </button>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-1.5 bg-card border border-rule text-ink text-xs rounded hover:border-ink-soft"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

