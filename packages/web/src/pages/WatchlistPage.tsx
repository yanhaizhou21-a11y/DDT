import React, { useEffect, useState } from 'react';
import type { WatchlistItem, TMDBSearchResult, RouteTab } from '../types';
import {
  fetchWatchlist,
  addWatchlistItem,
  updateWatchlistItem,
  deleteWatchlistItem,
  searchTmdb,
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
  CheckCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

interface WatchlistPageProps {
  onNavigate: (tab: RouteTab) => void;
}

export const WatchlistPage: React.FC<WatchlistPageProps> = ({ onNavigate }) => {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [activeTab, setActiveTab] = useState<'want' | 'watching' | 'watched'>('want');
  const [loading, setLoading] = useState(true);

  // Search Modal
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Manual Add Modal
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualReleaseDate, setManualReleaseDate] = useState('');
  const [manualMediaType, setManualMediaType] = useState<'movie' | 'tv'>('movie');
  const [manualStatus, setManualStatus] = useState<'want' | 'watching' | 'watched'>('want');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchWatchlist();
      setItems(res);
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
    } catch (err: any) {
      setSearchError(err.message || 'Search failed. Make sure your TMDB key is configured.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFromSearch = async (result: TMDBSearchResult, targetStatus: 'want' | 'watching' | 'watched') => {
    try {
      const newItem = await addWatchlistItem({
        title: result.title,
        tmdbId: result.tmdbId,
        posterPath: result.posterPath,
        status: targetStatus,
        releaseDate: result.releaseDate,
        mediaType: result.mediaType,
        overview: result.overview,
      });
      setItems((prev) => [newItem, ...prev]);
      setIsSearchOpen(false);
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
      });
      setItems((prev) => [newItem, ...prev]);
      setIsManualOpen(false);
      setManualTitle('');
      setManualReleaseDate('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'want' | 'watching' | 'watched') => {
    try {
      await updateWatchlistItem(id, { status: newStatus });
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWatchlistItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredItems = items.filter((item) => item.status === activeTab);
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <Header
        title="Watchlist"
        subtitle="Track movies & shows with TMDB release dates & theater badges"
      >
        <button
          onClick={() => setIsManualOpen(true)}
          className="px-3 py-1.5 bg-card border border-rule hover:border-ink-soft rounded text-xs font-mono text-ink transition-colors"
        >
          + Manual Entry
        </button>
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-ledger-blue text-paper rounded text-xs font-medium hover:bg-ledger-hover transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search TMDB</span>
        </button>
      </Header>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-rule pb-2">
        <button
          onClick={() => setActiveTab('want')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
            activeTab === 'want'
              ? 'bg-card border border-rule text-ledger-blue font-semibold'
              : 'text-ink-soft hover:text-ink'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Want to Watch ({items.filter((i) => i.status === 'want').length})</span>
        </button>
        <button
          onClick={() => setActiveTab('watching')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
            activeTab === 'watching'
              ? 'bg-card border border-rule text-ledger-blue font-semibold'
              : 'text-ink-soft hover:text-ink'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Watching ({items.filter((i) => i.status === 'watching').length})</span>
        </button>
        <button
          onClick={() => setActiveTab('watched')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
            activeTab === 'watched'
              ? 'bg-card border border-rule text-ledger-blue font-semibold'
              : 'text-ink-soft hover:text-ink'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Watched ({items.filter((i) => i.status === 'watched').length})</span>
        </button>
      </div>

      {/* Watchlist Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-ink-soft animate-pulse">
          Loading watchlist...
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Film}
          message={`No titles in "${activeTab === 'want' ? 'Want to Watch' : activeTab}".`}
          secondaryText="Search titles via TMDB or add custom movies/shows to your list."
          actionLabel="Search TMDB"
          onAction={() => setIsSearchOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isUpcoming = item.releaseDate && item.releaseDate >= todayStr;
            return (
              <div
                key={item.id}
                className="ledger-card p-4 flex gap-4 items-start relative group justify-between"
              >
                <div className="flex gap-3.5 overflow-hidden flex-1">
                  {item.posterPath ? (
                    <img
                      src={item.posterPath}
                      alt={item.title}
                      className="w-16 h-24 object-cover rounded-[3px] border border-rule flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-24 bg-paper border border-rule rounded-[3px] flex flex-col items-center justify-center text-xs text-ink-soft flex-shrink-0">
                      {item.mediaType === 'tv' ? <Tv className="w-5 h-5 mb-1" /> : <Film className="w-5 h-5 mb-1" />}
                      <span className="text-[10px] font-mono uppercase">{item.mediaType || 'Title'}</span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-ink leading-tight truncate">
                      {item.title}
                    </h3>
                    
                    {item.overview && (
                      <p className="text-xs text-ink-soft line-clamp-2 mt-1 font-sans">
                        {item.overview}
                      </p>
                    )}

                    {/* In theaters due badge */}
                    {isUpcoming && item.releaseDate && (
                      <div className="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 bg-stamp-light border border-stamp-red/40 text-stamp-red text-[10px] font-mono font-medium rounded-[2px]">
                        <Calendar className="w-3 h-3" />
                        <span>In theaters {item.releaseDate}</span>
                      </div>
                    )}

                    {/* Status change pill actions */}
                    <div className="flex items-center gap-1.5 mt-3">
                      {activeTab !== 'watching' && (
                        <button
                          onClick={() => handleStatusChange(item.id, 'watching')}
                          className="px-2 py-0.5 bg-paper border border-rule text-ink-soft hover:text-ink text-[10px] font-mono rounded"
                        >
                          Mark Watching
                        </button>
                      )}
                      {activeTab !== 'watched' && (
                        <button
                          onClick={() => handleStatusChange(item.id, 'watched')}
                          className="px-2 py-0.5 bg-paper border border-rule text-ink-soft hover:text-ink text-[10px] font-mono rounded"
                        >
                          Mark Watched
                        </button>
                      )}
                      {activeTab !== 'want' && (
                        <button
                          onClick={() => handleStatusChange(item.id, 'want')}
                          className="px-2 py-0.5 bg-paper border border-rule text-ink-soft hover:text-ink text-[10px] font-mono rounded"
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

      {/* TMDB Search Modal */}
      <Modal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} title="Search TMDB">
        <form onSubmit={handleSearchSubmit} className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search movie or TV title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 text-sm bg-paper border border-rule rounded-[3px] focus:bg-card focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-4 py-2 bg-ledger-blue text-paper text-xs font-medium rounded hover:bg-ledger-hover transition-colors disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {searchError && (
          <div className="p-3 bg-stamp-light border border-stamp-red/30 rounded text-xs text-stamp-red mb-3">
            {searchError}
          </div>
        )}

        <div className="space-y-3 max-h-[55vh] overflow-y-auto">
          {searchResults.map((result) => (
            <div
              key={result.tmdbId}
              className="p-3 bg-paper border border-rule rounded-[3px] flex gap-3 items-center justify-between"
            >
              <div className="flex gap-3 items-center overflow-hidden">
                {result.posterPath ? (
                  <img
                    src={result.posterPath}
                    alt={result.title}
                    className="w-10 h-14 object-cover rounded-[2px] border border-rule flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-14 bg-card border border-rule rounded-[2px] flex items-center justify-center text-xs flex-shrink-0">
                    🎬
                  </div>
                )}
                <div className="overflow-hidden">
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
                  onClick={() => handleAddFromSearch(result, 'want')}
                  className="px-2.5 py-1 bg-card border border-rule hover:border-ink-soft text-xs font-mono text-ink rounded"
                >
                  + Want
                </button>
                <button
                  onClick={() => handleAddFromSearch(result, 'watching')}
                  className="px-2.5 py-1 bg-ledger-blue text-paper text-xs font-medium rounded hover:bg-ledger-hover"
                >
                  + Watching
                </button>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Manual Entry Modal */}
      <Modal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} title="Manual Entry">
        <form onSubmit={handleManualAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Dune: Part Two"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded-[3px] focus:bg-card focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Type</label>
              <select
                value={manualMediaType}
                onChange={(e) => setManualMediaType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded-[3px] focus:bg-card focus:outline-none"
              >
                <option value="movie">Movie</option>
                <option value="tv">TV Show</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Initial Status</label>
              <select
                value={manualStatus}
                onChange={(e) => setManualStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded-[3px] focus:bg-card focus:outline-none"
              >
                <option value="want">Want to Watch</option>
                <option value="watching">Watching</option>
                <option value="watched">Watched</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Release Date (Optional)</label>
            <input
              type="date"
              value={manualReleaseDate}
              onChange={(e) => setManualReleaseDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded-[3px] focus:bg-card focus:outline-none font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-rule">
            <button
              type="button"
              onClick={() => setIsManualOpen(false)}
              className="px-3 py-1.5 text-xs text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-ledger-blue text-paper text-xs font-medium rounded hover:bg-ledger-hover"
            >
              Add Title
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
