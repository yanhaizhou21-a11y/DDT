import React, { useEffect, useState } from 'react';
import type { GithubRepo, GithubBranch } from '../types';
import { fetchGithubRepos, fetchRepoBranches } from '../api';
import {
  GitBranch,
  Lock,
  GitCommit,
  ExternalLink,
  RotateCw,
  FolderGit2,
  Check,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface DashboardGithubBranchWidgetProps {
  className?: string;
  onNavigateDev?: () => void;
  onNavigateProjects?: () => void;
}

export const DashboardGithubBranchWidget: React.FC<DashboardGithubBranchWidgetProps> = ({
  className,
  onNavigateDev,
  onNavigateProjects,
}) => {
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState<string>(() => {
    return localStorage.getItem('ddt-selected-contrib-repo') || '';
  });

  const [branches, setBranches] = useState<GithubBranch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>(() => {
    return localStorage.getItem('ddt-selected-contrib-branch') || '';
  });

  const [lastCommitInfo, setLastCommitInfo] = useState<{
    sha?: string;
    message?: string;
    author?: string;
    date?: string;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Load repositories on mount
  useEffect(() => {
    let mounted = true;
    setLoadingRepos(true);
    fetchGithubRepos()
      .then((res) => {
        if (!mounted) return;
        const repoList = res.repos || [];
        setRepos(repoList);
        // Default to first repo or previously saved repo
        if (repoList.length > 0) {
          const matched = repoList.find((r) => r.fullName === selectedRepo);
          const activeRepo = matched ? matched.fullName : repoList[0].fullName;
          setSelectedRepo(activeRepo);
          localStorage.setItem('ddt-selected-contrib-repo', activeRepo);
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Failed to load GitHub repositories');
      })
      .finally(() => {
        if (mounted) setLoadingRepos(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // When selected repo changes, load its branches
  useEffect(() => {
    if (!selectedRepo || !selectedRepo.includes('/')) {
      setBranches([]);
      return;
    }

    let mounted = true;
    setLoadingBranches(true);
    setError(null);

    const [owner, repo] = selectedRepo.split('/');
    fetchRepoBranches(owner, repo)
      .then((res) => {
        if (!mounted) return;
        const branchList = res.branches || [];
        setBranches(branchList);

        // Pick branch: stored branch or default branch
        const found = branchList.find((b) => b.name === selectedBranch);
        const targetBranch = found ? found.name : res.defaultBranch || (branchList[0]?.name ?? 'main');
        setSelectedBranch(targetBranch);
        localStorage.setItem('ddt-selected-contrib-branch', targetBranch);

        // Update commit info from selected branch if available
        const currentBranchObj = branchList.find((b) => b.name === targetBranch);
        if (currentBranchObj?.commitSha) {
          const currentRepoObj = repos.find((r) => r.fullName === selectedRepo);
          setLastCommitInfo({
            sha: currentBranchObj.commitSha,
            message: currentRepoObj?.lastCommit?.message || 'Latest commit on branch',
            author: currentRepoObj?.lastCommit?.author || 'Contributor',
            date: currentRepoObj?.lastCommit?.date || currentRepoObj?.pushedAt,
          });
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Failed to load branches for repository');
      })
      .finally(() => {
        if (mounted) setLoadingBranches(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedRepo, repos]);

  const handleRepoChange = (newRepo: string) => {
    setSelectedRepo(newRepo);
    setSelectedBranch('');
    localStorage.setItem('ddt-selected-contrib-repo', newRepo);
  };

  const handleBranchChange = (newBranch: string) => {
    setSelectedBranch(newBranch);
    localStorage.setItem('ddt-selected-contrib-branch', newBranch);

    const currentBranchObj = branches.find((b) => b.name === newBranch);
    if (currentBranchObj?.commitSha) {
      const currentRepoObj = repos.find((r) => r.fullName === selectedRepo);
      setLastCommitInfo({
        sha: currentBranchObj.commitSha,
        message: currentRepoObj?.lastCommit?.message || 'Branch tip commit',
        author: currentRepoObj?.lastCommit?.author || 'Contributor',
        date: currentRepoObj?.lastCommit?.date || currentRepoObj?.pushedAt,
      });
    }
  };

  const handleRefresh = async () => {
    if (!selectedRepo || !selectedRepo.includes('/')) return;
    try {
      setLoadingBranches(true);
      const [owner, repo] = selectedRepo.split('/');
      const res = await fetchRepoBranches(owner, repo, true);
      setBranches(res.branches || []);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh branches');
    } finally {
      setLoadingBranches(false);
    }
  };

  const currentRepoObj = repos.find((r) => r.fullName === selectedRepo);
  const currentBranchObj = branches.find((b) => b.name === selectedBranch);

  return (
    <div className={cn('ledger-card p-5 flex flex-col justify-between group transition-all', className)}>
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between pb-3 border-b border-rule/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-paper flex items-center justify-center text-ledger-blue border border-rule/60">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-base font-bold text-ink">Active Branch Contribution</h3>
                {currentRepoObj?.private && (
                  <span className="flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Lock className="w-2.5 h-2.5" /> Private Repo
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ink-soft font-mono">
                Select public or private repositories and track working branches
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loadingBranches || !selectedRepo}
              className="p-1.5 rounded border border-rule/70 bg-paper/60 hover:bg-paper text-ink-soft hover:text-ink transition-colors disabled:opacity-40"
              title="Refresh branches from GitHub"
              aria-label="Refresh branches"
            >
              <RotateCw className={cn('w-3.5 h-3.5', loadingBranches && 'animate-spin')} />
            </button>
            {onNavigateDev && (
              <button
                type="button"
                onClick={onNavigateDev}
                className="text-xs font-semibold text-ledger-blue hover:underline flex items-center gap-1 ml-1"
              >
                Dev Tracker <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Selection Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
          {/* Repository Selector */}
          <div>
            <label className="block text-[11px] font-mono text-ink-soft uppercase tracking-wider mb-1.5">
              Repository
            </label>
            <div className="relative">
              <select
                value={selectedRepo}
                onChange={(e) => handleRepoChange(e.target.value)}
                disabled={loadingRepos || repos.length === 0}
                className="w-full px-2.5 py-2 bg-paper/80 border border-rule rounded text-xs font-mono text-ink focus:outline-none focus:ring-2 focus:ring-ledger-blue pr-8 truncate"
              >
                {repos.length === 0 ? (
                  <option value="">{loadingRepos ? 'Loading repos...' : 'No repos connected'}</option>
                ) : (
                  repos.map((r) => (
                    <option key={r.id} value={r.fullName}>
                      {r.fullName} {r.private ? '🔒' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Branch Selector */}
          <div>
            <label className="block text-[11px] font-mono text-ink-soft uppercase tracking-wider mb-1.5">
              Working Branch
            </label>
            <div className="relative">
              <select
                value={selectedBranch}
                onChange={(e) => handleBranchChange(e.target.value)}
                disabled={loadingBranches || branches.length === 0}
                className="w-full px-2.5 py-2 bg-paper/80 border border-rule rounded text-xs font-mono text-ink focus:outline-none focus:ring-2 focus:ring-ledger-blue pr-8 truncate"
              >
                {branches.length === 0 ? (
                  <option value="">{loadingBranches ? 'Fetching branches...' : 'No branches found'}</option>
                ) : (
                  branches.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name} {b.isDefault ? '★ (default)' : ''} {b.isProtected ? '🛡️' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Branch Live Status Banner */}
        {selectedBranch && (
          <div className="mt-3 p-3 rounded-lg bg-paper/70 border border-rule/70 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-ink flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-ledger-blue" />
                  {selectedBranch}
                </span>
                {currentBranchObj?.isDefault && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-card text-ink-soft border border-rule">
                    Default
                  </span>
                )}
                {currentBranchObj?.isProtected && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Protected
                  </span>
                )}
              </div>

              {currentRepoObj && (
                <a
                  href={`https://github.com/${currentRepoObj.fullName}/tree/${encodeURIComponent(selectedBranch)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-mono text-ledger-blue hover:underline flex items-center gap-1"
                >
                  View on GitHub <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Latest Commit on Branch */}
            {lastCommitInfo && (
              <div className="pt-2 border-t border-rule/50 flex items-start gap-2 text-xs font-mono">
                <GitCommit className="w-3.5 h-3.5 text-ledger-blue mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-ink-soft text-[11px]">
                    <span className="font-semibold text-ink">{lastCommitInfo.sha || 'latest'}</span>
                    <span>•</span>
                    <span className="truncate">{lastCommitInfo.author}</span>
                    {lastCommitInfo.date && (
                      <>
                        <span>•</span>
                        <span>{new Date(lastCommitInfo.date).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                  <p className="text-ink text-xs line-clamp-1 font-sans mt-0.5">
                    {lastCommitInfo.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-2 text-xs text-stamp-red font-mono bg-stamp-light/30 border border-stamp-red/30 p-2 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-3 mt-4 border-t border-rule/60 flex items-center justify-between text-xs text-ink-soft font-mono">
        <span>Contributions cached locally</span>
        {onNavigateProjects && (
          <button
            type="button"
            onClick={onNavigateProjects}
            className="text-ledger-blue hover:underline text-[11px]"
          >
            Link to Project →
          </button>
        )}
      </div>
    </div>
  );
};
