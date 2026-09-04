import type {
  DashboardResponse,
  SettingsResponse,
  JournalEntry,
  JournalSummary,
  KanbanColumn,
  KanbanCard,
  WatchlistItem,
  TMDBSearchResult,
  FoodEntry,
  FoodGroupedResponse,
  GameEntry,
  RAWGSearchResult,
  GameStatsResponse,
  GithubContributionsResponse,
  GithubRepo,
  Project,
  ProjectWithStats,
  ProjectDetailResponse,
  ProjectActivity,
  DailyRecapResponse,
  SendDiscordRecapParams,
  SendDiscordRecapResponse,
} from './types';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || errorBody.message || `Request failed with status ${res.status}`);
  }
  return res.json();
}

// Dashboard
export async function fetchDashboard(): Promise<DashboardResponse> {
  const res = await fetch(`${API_BASE}/dashboard`);
  return handleResponse<DashboardResponse>(res);
}

// Settings
export async function fetchSettings(): Promise<SettingsResponse> {
  const res = await fetch(`${API_BASE}/settings`);
  return handleResponse<SettingsResponse>(res);
}

export async function saveSettings(settings: Record<string, string>): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return handleResponse<{ success: boolean }>(res);
}

export async function testGithubToken(token?: string): Promise<{ valid: boolean; username?: string; name?: string; message?: string }> {
  const res = await fetch(`${API_BASE}/settings/test-github`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return res.json();
}

export async function testTmdbKey(apiKey?: string): Promise<{ valid: boolean; message?: string }> {
  const res = await fetch(`${API_BASE}/settings/test-tmdb`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });
  return res.json();
}

export async function testRawgKey(apiKey?: string): Promise<{ valid: boolean; message?: string }> {
  const res = await fetch(`${API_BASE}/settings/test-rawg`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });
  return res.json();
}

export async function testDiscordWebhook(
  webhookUrl?: string
): Promise<{ valid: boolean; name?: string; channelId?: string; message?: string }> {
  const res = await fetch(`${API_BASE}/settings/test-discord`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ webhookUrl }),
  });
  return res.json();
}

export async function importData(payload: any): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/settings/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<{ success: boolean; message: string }>(res);
}

// Journal
export async function fetchJournalList(): Promise<JournalSummary[]> {
  const res = await fetch(`${API_BASE}/journal`);
  return handleResponse<JournalSummary[]>(res);
}

export async function fetchJournalEntry(date: string): Promise<JournalEntry> {
  const res = await fetch(`${API_BASE}/journal/${date}`);
  return handleResponse<JournalEntry>(res);
}

export async function saveJournalEntry(date: string, content: string): Promise<{ success: boolean; wordCount: number }> {
  const res = await fetch(`${API_BASE}/journal/${date}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  return handleResponse<{ success: boolean; wordCount: number }>(res);
}

export async function deleteJournalEntry(date: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/journal/${date}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean }>(res);
}

export async function fetchJournalHeatmap(): Promise<Record<string, { wordCount: number; hasEntry: boolean }>> {
  const res = await fetch(`${API_BASE}/journal/stats/heatmap`);
  return handleResponse<Record<string, { wordCount: number; hasEntry: boolean }>>(res);
}

// Kanban
export async function fetchKanban(): Promise<{ columns: KanbanColumn[]; cards: KanbanCard[] }> {
  const res = await fetch(`${API_BASE}/kanban`);
  return handleResponse<{ columns: KanbanColumn[]; cards: KanbanCard[] }>(res);
}

export async function createKanbanColumn(name: string): Promise<KanbanColumn> {
  const res = await fetch(`${API_BASE}/kanban/columns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return handleResponse<KanbanColumn>(res);
}

export async function updateKanbanColumn(id: string, updates: Partial<KanbanColumn>): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/kanban/columns/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse<{ success: boolean }>(res);
}

export async function deleteKanbanColumn(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/kanban/columns/${id}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean }>(res);
}

