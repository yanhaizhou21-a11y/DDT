import React, { useMemo, useState } from 'react';
import type { RouteTab, ChangeCategory, ChangeStatus, ChangePriority, LogChangeItem, ReleaseLog } from '../types';
import changesRawData from '../data/changes.json';
import { Header } from '../components/Header';
import { cn } from '../lib/utils';
import {
  Sparkles,
  Milestone,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Tag,
  History,
  Layers,
  ArrowRight,
  TrendingUp,
  GitCommit,
  Smartphone,
  Server,
  Zap,
  Shield,
  Palette,
  Check,
} from 'lucide-react';

interface LogsChangesPageProps {
  onNavigate: (tab: RouteTab) => void;
}

const statusBadgeStyles: Record<ChangeStatus, string> = {
  'Planned': 'bg-paper text-ink-soft border border-rule',
  'In Progress': 'bg-ledger-light text-ledger-blue border border-ledger-blue/30 font-semibold',
  'Under Review': 'bg-gold-light text-ink border border-gold/40',
  'Completed': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-500/30 font-semibold',
};

const priorityBadgeStyles: Record<ChangePriority, string> = {
  'high': 'text-stamp-red bg-stamp-light border border-stamp-red/30',
  'medium': 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-500/30',
  'low': 'text-ink-soft bg-paper border border-rule',
};

const categoryIcons: Record<ChangeCategory, React.ComponentType<{ className?: string }>> = {
  'core': Layers,
  'mobile': Smartphone,
  'ui': Palette,
  'sync': Server,
  'tracking': Clock,
  'performance': Zap,
};

const releaseTypeBadgeStyles: Record<string, string> = {
  'feat': 'bg-ledger-light text-ledger-blue border-ledger-blue/30',
  'fix': 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300',
  'perf': 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300',
  'ui': 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300',
  'refactor': 'bg-paper text-ink-soft border-rule',
};

