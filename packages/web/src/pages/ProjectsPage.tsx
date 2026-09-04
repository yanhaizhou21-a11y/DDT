import React, { useEffect, useState, useMemo } from 'react';
import type {
  ProjectDomainType,
  ProjectStatus,
  ProjectWithStats,
  ProjectDetailResponse,
  GithubRepo,
  RouteTab,
} from '../types';
import {
  fetchProjects,
  fetchProject,
  createProject,
  updateProject,
  deleteProject,
  logProjectActivity,
  deleteProjectActivity,
  fetchGithubRepos,
  fetchSettings,
} from '../api';
import { Header } from '../components/Header';
import { DotLedger } from '../components/DotLedger';
import { GithubGraph } from '../components/GithubGraph';
import { ProjectActivityChart } from '../components/ProjectActivityChart';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/AlertDialog';
import {
  ProjectStatusBadge,
  getProjectStatusLabel,
  getProjectDomainLabel,
} from '../components/ProjectStatusBadge';
import {
  FolderKanban,
  Plus,
  ArrowLeft,
  Code2,
  Palette,
  Gamepad2,
  Video,
  GitBranch,
  ExternalLink,
  RotateCw,
  Trash2,
  Edit3,
  Calendar,
  Sparkles,
  CheckCircle2,
  Layers,
  Activity,
  Check,
  BarChart2,
  Grid,
} from 'lucide-react';

interface ProjectsPageProps {
  onNavigate: (tab: RouteTab) => void;
}

const DOMAIN_ICONS: Record<ProjectDomainType, React.ComponentType<{ className?: string }>> = {
  software: Code2,
  graphic_design: Palette,
  game_dev: Gamepad2,
  video_photo: Video,
};

const DOMAIN_OPTIONS: { value: ProjectDomainType; label: string; desc: string }[] = [
  { value: 'software', label: 'Software Development', desc: 'Web apps, backend, CLI, tools' },
  { value: 'graphic_design', label: 'Graphic Design', desc: 'UI/UX, branding, illustrations, print' },
  { value: 'game_dev', label: 'Game Development', desc: 'Mechanics, levels, assets, engines' },
  { value: 'video_photo', label: 'Video/Photo', desc: 'Editing, color grading, shoots, culling' },
];

const DOMAIN_PROGRESS_ACTIONS: Record<
  ProjectDomainType,
  { label: string; count: number; icon: React.ComponentType<{ className?: string }> }[]
> = {
  graphic_design: [
    { label: 'Design Revision', count: 1, icon: Edit3 },
    { label: 'Asset Export', count: 1, icon: Layers },
    { label: 'Concept / Mockup', count: 1, icon: Sparkles },
    { label: 'Final Delivery', count: 1, icon: Check },
  ],
  video_photo: [
    { label: 'Clip Edited', count: 1, icon: Video },
    { label: 'Photo Culled', count: 1, icon: CheckCircle2 },
    { label: 'Color Grade', count: 1, icon: Palette },
    { label: 'Render / Export', count: 1, icon: Layers },
  ],
  game_dev: [
    { label: 'Level Built', count: 1, icon: Gamepad2 },
    { label: 'Asset Imported', count: 1, icon: Layers },
    { label: 'Bug Fixed', count: 1, icon: CheckCircle2 },
    { label: 'Build Compiled', count: 1, icon: Code2 },
  ],
  software: [
    { label: 'Feature Shipped', count: 1, icon: Sparkles },
    { label: 'PR Merged', count: 1, icon: GitBranch },
    { label: 'Bug Fixed', count: 1, icon: CheckCircle2 },
    { label: 'Test Written', count: 1, icon: Code2 },
  ],
};