export async function createKanbanCard(card: Partial<KanbanCard>): Promise<KanbanCard> {
  const res = await fetch(`${API_BASE}/kanban/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card),
  });
  return handleResponse<KanbanCard>(res);
}

export async function updateKanbanCard(id: string, updates: Partial<KanbanCard>): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/kanban/cards/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse<{ success: boolean }>(res);
}

export async function reorderKanban(payload: { columns?: KanbanColumn[]; cards?: KanbanCard[] }): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/kanban/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<{ success: boolean }>(res);
}

export async function deleteKanbanCard(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/kanban/cards/${id}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean }>(res);
}

// Watchlist
export async function fetchWatchlist(): Promise<WatchlistItem[]> {
  const res = await fetch(`${API_BASE}/watchlist`);
  return handleResponse<WatchlistItem[]>(res);
}

export async function searchTmdb(query: string): Promise<TMDBSearchResult[]> {
  const res = await fetch(`${API_BASE}/watchlist/search?query=${encodeURIComponent(query)}`);
  return handleResponse<TMDBSearchResult[]>(res);
}

export async function addWatchlistItem(item: Partial<WatchlistItem>): Promise<WatchlistItem> {
  const res = await fetch(`${API_BASE}/watchlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  return handleResponse<WatchlistItem>(res);
}

export async function updateWatchlistItem(id: string, updates: Partial<WatchlistItem>): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/watchlist/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse<{ success: boolean }>(res);
}

export async function deleteWatchlistItem(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/watchlist/${id}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean }>(res);
}

// Food
export async function fetchFood(date?: string): Promise<FoodGroupedResponse> {
  const url = date ? `${API_BASE}/food?date=${encodeURIComponent(date)}` : `${API_BASE}/food`;
  const res = await fetch(url);
  return handleResponse<FoodGroupedResponse>(res);
}

export async function addFoodEntry(entry: Partial<FoodEntry>): Promise<FoodEntry> {
  const res = await fetch(`${API_BASE}/food`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  return handleResponse<FoodEntry>(res);
}

export async function updateFoodEntry(id: string, updates: Partial<FoodEntry>): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/food/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse<{ success: boolean }>(res);
}

export async function deleteFoodEntry(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/food/${id}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean }>(res);
}

export async function fetchFoodStats(): Promise<Record<string, number>> {
  const res = await fetch(`${API_BASE}/food/stats/history`);
  return handleResponse<Record<string, number>>(res);
}

// Games
export async function fetchGames(date?: string): Promise<GameEntry[]> {
  const url = date ? `${API_BASE}/games?date=${encodeURIComponent(date)}` : `${API_BASE}/games`;
  const res = await fetch(url);
  return handleResponse<GameEntry[]>(res);
}

export async function fetchGameLibrary(): Promise<import('./types').GameLibraryItem[]> {
  const res = await fetch(`${API_BASE}/games/library`);
  return handleResponse<import('./types').GameLibraryItem[]>(res);
}


export async function fetchGameStats(): Promise<GameStatsResponse> {
  const res = await fetch(`${API_BASE}/games/stats`);
  return handleResponse<GameStatsResponse>(res);
}

export async function searchRawg(query: string): Promise<RAWGSearchResult[]> {
  const res = await fetch(`${API_BASE}/games/search?query=${encodeURIComponent(query)}`);
  return handleResponse<RAWGSearchResult[]>(res);
}

export async function addGameEntry(entry: Partial<GameEntry>): Promise<GameEntry> {
  const res = await fetch(`${API_BASE}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  return handleResponse<GameEntry>(res);
}

export async function deleteGameEntry(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/games/${id}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean }>(res);
}

export async function updateGameCover(gameName: string, coverUrl: string | null): Promise<{ success: boolean; gameName: string; coverUrl: string | null }> {
  const res = await fetch(`${API_BASE}/games/cover`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameName, coverUrl }),
  });
  return handleResponse<{ success: boolean; gameName: string; coverUrl: string | null }>(res);
}

// Upload Image (Max 5MB)
export async function uploadImage(file: File): Promise<{ success: boolean; url: string; filename: string; size: number }> {
  const maxBytes = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxBytes) {
    throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum 5 MB limit.`);
  }

  // Convert File to Base64 dataURL
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: dataUrl, filename: file.name }),
  });

  return handleResponse<{ success: boolean; url: string; filename: string; size: number }>(res);
}


