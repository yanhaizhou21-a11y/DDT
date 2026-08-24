import React, { useEffect, useState } from 'react';
import type { GithubContributionsResponse, GithubRepo, RouteTab } from '../types';
import { fetchGithubContributions, fetchGithubRepos, refreshGithubCache } from '../api';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import {
  RotateCw,
  GitCommit,
  GitFork,
  Star,
  ExternalLink,
  Lock,
  GitBranch,
  Calendar,
} from 'lucide-react';

interface DevPageProps {
  onNavigate: (tab: RouteTab) => void;
}

export const DevPage: React.FC<DevPageProps> = ({ onNavigate }) => {
  const [contributions, setContributions] = useState<GithubContributionsResponse | null>(null);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfigured, setUnconfigured] = useState(false);

  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  const loadData = async (force = false) => {
    try {
      if (force) setRefreshing(true);
      else setLoading(true);
      setError(null);
      setUnconfigured(false);

      const [contribRes, reposRes] = await Promise.allSettled([
        fetchGithubContributions(force),
        fetchGithubRepos(force),
      ]);

      if (contribRes.status === 'fulfilled') {
        setContributions(contribRes.value);
      } else {
        const msg = contribRes.reason?.message || '';
        if (msg.includes('not configured') || msg.includes('unconfigured')) {
          setUnconfigured(true);
        } else {
          setError(msg);
        }
      }

      if (reposRes.status === 'fulfilled') {
        setRepos(reposRes.value.repos || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load GitHub data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refreshGithubCache();
      await loadData(true);
    } catch (err: any) {
      setError(err.message || 'Refresh failed');
      setRefreshing(false);
    }
  };

  const getHeatmapColorClass = (count: number) => {
    if (count === 0) return 'bg-rule/40';
    if (count <= 2) return 'bg-ledger-blue/30';
    if (count <= 5) return 'bg-ledger-blue/60';
    if (count <= 9) return 'bg-ledger-blue/85';
    return 'bg-ledger-blue';
  };

  return (
    <div className="space-y-6">
      <Header
        title="Dev Tracker"
        subtitle="12-month GitHub contributions & recent repository commit log"
      >
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-rule hover:border-ink-soft rounded text-xs font-mono text-ink transition-colors disabled:opacity-50"
          title="Force refresh GitHub data"
        >
          <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Fetching...' : 'Refresh'}</span>
        </button>
      </Header>

      {unconfigured ? (
        <EmptyState
          icon={GitCommit}
          message="GitHub integration not configured."
          secondaryText="Add a Personal Access Token with repo read and read:user scopes in Settings to populate your contribution heatmap."
          actionLabel="Connect GitHub"
          onAction={() => onNavigate('settings')}
        />
      ) : error ? (
        <div className="ledger-card p-6 text-center">
          <p className="text-stamp-red text-sm font-medium mb-3">{error}</p>
          <button
            onClick={() => onNavigate('settings')}
            className="px-3 py-1.5 bg-ledger-blue text-paper text-xs font-medium rounded hover:bg-ledger-hover"
          >
            Check GitHub Token in Settings
          </button>
        </div>
      ) : loading && !contributions ? (
        <div className="py-16 text-center text-ink-soft font-mono text-xs animate-pulse">
          Querying GitHub GraphQL contributions...
        </div>
      ) : (
        <>
          {/* Contribution Heatmap Card */}
          {contributions && (
            <div className="ledger-card p-5 overflow-x-auto">
              <div className="flex items-center justify-between pb-4 border-b border-rule mb-4">
                <div className="flex items-center gap-3">
                  {contributions.user.avatarUrl && (
                    <img
                      src={contributions.user.avatarUrl}
                      alt={contributions.user.login}
                      className="w-8 h-8 rounded-full border border-rule"
                    />
                  )}
                  <div>
                    <h2 className="font-serif text-base font-semibold text-ink">
                      {contributions.user.name || contributions.user.login}
                    </h2>
                    <span className="text-xs font-mono text-ink-soft">@{contributions.user.login}</span>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-lg font-bold text-ink">{contributions.totalContributions}</div>
                  <div className="text-[11px] text-ink-soft uppercase tracking-wider">
                    Contributions in the last year
                  </div>
                </div>
              </div>

              {/* Heatmap Grid (52 weeks) */}
              <div className="relative min-w-[760px] pb-2">
                <div className="flex gap-[3px]">
                  {contributions.weeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-[3px]">
                      {week.contributionDays.map((day) => (
                        <div
                          key={day.date}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredDay({
                              date: day.date,
                              count: day.contributionCount,
                              x: rect.left + rect.width / 2,
                              y: rect.top - 6,
                            });
                          }}
                          onMouseLeave={() => setHoveredDay(null)}
                          className={`w-[11px] h-[11px] rounded-[2px] cursor-pointer transition-colors duration-100 ${getHeatmapColorClass(
                            day.contributionCount
                          )} hover:ring-1 hover:ring-ink`}
                        />
                      ))}
                    </div>
                  ))}
                </div>

                {/* Monospace Tooltip */}
                {hoveredDay && (
                  <div
                    className="fixed z-50 transform -translate-x-1/2 -translate-y-full px-2.5 py-1 bg-card border border-rule text-ink text-xs font-mono rounded-[3px] pointer-events-none whitespace-nowrap shadow-none"
                    style={{ left: hoveredDay.x, top: hoveredDay.y }}
                  >
                    <span className="font-semibold">{hoveredDay.count}</span>{' '}
                    {hoveredDay.count === 1 ? 'contribution' : 'contributions'} on {hoveredDay.date}
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between pt-3 border-t border-rule/60 text-[11px] font-mono text-ink-soft">
                <span>Last updated: {new Date(contributions.fetchedAt).toLocaleTimeString()}</span>
                <div className="flex items-center gap-1.5">
                  <span>Less</span>
                  <div className="w-2.5 h-2.5 bg-rule/40 rounded-[2px]" />
                  <div className="w-2.5 h-2.5 bg-ledger-blue/30 rounded-[2px]" />
                  <div className="w-2.5 h-2.5 bg-ledger-blue/60 rounded-[2px]" />
                  <div className="w-2.5 h-2.5 bg-ledger-blue/85 rounded-[2px]" />
                  <div className="w-2.5 h-2.5 bg-ledger-blue rounded-[2px]" />
                  <span>More</span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Repositories Grid */}
          <div>
            <h2 className="font-serif text-lg font-semibold text-ink mb-3">Recent Repositories</h2>
            {repos.length === 0 ? (
              <p className="text-xs text-ink-soft font-mono">No repository activity found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {repos.map((repo) => (
                  <div key={repo.id} className="ledger-card p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <a
                          href={repo.htmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-sm text-ink hover:text-ledger-blue flex items-center gap-1.5 truncate"
                        >
                          <span className="truncate">{repo.name}</span>
                          <ExternalLink className="w-3 h-3 text-ink-soft flex-shrink-0" />
                        </a>
                        <div className="flex items-center gap-2 flex-shrink-0 text-xs font-mono text-ink-soft">
                          {repo.private && (
                            <span title="Private">
                              <Lock className="w-3 h-3 text-ink-soft" />
                            </span>
                          )}
                          {repo.stargazersCount > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Star className="w-3 h-3" /> {repo.stargazersCount}
                            </span>
                          )}
                        </div>
                      </div>

                      {repo.description && (
                        <p className="text-xs text-ink-soft mt-1.5 line-clamp-2">{repo.description}</p>
                      )}

                      {/* Last Commit details */}
                      {repo.lastCommit && (
                        <div className="mt-3 p-2.5 bg-paper rounded-[3px] border border-rule text-xs font-mono">
                          <div className="flex items-center gap-1.5 text-ink-soft text-[11px] mb-1">
                            <GitBranch className="w-3 h-3" />
                            <span>{repo.lastCommit.sha}</span>
                            <span>•</span>
                            <span className="truncate">{repo.lastCommit.author}</span>
                          </div>
                          <p className="text-ink text-xs line-clamp-1 font-sans">
                            {repo.lastCommit.message}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-rule/60 text-[11px] font-mono text-ink-soft">
                      <span>{repo.language || 'Code'}</span>
                      <span>Pushed {new Date(repo.pushedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