const STATUS_VALUES: ProjectStatus[] = ['not_started', 'in_progress', 'ready'];

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ onNavigate }) => {
  const [projectsList, setProjectsList] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected project detail view
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDetail, setProjectDetail] = useState<ProjectDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshingDetail, setRefreshingDetail] = useState(false);

  // Visualization mode toggle (Heatmap vs Charts & Bars)
  const [visualizationType, setVisualizationType] = useState<'heatmap' | 'chart'>('heatmap');

  // Filtering
  const [domainFilter, setDomainFilter] = useState<'all' | ProjectDomainType>('all');

  // GitHub token availability & repos for linking
  const [hasGithubToken, setHasGithubToken] = useState(false);
  const [availableRepos, setAvailableRepos] = useState<GithubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  // Create Project Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState<ProjectDomainType>('software');
  const [newStatus, setNewStatus] = useState<ProjectStatus>('not_started');
  const [newLinkedRepo, setNewLinkedRepo] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Project Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDomain, setEditDomain] = useState<ProjectDomainType>('software');
  const [editStatus, setEditStatus] = useState<ProjectStatus>('not_started');
  const [editLinkedRepo, setEditLinkedRepo] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Confirm Dialog State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Manual Activity Logging State
  const [manualCount, setManualCount] = useState('1');
  const [manualNote, setManualNote] = useState('');
  const [loggingActivity, setLoggingActivity] = useState(false);
  const [activitySuccessNotice, setActivitySuccessNotice] = useState<string | null>(null);

  // Load initial settings and projects
  const loadProjects = async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProjects(force);
      setProjectsList(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const loadGithubConfig = async () => {
    try {
      const st = await fetchSettings();
      const hasToken = Boolean(st.flags.hasGithubKey);
      setHasGithubToken(hasToken);
      if (hasToken) {
        setLoadingRepos(true);
        fetchGithubRepos()
          .then((res) => setAvailableRepos(res.repos || []))
          .catch(() => {})
          .finally(() => setLoadingRepos(false));
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    loadProjects();
    loadGithubConfig();
  }, []);

  // Load single project detail
  const loadProjectDetail = async (id: string, force = false) => {
    try {
      if (force) setRefreshingDetail(true);
      else setDetailLoading(true);

      const detail = await fetchProject(id, force);
      setProjectDetail(detail);
    } catch (err: any) {
      setError(err.message || 'Failed to load project details');
    } finally {
      setDetailLoading(false);
      setRefreshingDetail(false);
    }
  };

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    loadProjectDetail(id);
  };

  const handleBackToList = () => {
    setSelectedProjectId(null);
    setProjectDetail(null);
    loadProjects();
  };

  // Create Project
  const handleOpenCreateModal = () => {
    setNewName('');
    setNewDomain('software');
    setNewStatus('not_started');
    setNewLinkedRepo('');
    setCreateError(null);
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setCreateError('Project name is required');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);
      const created = await createProject({
        name: newName.trim(),
        domainType: newDomain,
        status: newStatus,
        linkedRepo: (newDomain === 'software' || newDomain === 'game_dev') && newLinkedRepo ? newLinkedRepo : null,
      });

      setCreateModalOpen(false);
      await loadProjects();
      // Jump directly to created project detail
      handleSelectProject(created.id);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (project: ProjectDetailResponse | ProjectWithStats) => {
    setEditName(project.name);
    setEditDomain(project.domainType);
    setEditStatus(project.status);
    setEditLinkedRepo(project.linkedRepo || '');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectDetail || !editName.trim()) return;

    try {
      setSavingEdit(true);
      const updated = await updateProject(projectDetail.id, {
        name: editName.trim(),
        domainType: editDomain,
        status: editStatus,
        linkedRepo: (editDomain === 'software' || editDomain === 'game_dev') && editLinkedRepo ? editLinkedRepo : null,
      });

      setEditModalOpen(false);
      await loadProjectDetail(updated.id, true);
    } catch (err: any) {
      alert(err.message || 'Failed to update project');
    } finally {
      setSavingEdit(false);
    }
  };

  // Live Inline Status Change in Detail View
  const handleInlineStatusChange = async (newStatusValue: ProjectStatus) => {
    if (!projectDetail) return;
    try {
      // Optimistic update
      setProjectDetail((prev) => (prev ? { ...prev, status: newStatusValue } : prev));
      await updateProject(projectDetail.id, { status: newStatusValue });
    } catch (err: any) {
      console.error('Failed to update status:', err);
      loadProjectDetail(projectDetail.id);
    }
  };

  // Live Inline Domain Change in Detail View (swaps status options & activity mode without page reload)
  const handleInlineDomainChange = async (newDomainValue: ProjectDomainType) => {
    if (!projectDetail) return;
    try {
      const willClearRepo = newDomainValue !== 'software' && newDomainValue !== 'game_dev';
      // Optimistic update
      setProjectDetail((prev) =>
        prev
          ? {
              ...prev,
              domainType: newDomainValue,
              isRepoLinked: willClearRepo ? false : prev.isRepoLinked,
              linkedRepo: willClearRepo ? null : prev.linkedRepo,
            }
          : prev
      );

      await updateProject(projectDetail.id, {
        domainType: newDomainValue,
        linkedRepo: willClearRepo ? null : projectDetail.linkedRepo,
      });

      // Reload project detail to recalculate activity graph from DB / GitHub
      await loadProjectDetail(projectDetail.id, true);
    } catch (err: any) {
      console.error('Failed to update domain type:', err);
      loadProjectDetail(projectDetail.id);
    }
  };

  // Delete Project
  const handlePromptDelete = (id: string, name: string) => {
    setProjectToDelete({ id, name });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    try {
      setDeleting(true);
      await deleteProject(projectToDelete.id);
      setDeleteConfirmOpen(false);
      setProjectToDelete(null);

      if (selectedProjectId === projectToDelete.id) {
        handleBackToList();
      } else {
        await loadProjects();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  // Manual Activity Logging (+N today with optional action note)
  const handleLogManualActivity = async (countToAdd: number, noteLabel?: string) => {
    if (!projectDetail || projectDetail.isRepoLinked) return;
    try {
      setLoggingActivity(true);
      const noteToSend = noteLabel || (manualNote.trim() ? manualNote.trim() : undefined);
      const res = await logProjectActivity(projectDetail.id, countToAdd, undefined, noteToSend);

      const notice = noteToSend
        ? `+${countToAdd} (${noteToSend}) logged! Today's total: ${res.count}`
        : `+${countToAdd} logged! Today's total: ${res.count}`;
      setActivitySuccessNotice(notice);
      setManualNote('');
      setTimeout(() => setActivitySuccessNotice(null), 3500);

      // Refresh detail data
      await loadProjectDetail(projectDetail.id, true);
    } catch (err: any) {
      alert(err.message || 'Failed to log activity');
    } finally {
      setLoggingActivity(false);
    }
  };

  const handleDeleteActivityEntry = async (activityId: string) => {
    if (!projectDetail) return;
    try {
      await deleteProjectActivity(projectDetail.id, activityId);
      await loadProjectDetail(projectDetail.id, true);
    } catch (err: any) {
      alert(err.message || 'Failed to remove entry');
    }
  };

  // Filtered list
  const filteredProjects = useMemo(() => {
    if (domainFilter === 'all') return projectsList;
    return projectsList.filter((p) => p.domainType === domainFilter);
  }, [projectsList, domainFilter]);

  // Overall metrics
  const totalProjects = projectsList.length;
  const inProgressProjects = projectsList.filter((p) => p.status === 'in_progress').length;
  const readyProjects = projectsList.filter((p) => p.status === 'ready').length;

  return (
    <div className="space-y-6">
      {/* ─── Top Header ────────────────────────────────────────── */}
      <Header
        title={selectedProjectId && projectDetail ? projectDetail.name : 'Project Tracker'}
        subtitle={
          selectedProjectId && projectDetail
            ? `${getProjectDomainLabel(projectDetail.domainType)} • 12-month activity timeline & status`
            : 'Multi-domain project progress & activity ledger'
        }
      >
        {selectedProjectId ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleBackToList}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-rule hover:border-ink-soft rounded text-xs font-mono text-ink transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Projects</span>
            </button>
            <button
              onClick={() => projectDetail && handleOpenEditModal(projectDetail)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-rule hover:border-ink-soft rounded text-xs font-mono text-ink transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => projectDetail && handlePromptDelete(projectDetail.id, projectDetail.name)}
              className="p-1.5 bg-card border border-rule hover:border-stamp-red/60 text-ink-soft hover:text-stamp-red rounded text-xs transition-colors"
              title="Delete Project"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-ledger-blue text-paper text-xs font-semibold rounded hover:bg-ledger-hover transition-colors shadow-subtle"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        )}
      </Header>

      {/* ─── VIEW 1: PROJECT DETAIL VIEW ────────────────────────── */}
      {selectedProjectId ? (
        detailLoading && !projectDetail ? (
          <div className="py-20 text-center text-ink-soft font-mono text-xs animate-pulse">
            <Sparkles className="w-5 h-5 mx-auto mb-2 opacity-50 animate-spin" />
            Loading project ledger and activity data...
          </div>
        ) : !projectDetail ? (
          <div className="ledger-card p-6 text-center">
            <p className="text-stamp-red text-sm font-medium mb-3">Project not found.</p>
            <button
              onClick={handleBackToList}
              className="px-3 py-1.5 bg-ledger-blue text-paper text-xs rounded hover:bg-ledger-hover font-mono"
            >
              ← Back to Project List
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Project Quick Control Bar: Domain Switcher, Status Dropdown, Repo Linking */}
            <div className="ledger-card p-4 sm:p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-rule/70">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-paper flex items-center justify-center text-ledger-blue border border-rule/70 shadow-xs">
                    {React.createElement(DOMAIN_ICONS[projectDetail.domainType] || Code2, {
                      className: 'w-5 h-5',
                    })}
                  </div>
                  <div>
                    <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2.5">
                      <span>{projectDetail.name}</span>
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <ProjectStatusBadge
                        domainType={projectDetail.domainType}
                        status={projectDetail.status}
                      />
                      {projectDetail.isRepoLinked && projectDetail.linkedRepo && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-ledger-blue bg-paper px-2 py-0.5 rounded border border-rule/60">
                          <GitBranch className="w-3 h-3" />
                          <span>{projectDetail.linkedRepo}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Dropdown with Dynamic Domain-Adaptive Labels */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 bg-paper/80 p-1.5 rounded-lg border border-rule/70">
                    <label className="text-xs font-mono text-ink-soft uppercase pl-1.5">
                      Status:
                    </label>
                    <select
                      value={projectDetail.status}
                      onChange={(e) => handleInlineStatusChange(e.target.value as ProjectStatus)}
                      className="bg-card text-ink font-sans text-xs font-medium px-2.5 py-1 rounded border border-rule/80 focus:outline-hidden focus:ring-1 focus:ring-ledger-blue cursor-pointer"
                    >
                      {STATUS_VALUES.map((statusVal) => (
                        <option key={statusVal} value={statusVal}>
                          {getProjectStatusLabel(projectDetail.domainType, statusVal)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Domain Type Switcher */}
                  <div className="flex items-center gap-2 bg-paper/80 p-1.5 rounded-lg border border-rule/70">
                    <label className="text-xs font-mono text-ink-soft uppercase pl-1.5">
                      Domain:
                    </label>
                    <select
                      value={projectDetail.domainType}
                      onChange={(e) => handleInlineDomainChange(e.target.value as ProjectDomainType)}
                      className="bg-card text-ink font-sans text-xs font-medium px-2.5 py-1 rounded border border-rule/80 focus:outline-hidden focus:ring-1 focus:ring-ledger-blue cursor-pointer"
                    >
                      {DOMAIN_OPTIONS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => loadProjectDetail(projectDetail.id, true)}
                    disabled={refreshingDetail}
                    className="p-2 bg-card border border-rule hover:border-ink-soft text-ink rounded text-xs font-mono transition-colors disabled:opacity-50"
                    title="Refresh activity data"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${refreshingDetail ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Metrics Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3 bg-paper/50 rounded-lg border border-rule/60">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-ink-soft block">
                    {projectDetail.isRepoLinked ? 'Total Commits (12 Mo)' : 'Total Items Logged'}
                  </span>
                  <span className="font-mono text-xl font-bold text-ink">
                    {projectDetail.totalActivity}
                  </span>
                </div>
                <div className="p-3 bg-paper/50 rounded-lg border border-rule/60">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-ink-soft block">
                    Today's Activity
                  </span>
                  <span className="font-mono text-xl font-bold text-ledger-blue">
                    {projectDetail.todayCount}
                  </span>
                </div>
                <div className="p-3 bg-paper/50 rounded-lg border border-rule/60">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-ink-soft block">
                    Tracking Mode
                  </span>
                  <span className="font-sans text-xs font-semibold text-ink mt-1 block truncate">
                    {projectDetail.isRepoLinked ? 'GitHub Live Commits' : 'Manual Output Logger'}
                  </span>
                </div>
                <div className="p-3 bg-paper/50 rounded-lg border border-rule/60">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-ink-soft block">
                    Status Milestone
                  </span>
                  <span className="font-sans text-xs font-semibold text-ink mt-1 block truncate">
                    {getProjectStatusLabel(projectDetail.domainType, projectDetail.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* 12-Month Heatmap & Chart Card */}
            <div className="ledger-card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rule/70">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-ledger-blue" />
                  <h3 className="font-serif text-base font-bold text-ink">
                    Activity & Progress Analytics
                  </h3>
                </div>

                {/* Radio Button / Segmented Control for Heatmap vs. Charts */}
                <div className="flex items-center gap-1 p-1 bg-paper border border-rule/70 rounded-lg self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setVisualizationType('heatmap')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded transition-all',
                      visualizationType === 'heatmap'
                        ? 'bg-card text-ink font-bold shadow-xs border border-rule/80'
                        : 'text-ink-soft hover:text-ink'
                    )}
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span>Heatmap</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisualizationType('chart')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded transition-all',
                      visualizationType === 'chart'
                        ? 'bg-card text-ink font-bold shadow-xs border border-rule/80'
                        : 'text-ink-soft hover:text-ink'
                    )}
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>Charts & Bars</span>
                  </button>
                </div>
              </div>

              {projectDetail.repoError && (
                <div className="p-3 bg-stamp-light/40 border border-stamp-red/40 rounded text-xs text-stamp-red font-mono">
                  {projectDetail.repoError}
                </div>
              )}

              {visualizationType === 'heatmap' ? (
                /* Reused Dot-Ledger Heatmap Component */
                <GithubGraph
                  months={12}
                  cellSize={12}
                  cellGap={3}
                  cellRadius={2}
                  animation="wave"
                  variant="github"
                  showAccount={false}
                  data={projectDetail.activity}
                  unit={projectDetail.isRepoLinked ? 'commit' : 'item'}
                  unitPlural={projectDetail.isRepoLinked ? 'commits' : 'items'}
                  metricLabel={
                    projectDetail.isRepoLinked ? 'commits in the last year' : 'items logged in the last year'
                  }
                />
              ) : (
                /* Domain-calibrated BarSquares or Pattern Timeline Chart */
                <ProjectActivityChart
                  domainType={projectDetail.domainType}
                  activity={projectDetail.activity}
                  isRepoLinked={projectDetail.isRepoLinked}
                  unit={projectDetail.isRepoLinked ? 'commit' : 'item'}
                  unitPlural={projectDetail.isRepoLinked ? 'commits' : 'items'}
                />
              )}
            </div>

            {/* Activity Logging Section — Swapped dynamically based on repo-linked vs manual */}
            {projectDetail.isRepoLinked ? (
              /* Repo-Linked View: Read-only live commits info */
              <div className="ledger-card p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-rule/70">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-ledger-blue" />
                    <h3 className="font-serif text-base font-bold text-ink">
                      GitHub Repository Sync
                    </h3>
                  </div>
                  <a
                    href={`https://github.com/${projectDetail.linkedRepo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono text-ledger-blue hover:underline flex items-center gap-1"
                  >
                    <span>{projectDetail.linkedRepo}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="p-3.5 bg-paper/60 border border-rule/70 rounded-lg text-xs font-sans text-ink-soft space-y-2">
                  <p className="text-ink font-medium">
                    This project is connected directly to{' '}
                    <span className="font-mono font-bold text-ledger-blue">
                      {projectDetail.linkedRepo}
                    </span>
                    .
                  </p>
                  <p>
                    Commit counts per day are fetched automatically from GitHub and cached locally.
                    Manual activity logging is disabled to avoid double-counting work.
                  </p>
                </div>

                {projectDetail.lastCommit && (
                  <div className="p-3 bg-paper rounded-[4px] border border-rule text-xs font-mono space-y-1.5">
                    <div className="text-[10px] uppercase text-ink-soft tracking-wider font-semibold">
                      Latest Commit on Default Branch
                    </div>
                    <div className="flex items-center gap-2 text-ink">
                      <GitBranch className="w-3.5 h-3.5 text-ledger-blue" />
                      <span className="font-bold">{projectDetail.lastCommit.sha}</span>
                      <span>—</span>
                      <span className="font-sans line-clamp-1">{projectDetail.lastCommit.message}</span>
                    </div>
                    <div className="text-[11px] text-ink-soft">
                      By {projectDetail.lastCommit.author} on{' '}
                      {projectDetail.lastCommit.date
                        ? new Date(projectDetail.lastCommit.date).toLocaleDateString()
                        : 'recent'}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Manual Activity Logging View: +N today logger */
              <div className="ledger-card p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-rule/70">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-ledger-blue" />
                    <h3 className="font-serif text-base font-bold text-ink">
                      Log Today's Work Output
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-ink-soft">
                    Today logged: <strong className="text-ink">{projectDetail.todayCount}</strong> items
                  </span>
                </div>

                <div className="p-3 bg-paper/50 rounded-lg border border-rule/60 text-xs text-ink-soft">
                  Record output completed today (e.g. design revisions, exports, clips edited, levels built, photos culled).
                </div>

                {activitySuccessNotice && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-mono rounded flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>{activitySuccessNotice}</span>
                  </div>
                )}

                {/* Domain Progress Quick Action Buttons */}
                <div className="space-y-2">
                  <span className="text-xs font-mono text-ink-soft block">
                    Quick Progress Log for {getProjectDomainLabel(projectDetail.domainType)}:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(DOMAIN_PROGRESS_ACTIONS[projectDetail.domainType] || DOMAIN_PROGRESS_ACTIONS.software).map(
                      (action) => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={action.label}
                            type="button"
                            disabled={loggingActivity}
                            onClick={() => handleLogManualActivity(action.count, action.label)}
                            className="p-2.5 bg-paper/70 hover:bg-card border border-rule hover:border-ledger-blue rounded-lg text-left transition-all active:scale-95 disabled:opacity-50 group flex items-start gap-2 shadow-xs"
                          >
                            <Icon className="w-4 h-4 mt-0.5 text-ledger-blue shrink-0 group-hover:scale-110 transition-transform" />
                            <div>
                              <div className="text-xs font-semibold text-ink leading-tight">
                                +{action.count} {action.label}
                              </div>
                              <div className="text-[10px] font-mono text-ink-soft">
                                Log output
                              </div>
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Custom Amount Form with Note Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const n = parseInt(manualCount, 10);
                    if (n > 0) handleLogManualActivity(n, manualNote.trim() || undefined);
                  }}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-3 border-t border-rule/60"
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-xs font-mono text-ink-soft shrink-0">Count:</label>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={manualCount}
                      onChange={(e) => setManualCount(e.target.value)}
                      className="w-16 px-2.5 py-1.5 bg-paper border border-rule rounded text-xs font-mono text-ink focus:outline-hidden focus:ring-1 focus:ring-ledger-blue text-center"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={manualNote}
                      onChange={(e) => setManualNote(e.target.value)}
                      placeholder="Optional note: e.g. Logo v2 SVG, 50 photos culled, boss fight level"
                      className="w-full px-3 py-1.5 bg-paper border border-rule rounded text-xs font-sans text-ink focus:outline-hidden focus:ring-1 focus:ring-ledger-blue"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loggingActivity || !manualCount || parseInt(manualCount, 10) <= 0}
                    className="px-4 py-1.5 bg-ledger-blue text-paper text-xs font-semibold rounded hover:bg-ledger-hover disabled:opacity-40 transition-colors shrink-0 shadow-xs"
                  >
                    {loggingActivity ? 'Logging...' : 'Log Activity'}
                  </button>
                </form>

                {/* Recent Manual Entries History */}
                {projectDetail.entries && projectDetail.entries.length > 0 && (
                  <div className="pt-3 border-t border-rule/60 space-y-2">
                    <span className="text-xs font-mono text-ink-soft uppercase tracking-wider block">
                      Recent Activity Entries
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {projectDetail.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-2 rounded bg-paper/60 border border-rule/60 text-xs font-mono"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-ink-soft">{entry.date}</span>
                            <span className="font-bold text-ledger-blue">+{entry.count} items</span>
                            {entry.note && (
                              <span className="text-[11px] font-sans font-medium text-ink bg-card px-2 py-0.5 rounded border border-rule/70">
                                {entry.note}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteActivityEntry(entry.id)}
                            className="text-ink-soft hover:text-stamp-red p-1 transition-colors shrink-0"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      ) : (
        /* ─── VIEW 2: PROJECT LIST VIEW ─────────────────────────── */
        <div className="space-y-6">
          {/* Domain Filter Tabs */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 p-1 bg-paper border border-rule rounded-lg">
              <button
                onClick={() => setDomainFilter('all')}
                className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                  domainFilter === 'all'
                    ? 'bg-card text-ink font-bold shadow-xs border border-rule/70'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                All ({totalProjects})
              </button>
              {DOMAIN_OPTIONS.map((opt) => {
                const count = projectsList.filter((p) => p.domainType === opt.value).length;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setDomainFilter(opt.value)}
                    className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                      domainFilter === opt.value
                        ? 'bg-card text-ink font-bold shadow-xs border border-rule/70'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    {opt.label} ({count})
                  </button>
                );
              })}
            </div>

            <div className="text-xs font-mono text-ink-soft">
              <span>
                {inProgressProjects} In Progress • {readyProjects} Ready
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="ledger-card p-4 text-center">
              <p className="text-stamp-red text-xs font-mono">{error}</p>
            </div>
          )}

          {/* Projects Grid or Empty State */}
          {loading && projectsList.length === 0 ? (
            <div className="py-20 text-center text-ink-soft font-mono text-xs animate-pulse">
              <Sparkles className="w-5 h-5 mx-auto mb-2 opacity-50 animate-spin" />
              Loading project ledger...
            </div>
          ) : filteredProjects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              message={
                domainFilter === 'all'
                  ? 'No projects tracked yet.'
                  : `No ${getProjectDomainLabel(domainFilter)} projects found.`
              }
              secondaryText="Create a project to track software repositories, design kits, game builds, or media edits."
              actionLabel="Create Project"
              onAction={handleOpenCreateModal}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProjects.map((project) => {
                const Icon = DOMAIN_ICONS[project.domainType] || Code2;
                return (
                  <div
                    key={project.id}
                    className="ledger-card p-4 sm:p-5 flex flex-col justify-between hover:border-ink-soft/70 transition-all cursor-pointer group"
                    onClick={() => handleSelectProject(project.id)}
                  >
                    <div className="space-y-3">
                      {/* Card Top: Domain Icon, Domain Label, Status Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded bg-paper flex items-center justify-center text-ledger-blue border border-rule/70 shrink-0">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-soft block">
                              {getProjectDomainLabel(project.domainType)}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge per design.md §4 */}
                        <ProjectStatusBadge
                          domainType={project.domainType}
                          status={project.status}
                        />
                      </div>

                      {/* Project Name */}
                      <div>
                        <h3 className="font-serif text-base font-bold text-ink group-hover:text-ledger-blue transition-colors line-clamp-1">
                          {project.name}
                        </h3>

                        {project.isRepoLinked && project.linkedRepo && (
                          <div className="flex items-center gap-1 mt-1 text-[11px] font-mono text-ledger-blue">
                            <GitBranch className="w-3 h-3 shrink-0" />
                            <span className="truncate">{project.linkedRepo}</span>
                          </div>
                        )}
                      </div>

                      {/* 30-Day Dot-Ledger Mini Heatmap Strip */}
                      <div className="pt-2 border-t border-rule/60">
                        <div className="flex items-center justify-between mb-1 text-[10px] font-mono text-ink-soft">
                          <span>30-Day Activity</span>
                          <span>
                            {project.totalActivity}{' '}
                            {project.isRepoLinked ? 'commits' : 'items'} total
                          </span>
                        </div>
                        <DotLedger
                          data={project.recentActivity}
                          unit={project.isRepoLinked ? 'commits' : 'items'}
                          className="w-full justify-between"
                        />
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-rule/60 text-[11px] font-mono text-ink-soft">
                      <span>
                        {project.lastActiveDate
                          ? `Active ${project.lastActiveDate}`
                          : 'No recent activity'}
                      </span>
                      <span className="text-ledger-blue group-hover:underline flex items-center gap-0.5">
                        View Ledger →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL 1: CREATE PROJECT MODAL ────────────────────────── */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Project"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && (
            <div className="p-2.5 bg-stamp-light/40 border border-stamp-red/40 text-stamp-red text-xs font-mono rounded">
              {createError}
            </div>
          )}

          {/* Project Name */}
          <div>
            <label className="block text-xs font-mono text-ink mb-1">
              Project Name <span className="text-stamp-red">*</span>
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. DDT Personal Ledger, Brand Refresh 2026..."
              className="w-full px-3 py-2 bg-paper border border-rule rounded text-xs text-ink focus:outline-hidden focus:ring-1 focus:ring-ledger-blue"
            />
          </div>

          {/* Domain Type Selector */}
          <div>
            <label className="block text-xs font-mono text-ink mb-1.5">
              Domain Type <span className="text-stamp-red">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DOMAIN_OPTIONS.map((opt) => {
                const Icon = DOMAIN_ICONS[opt.value];
                const isSelected = newDomain === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setNewDomain(opt.value);
                      if (opt.value !== 'software' && opt.value !== 'game_dev') {
                        setNewLinkedRepo('');
                      }
                    }}
                    className={`p-2.5 rounded border text-left flex items-start gap-2.5 transition-all ${
                      isSelected
                        ? 'bg-paper border-ledger-blue ring-1 ring-ledger-blue'
                        : 'bg-card border-rule hover:border-ink-soft'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        isSelected ? 'text-ledger-blue' : 'text-ink-soft'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-semibold text-ink">{opt.label}</div>
                      <div className="text-[10px] text-ink-soft leading-tight">{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Selector with Domain-Adaptive Labels */}
          <div>
            <label className="block text-xs font-mono text-ink mb-1">Initial Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as ProjectStatus)}
              className="w-full px-3 py-2 bg-paper border border-rule rounded text-xs font-sans text-ink focus:outline-hidden focus:ring-1 focus:ring-ledger-blue"
            >
              {STATUS_VALUES.map((statusVal) => (
                <option key={statusVal} value={statusVal}>
                  {getProjectStatusLabel(newDomain, statusVal)}
                </option>
              ))}
            </select>
          </div>

          {/* Linked Repo Field — ONLY if domain is software or game_dev AND GitHub token is configured */}
          {(newDomain === 'software' || newDomain === 'game_dev') && hasGithubToken && (
            <div>
              <label className="block text-xs font-mono text-ink mb-1">
                Link GitHub Repository (Optional)
              </label>
              <select
                value={newLinkedRepo}
                onChange={(e) => setNewLinkedRepo(e.target.value)}
                className="w-full px-3 py-2 bg-paper border border-rule rounded text-xs font-mono text-ink focus:outline-hidden focus:ring-1 focus:ring-ledger-blue"
              >
                <option value="">-- No linked repository (manual logging) --</option>
                {availableRepos.map((repo) => (
                  <option key={repo.id} value={repo.fullName}>
                    {repo.fullName} {repo.private ? '(private)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-ink-soft font-mono mt-1">
                When linked, commit graphs are automatically synchronized from GitHub.
              </p>
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-rule/70">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-3 py-1.5 bg-card border border-rule text-ink-soft hover:text-ink text-xs font-mono rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="px-4 py-1.5 bg-ledger-blue text-paper text-xs font-semibold rounded hover:bg-ledger-hover disabled:opacity-50 transition-colors"
            >
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL 2: EDIT PROJECT MODAL ──────────────────────────── */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Project"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-xs font-mono text-ink mb-1">Project Name</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 bg-paper border border-rule rounded text-xs text-ink focus:outline-hidden focus:ring-1 focus:ring-ledger-blue"
            />
          </div>

          {/* Domain Type */}
          <div>
            <label className="block text-xs font-mono text-ink mb-1">Domain Type</label>
            <select
              value={editDomain}
              onChange={(e) => {
                const dom = e.target.value as ProjectDomainType;
                setEditDomain(dom);
                if (dom !== 'software' && dom !== 'game_dev') {
                  setEditLinkedRepo('');
                }
              }}
              className="w-full px-3 py-2 bg-paper border border-rule rounded text-xs text-ink focus:outline-hidden focus:ring-1 focus:ring-ledger-blue"
            >
              {DOMAIN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown with Dynamic Domain Labels */}
          <div>
            <label className="block text-xs font-mono text-ink mb-1">Status</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}
              className="w-full px-3 py-2 bg-paper border border-rule rounded text-xs text-ink focus:outline-hidden focus:ring-1 focus:ring-ledger-blue"
            >
              {STATUS_VALUES.map((statusVal) => (
                <option key={statusVal} value={statusVal}>
                  {getProjectStatusLabel(editDomain, statusVal)}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Linked Repo if software/game_dev and GitHub is connected */}
          {(editDomain === 'software' || editDomain === 'game_dev') && hasGithubToken && (
            <div>
              <label className="block text-xs font-mono text-ink mb-1">
                Linked GitHub Repository
              </label>
              <select
                value={editLinkedRepo}
                onChange={(e) => setEditLinkedRepo(e.target.value)}
                className="w-full px-3 py-2 bg-paper border border-rule rounded text-xs font-mono text-ink focus:outline-hidden focus:ring-1 focus:ring-ledger-blue"
              >
                <option value="">-- None (manual activity logging) --</option>
                {availableRepos.map((repo) => (
                  <option key={repo.id} value={repo.fullName}>
                    {repo.fullName} {repo.private ? '(private)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Save Button */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-rule/70">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-3 py-1.5 bg-card border border-rule text-ink-soft hover:text-ink text-xs font-mono rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEdit || !editName.trim()}
              className="px-4 py-1.5 bg-ledger-blue text-paper text-xs font-semibold rounded hover:bg-ledger-hover disabled:opacity-50 transition-colors"
            >
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── CONFIRM DELETE DIALOG ────────────────────────────────── */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Project?"
        description={`Are you sure you want to delete "${projectToDelete?.name}"? All associated activity records will be permanently removed.`}
        confirmText="Delete Project"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};
