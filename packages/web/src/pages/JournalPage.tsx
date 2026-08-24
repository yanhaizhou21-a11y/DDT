import React, { useEffect, useState, useRef } from 'react';
import type { JournalSummary, RouteTab } from '../types';
import {
  fetchJournalList,
  fetchJournalEntry,
  saveJournalEntry,
  deleteJournalEntry,
  fetchJournalHeatmap,
} from '../api';
import { Header } from '../components/Header';
import { DotLedger } from '../components/DotLedger';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BookOpen,
  Calendar as CalendarIcon,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  Columns,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface JournalPageProps {
  onNavigate: (tab: RouteTab) => void;
}

export const JournalPage: React.FC<JournalPageProps> = () => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [content, setContent] = useState('');
  const [initialContent, setInitialContent] = useState('');
  const [entriesList, setEntriesList] = useState<JournalSummary[]>([]);
  const [heatmapData, setHeatmapData] = useState<{ date: string; value: number }[]>([]);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
  const [wordCount, setWordCount] = useState(0);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const isInitialMount = useRef(true);

  // Load heatmap and list
  const loadSidebarData = async () => {
    try {
      const [list, map] = await Promise.all([fetchJournalList(), fetchJournalHeatmap()]);
      setEntriesList(list);

      // Generate 30 days for DotLedger strip
      const days30: { date: string; value: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().slice(0, 10);
        days30.push({ date: dStr, value: map[dStr]?.hasEntry ? 1 : 0 });
      }
      setHeatmapData(days30);
    } catch (err) {
      console.error(err);
    }
  };

  // Load entry for selected date
  const loadDateEntry = async (date: string) => {
    try {
      setSaveStatus('idle');
      const entry = await fetchJournalEntry(date);
      setContent(entry.content || '');
      setInitialContent(entry.content || '');
      setWordCount(entry.wordCount || 0);
      if (entry.updatedAt) {
        setLastSavedTime(new Date(entry.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else {
        setLastSavedTime(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadSidebarData();
  }, []);

  useEffect(() => {
    loadDateEntry(selectedDate);
  }, [selectedDate]);

  // Debounced Autosave (~1.5s after last keystroke per PRD §2.4)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (content === initialContent) return;

    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    setWordCount(words);
    setSaveStatus('saving');

    const timer = setTimeout(async () => {
      try {
        await saveJournalEntry(selectedDate, content);
        setInitialContent(content);
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        loadSidebarData();
      } catch (err) {
        console.error('Autosave failed', err);
        setSaveStatus('error');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [content, selectedDate, initialContent]);

  const handleDeleteEntry = async () => {
    if (!confirm(`Delete entry for ${selectedDate}?`)) return;
    try {
      await deleteJournalEntry(selectedDate);
      setContent('');
      setInitialContent('');
      setWordCount(0);
      setSaveStatus('idle');
      setLastSavedTime(null);
      loadSidebarData();
    } catch (err) {
      console.error(err);
    }
  };

  // Quick jump previous / next day
  const jumpDay = (offset: number) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + offset);
    setSelectedDate(cur.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-6">
      <Header
        title="Daily Journal"
        subtitle="One page per day with markdown autosave"
        dotLedgerData={heatmapData}
        dotLedgerUnit="entries"
      >
        <div className="flex items-center gap-2">
          {selectedDate !== todayStr && (
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="px-2.5 py-1 bg-card border border-rule hover:border-ink-soft rounded text-xs font-mono text-ink transition-colors"
            >
              Jump to Today
            </button>
          )}
        </div>
      </Header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Calendar & Past Entries List (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Date Picker Card */}
          <div className="ledger-card p-4">
            <div className="flex items-center justify-between pb-3 border-b border-rule mb-3">
              <span className="font-serif font-semibold text-sm text-ink flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-ledger-blue" />
                Select Date
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => jumpDay(-1)}
                  className="p-1 rounded hover:bg-paper text-ink-soft hover:text-ink"
                  title="Previous day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => jumpDay(1)}
                  className="p-1 rounded hover:bg-paper text-ink-soft hover:text-ink"
                  title="Next day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 bg-paper border border-rule rounded-[3px] text-sm font-mono text-ink focus:bg-card focus:outline-none"
            />
          </div>

          {/* Past Entries List */}
          <div className="ledger-card p-4">
            <h3 className="font-serif font-semibold text-sm text-ink pb-2 border-b border-rule mb-3">
              Past Entries ({entriesList.length})
            </h3>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {entriesList.map((entry) => {
                const isSelected = entry.date === selectedDate;
                return (
                  <button
                    key={entry.date}
                    onClick={() => setSelectedDate(entry.date)}
                    className={`w-full text-left p-2.5 rounded-[3px] border transition-colors ${
                      isSelected
                        ? 'bg-paper border-ledger-blue text-ink'
                        : 'bg-card border-rule text-ink hover:border-ink-soft/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className="font-semibold">{entry.date}</span>
                      <span className="text-ink-soft">{entry.wordCount} words</span>
                    </div>
                    {entry.preview ? (
                      <p className="text-xs text-ink-soft line-clamp-1 font-sans">{entry.preview}</p>
                    ) : (
                      <p className="text-xs text-ink-soft/60 italic">Empty entry</p>
                    )}
                  </button>
                );
              })}

              {entriesList.length === 0 && (
                <p className="text-xs text-ink-soft font-mono py-4 text-center">
                  No previous entries logged yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Area: Main Journal Editor (8 cols) */}
        <div className="lg:col-span-8 ledger-card p-5 flex flex-col min-h-[580px]">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-rule mb-4 gap-2">
            <div className="flex items-center gap-3">
              <span className="font-serif text-lg font-bold text-ink">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              {selectedDate === todayStr && (
                <span className="px-2 py-0.5 bg-ledger-light text-ledger-blue font-mono text-[10px] font-semibold rounded">
                  TODAY
                </span>
              )}
            </div>

            {/* View toggles & status */}
            <div className="flex items-center gap-3 text-xs font-mono">
              {/* Save Indicator */}
              <div className="flex items-center gap-1.5">
                {saveStatus === 'saving' && (
                  <span className="text-ink-soft animate-pulse">Autosaving...</span>
                )}
                {saveStatus === 'saved' && (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
                {saveStatus === 'error' && (
                  <span className="text-stamp-red flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Not saved
                  </span>
                )}
                {saveStatus === 'idle' && lastSavedTime && (
                  <span className="text-ink-soft">Saved at {lastSavedTime}</span>
                )}
              </div>

              {/* Editor mode toggles */}
              <div className="flex items-center border border-rule rounded bg-paper p-0.5">
                <button
                  onClick={() => setViewMode('edit')}
                  className={`p-1 rounded ${viewMode === 'edit' ? 'bg-card text-ink shadow-none font-semibold' : 'text-ink-soft hover:text-ink'}`}
                  title="Edit Markdown"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={`p-1 rounded hidden sm:block ${viewMode === 'split' ? 'bg-card text-ink shadow-none font-semibold' : 'text-ink-soft hover:text-ink'}`}
                  title="Split View"
                >
                  <Columns className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={`p-1 rounded ${viewMode === 'preview' ? 'bg-card text-ink shadow-none font-semibold' : 'text-ink-soft hover:text-ink'}`}
                  title="Preview"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>

              {content && (
                <button
                  onClick={handleDeleteEntry}
                  className="p-1 text-ink-soft hover:text-stamp-red"
                  title="Clear day's entry"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Editor / Preview Body */}
          <div className="flex-1 flex gap-4 min-h-[420px]">
            {/* Markdown Text Area */}
            {(viewMode === 'edit' || viewMode === 'split') && (
              <div className={`flex-1 flex flex-col ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Record thoughts, achievements, tasks finished, or notes for this date..."
                  className="w-full flex-1 p-4 bg-paper border border-rule rounded-[3px] text-sm font-sans text-ink leading-relaxed resize-none focus:bg-card focus:outline-none"
                  autoFocus
                />
              </div>
            )}

            {/* Markdown Live Preview */}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <div
                className={`flex-1 p-4 bg-paper/60 border border-rule rounded-[3px] overflow-y-auto text-sm leading-relaxed prose prose-stone max-w-none ${
                  viewMode === 'split' ? 'w-1/2 hidden sm:block' : 'w-full'
                }`}
              >
                {content.trim() ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                ) : (
                  <p className="text-ink-soft/60 italic text-xs">Preview will appear here as you write markdown...</p>
                )}
              </div>
            )}
          </div>

          {/* Monospace Footer: Word Count + Date */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-rule text-xs font-mono text-ink-soft">
            <span>
              <span className="font-semibold text-ink">{wordCount}</span> words
            </span>
            <span>Autosaves ~1.5s after last keystroke</span>
          </div>
        </div>
      </div>
    </div>
  );
};