// GitHub
export async function fetchGithubContributions(force = false): Promise<GithubContributionsResponse> {
  const res = await fetch(`${API_BASE}/github/contributions${force ? '?force=true' : ''}`);
  return handleResponse<GithubContributionsResponse>(res);
}

export async function fetchGithubRepos(force = false): Promise<{ repos: GithubRepo[]; fetchedAt: string }> {
  const res = await fetch(`${API_BASE}/github/repos${force ? '?force=true' : ''}`);
  return handleResponse<{ repos: GithubRepo[]; fetchedAt: string }>(res);
}

export async function refreshGithubCache(): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/github/refresh`, { method: 'POST' });
  return handleResponse<{ success: boolean }>(res);
}

// Projects
export async function fetchProjects(force = false): Promise<ProjectWithStats[]> {
  const res = await fetch(`${API_BASE}/projects${force ? '?force=true' : ''}`);
  return handleResponse<ProjectWithStats[]>(res);
}

export async function fetchProject(id: string, force = false): Promise<ProjectDetailResponse> {
  const res = await fetch(`${API_BASE}/projects/${id}${force ? '?force=true' : ''}`);
  return handleResponse<ProjectDetailResponse>(res);
}

export async function createProject(project: {
  name: string;
  domainType: string;
  status?: string;
  linkedRepo?: string | null;
}): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  return handleResponse<Project>(res);
}

export async function updateProject(
  id: string,
  updates: Partial<Project>
): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse<Project>(res);
}

export async function deleteProject(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean }>(res);
}

export async function logProjectActivity(
  id: string,
  count: number,
  date?: string,
  note?: string
): Promise<{ success: boolean; id: string; date: string; count: number; note?: string | null; isNew: boolean }> {
  const res = await fetch(`${API_BASE}/projects/${id}/activity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count, date, note }),
  });
  return handleResponse<{ success: boolean; id: string; date: string; count: number; note?: string | null; isNew: boolean }>(res);
}

export async function deleteProjectActivity(
  projectId: string,
  activityId: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/activity/${activityId}`, {
    method: 'DELETE',
  });
  return handleResponse<{ success: boolean }>(res);
}

// ─── Daily Activity Recap & Discord Webhook ─────────────────────────────────

export async function fetchDailyRecap(date?: string): Promise<DailyRecapResponse> {
  const url = date ? `${API_BASE}/recap?date=${encodeURIComponent(date)}` : `${API_BASE}/recap`;
  const res = await fetch(url);
  return handleResponse<DailyRecapResponse>(res);
}

export async function sendDiscordRecap(params: SendDiscordRecapParams): Promise<SendDiscordRecapResponse> {
  const res = await fetch(`${API_BASE}/recap/discord`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return handleResponse<SendDiscordRecapResponse>(res);
}

export async function fetchDiscordWebhookSettings(): Promise<{ hasWebhook: boolean; maskedUrl: string | null }> {
  const res = await fetch(`${API_BASE}/recap/settings`);
  return handleResponse<{ hasWebhook: boolean; maskedUrl: string | null }>(res);
}

export async function saveDiscordWebhookSettings(
  webhookUrl: string
): Promise<{ success: boolean; hasWebhook: boolean; maskedUrl: string | null }> {
  const res = await fetch(`${API_BASE}/recap/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ webhookUrl }),
  });
  return handleResponse<{ success: boolean; hasWebhook: boolean; maskedUrl: string | null }>(res);
}

