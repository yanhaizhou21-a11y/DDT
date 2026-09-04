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
import { RichTextEditor } from '../components/RichTextEditor';
import { ConfirmDialog } from '../components/AlertDialog';
import { DatePicker } from '../components/DatePicker';
import {
  Calendar as CalendarIcon,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  Save,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { JournalTemplatesModal } from '../components/JournalTemplatesModal';

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
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const handleSelectTemplate = (templateContent: string, mode: 'replace' | 'append') => {
    if (mode === 'append' && content.trim()) {
      setContent((prev) => `${prev.trim()}\n\n---\n\n${templateContent}`);
    } else {
      setContent(templateContent);
    }
  };


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
      setSaveStatus('saved');
      const entry = await fetchJournalEntry(date);
      setContent(entry.content || '');
      setInitialContent(entry.content || '');
      if (entry.updatedAt) {
        setLastSavedTime(new Date(entry.updatedAt).toISOString());
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

  // Debounced Autosave (~1.2s after last keystroke)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (content === initialContent) return;

    setSaveStatus('saving');

    const timer = setTimeout(async () => {
      try {
        await saveJournalEntry(selectedDate, content);
        setInitialContent(content);
        setSaveStatus('saved');
        setLastSavedTime(new Date().toISOString());
        loadSidebarData();
      } catch (err) {
        console.error('Autosave failed', err);
        setSaveStatus('unsaved');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [content, selectedDate, initialContent]);

  const handleManualSave = async () => {
    try {
      setSaveStatus('saving');
      await saveJournalEntry(selectedDate, content);
      setInitialContent(content);
      setSaveStatus('saved');
      setLastSavedTime(new Date().toISOString());
      loadSidebarData();
    } catch (err) {
      console.error('Manual save failed', err);
      setSaveStatus('unsaved');
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteJournalEntry(selectedDate);
      setContent('');
      setInitialContent('');
      setSaveStatus('saved');
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
        subtitle="One page per day with formatting toolbar & markdown autosave"
        dotLedgerData={heatmapData}
        dotLedgerUnit="entries"
      >
        <div className="flex items-center gap-2">
          {selectedDate !== todayStr && (
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="px-3 py-1.5 bg-card border border-rule hover:border-ink-soft rounded-lg text-xs font-mono text-ink transition-colors shadow-subtle"
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
                  className="p-1 rounded-md hover:bg-paper text-ink-soft hover:text-ink transition-colors"
                  title="Previous day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => jumpDay(1)}
                  className="p-1 rounded-md hover:bg-paper text-ink-soft hover:text-ink transition-colors"
                  title="Next day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <DatePicker
              value={selectedDate}
              onChange={(str) => {
                if (str) setSelectedDate(str);
              }}
              aria-label="Select journal date"
            />
          </div>

          {/* Past Entries List */}
          <div className="ledger-card p-4">
            <h3 className="font-serif font-semibold text-sm text-ink pb-2 border-b border-rule mb-3 flex items-center justify-between">
              <span>Past Entries</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-paper text-ink-soft border border-rule/60">
                {entriesList.length}
              </span>
            </h3>

            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {entriesList.map((entry) => {
                const isSelected = entry.date === selectedDate;
                return (
                  <button
                    key={entry.date}
                    onClick={() => setSelectedDate(entry.date)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-paper border-ledger-blue text-ink shadow-subtle'
                        : 'bg-card border-rule/70 text-ink hover:border-ink-soft/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className="font-semibold">{entry.date}</span>
                      <span className="text-ink-soft">{entry.wordCount} words</span>
                    </div>
                    {entry.preview ? (
                      <p className="text-xs text-ink-soft line-clamp-2 font-sans leading-snug">{entry.preview}</p>
                    ) : (
                      <p className="text-xs text-ink-soft/50 italic">Empty entry</p>
                    )}
                  </button>
                );
              })}

              {entriesList.length === 0 && (
                <div className="py-8 text-center text-ink-soft">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-mono">No previous entries logged yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Area: Rich Text & Markdown Editor (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <h2 className="font-serif text-xl font-bold text-ink">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </h2>
              {selectedDate === todayStr && (
                <span className="px-2 py-0.5 bg-ledger-light text-ledger-blue font-mono text-[10px] font-bold rounded-full">
                  TODAY
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-paper border border-rule hover:border-ledger-blue rounded-lg text-xs font-semibold text-ledger-blue transition-all shadow-xs group"
                title="Choose a journal template"
              >
                <Sparkles className="w-3.5 h-3.5 text-gold group-hover:rotate-12 transition-transform" />
                <span>Templates</span>
              </button>

              {content && (
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-ink-soft hover:text-stamp-red rounded-md hover:bg-paper transition-colors"
                  title="Clear day's entry"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleManualSave}
                disabled={saveStatus === 'saving'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-ledger-blue text-paper text-xs font-semibold rounded-lg hover:bg-ledger-hover active:scale-95 disabled:opacity-50 transition-all shadow-subtle"
              >
                {saveStatus === 'saving' ? (
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                ) : saveStatus === 'saved' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save Journal'}</span>
              </button>
            </div>
          </div>

          <RichTextEditor
            value={content}
            onChange={setContent}
            onSave={handleManualSave}
            onOpenTemplates={() => setIsTemplateModalOpen(true)}
            saveStatus={saveStatus}
            lastSavedAt={lastSavedTime}
            placeholder="Write your thoughts, daily journal, achievements, ideas, or notes here..."
          />
        </div>
      </div>

      {/* Journal Templates Picker Modal */}
      <JournalTemplatesModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
        hasExistingContent={Boolean(content.trim())}
        selectedDate={selectedDate}
      />

      {/* Confirmation Dialog for Clearing Entry */}
      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Clear Journal Entry?"
        description={`Are you sure you want to delete your written journal entry for ${selectedDate}? This action cannot be undone.`}
        confirmText="Clear Entry"
        cancelText="Keep Entry"
        variant="danger"
      />
    </div>
  );
};