export const LogsChangesPage: React.FC<LogsChangesPageProps> = ({ onNavigate }) => {
  const upcomingItems = (changesRawData.upcoming || []) as LogChangeItem[];
  const releaseLogs = (changesRawData.releases || []) as ReleaseLog[];

  const [activeView, setActiveView] = useState<'roadmap' | 'releases'>('roadmap');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // KPI counts
  const stats = useMemo(() => {
    const planned = upcomingItems.filter((i) => i.status === 'Planned').length;
    const inProgress = upcomingItems.filter((i) => i.status === 'In Progress').length;
    const underReview = upcomingItems.filter((i) => i.status === 'Under Review').length;
    const completed = upcomingItems.filter((i) => i.status === 'Completed').length;
    return { planned, inProgress, underReview, completed, total: upcomingItems.length };
  }, [upcomingItems]);

  // Filtered upcoming changes
  const filteredUpcoming = useMemo(() => {
    return upcomingItems.filter((item) => {
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchStatus = selectedStatus === 'all' || item.status === selectedStatus;
      const matchPriority = selectedPriority === 'all' || item.priority === selectedPriority;

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.milestone.toLowerCase().includes(q) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(q)));

      return matchCategory && matchStatus && matchPriority && matchSearch;
    });
  }, [upcomingItems, selectedCategory, selectedStatus, selectedPriority, searchQuery]);

  // Group filtered items by milestone
  const milestoneGroups = useMemo(() => {
    const groups: Record<string, LogChangeItem[]> = {};
    for (const item of filteredUpcoming) {
      if (!groups[item.milestone]) {
        groups[item.milestone] = [];
      }
      groups[item.milestone].push(item);
    }
    return groups;
  }, [filteredUpcoming]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Header
        title="Logs Changes"
        subtitle="Track upcoming feature roadmaps, milestone progress, and release version history."
      >
        <div className="flex items-center gap-1.5 bg-paper p-1 rounded-lg border border-rule text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveView('roadmap')}
            className={cn(
              'px-3 py-1.5 rounded-md transition-all font-medium flex items-center gap-1.5',
              'focus-visible:ring-2 focus-visible:ring-ledger-blue focus-visible:outline-hidden',
              activeView === 'roadmap'
                ? 'bg-card text-ledger-blue font-bold shadow-xs border border-rule'
                : 'text-ink-soft hover:text-ink'
            )}
            aria-pressed={activeView === 'roadmap'}
          >
            <Milestone className="w-3.5 h-3.5" />
            <span>Upcoming Roadmap</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('releases')}
            className={cn(
              'px-3 py-1.5 rounded-md transition-all font-medium flex items-center gap-1.5',
              'focus-visible:ring-2 focus-visible:ring-ledger-blue focus-visible:outline-hidden',
              activeView === 'releases'
                ? 'bg-card text-ledger-blue font-bold shadow-xs border border-rule'
                : 'text-ink-soft hover:text-ink'
            )}
            aria-pressed={activeView === 'releases'}
          >
            <History className="w-3.5 h-3.5" />
            <span>Version History ({releaseLogs.length})</span>
          </button>
        </div>
      </Header>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="ledger-card p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-[11px] font-mono uppercase tracking-wider">In Progress</span>
            <Sparkles className="w-4 h-4 text-ledger-blue" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold text-ink">{stats.inProgress}</span>
            <span className="text-[10px] font-mono text-ink-soft">active features</span>
          </div>
        </div>

        <div className="ledger-card p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-[11px] font-mono uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold text-ink">{stats.completed}</span>
            <span className="text-[10px] font-mono text-ink-soft">shipped items</span>
          </div>
        </div>

        <div className="ledger-card p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-[11px] font-mono uppercase tracking-wider">Under Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold text-ink">{stats.underReview}</span>
            <span className="text-[10px] font-mono text-ink-soft">validation stage</span>
          </div>
        </div>

        <div className="ledger-card p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-[11px] font-mono uppercase tracking-wider">Planned</span>
            <TrendingUp className="w-4 h-4 text-ink-soft" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold text-ink">{stats.planned}</span>
            <span className="text-[10px] font-mono text-ink-soft">in pipeline</span>
          </div>
        </div>
      </div>

      {/* ROADMAP VIEW */}
      {activeView === 'roadmap' && (
        <div className="space-y-6">
          {/* Search and Filters Bar */}
          <div className="ledger-card p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type="text"
                  placeholder="Search roadmap features, tags, milestones..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-paper border border-rule rounded-md focus:bg-card focus:outline-hidden focus:ring-1 focus:ring-ledger-blue font-mono"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  aria-label="Filter by Category"
                  className="px-2.5 py-2 bg-paper border border-rule rounded-md text-xs font-mono text-ink focus:outline-hidden focus:ring-1 focus:ring-ledger-blue"
                >
                  <option value="all">All Categories</option>
                  <option value="core">Core System</option>
                  <option value="mobile">Mobile (.apk)</option>
                  <option value="ui">UI & Dock</option>
                  <option value="sync">Sync & Network</option>
                  <option value="tracking">Tracking</option>
                  <option value="performance">Performance</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  aria-label="Filter by Status"
                  className="px-2.5 py-2 bg-paper border border-rule rounded-md text-xs font-mono text-ink focus:outline-hidden focus:ring-1 focus:ring-ledger-blue"
                >
                  <option value="all">All Statuses</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Planned">Planned</option>
                  <option value="Completed">Completed</option>
                </select>

                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  aria-label="Filter by Priority"
                  className="px-2.5 py-2 bg-paper border border-rule rounded-md text-xs font-mono text-ink focus:outline-hidden focus:ring-1 focus:ring-ledger-blue"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
            </div>
          </div>

          {/* Grouped Milestones */}
          {Object.keys(milestoneGroups).length === 0 ? (
            <div className="ledger-card p-12 text-center text-ink-soft">
              <Milestone className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-serif text-base text-ink">No matching roadmap items found</p>
              <p className="text-xs font-mono mt-1">Try clearing or adjusting your search filters.</p>
            </div>
          ) : (
            Object.entries(milestoneGroups).map(([milestone, items]) => {
              const completedInMilestone = items.filter((i) => i.status === 'Completed').length;
              const percent = Math.round((completedInMilestone / items.length) * 100);

              return (
                <div key={milestone} className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-rule">
                    <div className="flex items-center gap-2">
                      <Milestone className="w-4 h-4 text-ledger-blue" />
                      <h2 className="font-serif text-lg font-semibold text-ink">{milestone}</h2>
                      <span className="text-[11px] font-mono text-ink-soft">
                        ({items.length} {items.length === 1 ? 'item' : 'items'})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 sm:w-48">
                      <div className="flex-1 bg-paper h-2 rounded-full border border-rule overflow-hidden">
                        <div
                          className="bg-ledger-blue h-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-ink-soft w-9 text-right font-medium">
                        {percent}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map((item) => {
                      const CategoryIcon = categoryIcons[item.category] || Layers;

                      return (
                        <div
                          key={item.id}
                          className="ledger-card p-4 space-y-3 flex flex-col justify-between hover:border-rule-light transition-colors"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={cn(
                                    'px-2 py-0.5 rounded-full text-[10px] font-mono',
                                    statusBadgeStyles[item.status]
                                  )}
                                >
                                  {item.status}
                                </span>
                                <span
                                  className={cn(
                                    'px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider',
                                    priorityBadgeStyles[item.priority]
                                  )}
                                >
                                  {item.priority}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 text-ink-soft text-[11px] font-mono">
                                <CategoryIcon className="w-3.5 h-3.5" />
                                <span className="capitalize">{item.category}</span>
                              </div>
                            </div>

                            <h3 className="font-serif text-sm font-semibold text-ink leading-snug">
                              {item.title}
                            </h3>
                            <p className="text-xs text-ink-soft leading-relaxed">
                              {item.description}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-rule/60 flex items-center justify-between gap-2 text-[10px] font-mono text-ink-soft flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.tags?.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.5 rounded bg-paper border border-rule/70 text-ink-soft"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>

                            {typeof item.progress === 'number' && (
                              <span className="font-medium text-ledger-blue">
                                {item.progress}% progress
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* RELEASES CHANGELOG VIEW */}
      {activeView === 'releases' && (
        <div className="space-y-6">
          {releaseLogs.map((release) => (
            <div key={release.version} className="ledger-card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-rule">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-md bg-ledger-light text-ledger-blue font-mono font-bold text-xs border border-ledger-blue/20">
                    {release.version}
                  </span>
                  <h2 className="font-serif text-lg font-semibold text-ink">{release.title}</h2>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-ink-soft">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{release.date}</span>
                </div>
              </div>

              {/* Highlights */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono uppercase tracking-wider text-ink-soft font-semibold">
                  Key Highlights
                </h4>
                <ul className="space-y-1.5 text-xs text-ink">
                  {release.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-ledger-blue font-bold select-none shrink-0">•</span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Detailed Changes */}
              <div className="space-y-2 pt-2 border-t border-rule/60">
                <h4 className="text-xs font-mono uppercase tracking-wider text-ink-soft font-semibold">
                  Detailed Changes
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {release.changes.map((change, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-md bg-paper border border-rule/70 flex items-start gap-2 text-xs"
                    >
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold shrink-0 border',
                          releaseTypeBadgeStyles[change.type] || 'bg-paper text-ink border-rule'
                        )}
                      >
                        {change.type}
                      </span>
                      <span className="text-ink text-[11px] leading-tight">
                        {change.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
