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
  GithubBranchesResponse,
  Project,
  ProjectWithStats,
  ProjectDetailResponse,
  ProjectActivity,
  DailyRecapResponse,
  SendDiscordRecapParams,
  SendDiscordRecapResponse,
} from './types';

import * as offlineStore from './lib/offlineStore';
import * as directExternalApi from './lib/directExternalApi';

export type DataMode = 'offline' | 'remote';

export const STORAGE_KEY_API_BASE = 'ddt_api_base_url';
export const STORAGE_KEY_DATA_MODE = 'ddt_data_mode';

export function isDesktopOrMobileApp(): boolean {
  if (typeof window === 'undefined') return false;
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return (
    protocol === 'tauri:' ||
    protocol === 'capacitor:' ||
    protocol === 'file:' ||
    hostname === 'tauri.localhost' ||
    Boolean((window as any).__TAURI_INTERNALS__) ||
    Boolean((window as any).__TAURI__) ||
    Boolean((window as any).Capacitor)
  );
}

export function getDataMode(): DataMode {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem(STORAGE_KEY_DATA_MODE) as DataMode | null;
    if (saved === 'offline' || saved === 'remote') {
      return saved;
    }
    // Heuristic: If running on mobile (Capacitor) and user hasn't set custom PC host yet, default to offline
    const isMobile = Boolean((window as any).Capacitor) || window.location.protocol === 'capacitor:';
    const hasCustomServer = Boolean(window.localStorage.getItem(STORAGE_KEY_API_BASE));
    if (isMobile && !hasCustomServer) {
      return 'offline';
    }
  }
  return 'remote';
}

export function setDataMode(mode: DataMode): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY_DATA_MODE, mode);
    window.dispatchEvent(new CustomEvent('ddt_data_mode_changed', { detail: mode }));
  }
}

let activeNativeApiBase = 'http://127.0.0.1:3000/api';

if (typeof window !== 'undefined' && isDesktopOrMobileApp()) {
  const custom = window.localStorage.getItem(STORAGE_KEY_API_BASE);
  if (!custom) {
    (async () => {
      try {
        const p3000 = await fetch('http://127.0.0.1:3000/api/health').catch(() => null);
        if (p3000 && p3000.ok) {
          activeNativeApiBase = 'http://127.0.0.1:3000/api';
          return;
        }
        const p3001 = await fetch('http://127.0.0.1:3001/api/health').catch(() => null);
        if (p3001 && p3001.ok) {
          activeNativeApiBase = 'http://127.0.0.1:3001/api';
        }
      } catch {
        // Fall back to default 3000
      }
    })();
  }
}

export function getApiBase(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = window.localStorage.getItem(STORAGE_KEY_API_BASE);
    if (stored && stored.trim()) {
      let cleaned = stored.trim().replace(/\/+$/, '');
      if (!cleaned.endsWith('/api') && (cleaned.startsWith('http://') || cleaned.startsWith('https://'))) {
        cleaned = `${cleaned}/api`;
      }
      return cleaned;
    }
  }

  // Native desktop (.exe) and mobile (.apk) apps serve web assets locally,
  // so relative '/api' points to the webview origin rather than the Express server.
  if (isDesktopOrMobileApp()) {
    return activeNativeApiBase;
  }

  return '/api';
}

export function setApiBase(url: string | null): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (!url || !url.trim() || url.trim() === '/api') {
      window.localStorage.removeItem(STORAGE_KEY_API_BASE);
    } else {
      window.localStorage.setItem(STORAGE_KEY_API_BASE, url.trim());
    }
  }
}

export function resetApiBase(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(STORAGE_KEY_API_BASE);
  }
}

export function getExportUrl(): string {
  return `${getApiBase()}/settings/export`;
}

export async function pullDataFromRemoteServer(): Promise<{ success: boolean; message: string }> {
  try {
    const exportUrl = `${getApiBase()}/settings/export`;
    const res = await fetch(exportUrl);
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }
    const payload = await res.json();
    if (!payload || !payload.data) {
      throw new Error('Invalid export format received from laptop server.');
    }
    return await offlineStore.importOfflineData(payload);
  } catch (err: any) {
    throw new Error(
      `Failed to pull data from laptop: ${err.message || 'Connection failed'}. Ensure DDT backend is running and both devices are connected to the same Wi-Fi network.`
    );
  }
}

export async function testServerConnection(targetUrl?: string): Promise<{ success: boolean; message: string }> {
  const base = targetUrl && targetUrl.trim()
    ? (targetUrl.trim().replace(/\/+$/, '').endsWith('/api')
        ? targetUrl.trim().replace(/\/+$/, '')
        : (targetUrl.trim().startsWith('http://') || targetUrl.trim().startsWith('https://'))
          ? `${targetUrl.trim().replace(/\/+$/, '')}/api`
          : targetUrl.trim().replace(/\/+$/, ''))
    : getApiBase();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    let res = await fetch(`${base}/health`, { signal: controller.signal }).catch(() => null);
    if (!res || !res.ok) {
      res = await fetch(`${base}/dashboard`, { signal: controller.signal });
    }
    clearTimeout(timeout);
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return {
          success: false,
          message: `Host returned HTML instead of DDT API at ${base}. Make sure the port points to DDT backend.`,
        };
      }
      return { success: true, message: `Connected to DDT API at ${base}` };
    }
    return { success: false, message: `Server responded with HTTP status ${res.status}` };
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError';
    return {
      success: false,
      message: isTimeout ? 'Connection timed out (6s)' : (err.message || 'Unable to reach backend server'),
    };
  }
}

export const API_BASE = {
  toString: () => getApiBase(),
  valueOf: () => getApiBase(),
  [Symbol.toPrimitive]: () => getApiBase(),
} as unknown as string;

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '');
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      throw new Error(
        'Host returned web page HTML instead of JSON. Ensure DDT backend is running on http://127.0.0.1:3000.'
      );
    }
    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }
    throw new Error(`Expected JSON response, but received "${contentType || 'unknown'}".`);
  }
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || errorBody.message || `Request failed with status ${res.status}`);
  }
  return res.json();
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export async function fetchDashboard(): Promise<DashboardResponse> {
  if (getDataMode() === 'offline') {
    return offlineStore.getOfflineDashboard();
  }
  try {
    const res = await fetch(`${API_BASE}/dashboard`);
    return await handleResponse<DashboardResponse>(res);
  } catch (err: any) {
    // If remote connection fails and we are in remote mode, attempt fallback to offline store
    console.warn('Remote dashboard fetch failed, attempting offline fallback:', err);
    throw err;
  }
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function fetchSettings(): Promise<SettingsResponse> {
  if (getDataMode() === 'offline') {
    return offlineStore.getOfflineSettings();
  }
  const res = await fetch(`${API_BASE}/settings`);
  return handleResponse<SettingsResponse>(res);
}

export async function saveSettings(settings: Record<string, string>): Promise<{ success: boolean }> {
  // Always mirror settings locally so API keys remain available in both modes
  await offlineStore.saveOfflineSettings(settings);

  if (getDataMode() === 'offline') {
    return { success: true };
  }
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return handleResponse<{ success: boolean }>(res);
}

export async function testGithubToken(token?: string): Promise<{ valid: boolean; username?: string; name?: string; message?: string }> {
  if (getDataMode() === 'offline') {
    const targetToken = token || (await offlineStore.getOfflineSetting('github_token'));
    return directExternalApi.directTestGithubToken(targetToken);
  }
  try {
    const res = await fetch(`${API_BASE}/settings/test-github`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return await res.json();
  } catch {
    const targetToken = token || (await offlineStore.getOfflineSetting('github_token'));
    return directExternalApi.directTestGithubToken(targetToken);
  }
}

export async function testTmdbKey(apiKey?: string): Promise<{ valid: boolean; message?: string }> {
  if (getDataMode() === 'offline') {
    const key = apiKey || (await offlineStore.getOfflineSetting('tmdb_api_key'));
    return directExternalApi.directTestTmdbKey(key);
  }
  try {
    const res = await fetch(`${API_BASE}/settings/test-tmdb`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });
    return await res.json();
  } catch {
    const key = apiKey || (await offlineStore.getOfflineSetting('tmdb_api_key'));
    return directExternalApi.directTestTmdbKey(key);
  }
}

export async function testRawgKey(apiKey?: string): Promise<{ valid: boolean; message?: string }> {
  if (getDataMode() === 'offline') {
    const key = apiKey || (await offlineStore.getOfflineSetting('rawg_api_key'));
    return directExternalApi.directTestRawgKey(key);
  }
  try {
    const res = await fetch(`${API_BASE}/settings/test-rawg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });
    return await res.json();
  } catch {
    const key = apiKey || (await offlineStore.getOfflineSetting('rawg_api_key'));
    return directExternalApi.directTestRawgKey(key);
  }
}

export async function testDiscordWebhook(
  webhookUrl?: string
): Promise<{ valid: boolean; name?: string; channelId?: string; message?: string }> {
  if (getDataMode() === 'offline') {
    const url = webhookUrl || (await offlineStore.getOfflineSetting('discord_webhook_url'));
    return directExternalApi.directTestDiscordWebhook(url);
  }
  try {
    const res = await fetch(`${API_BASE}/settings/test-discord`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl }),
    });
    return await res.json();
  } catch {
    const url = webhookUrl || (await offlineStore.getOfflineSetting('discord_webhook_url'));
    return directExternalApi.directTestDiscordWebhook(url);
  }
}

export async function importData(payload: any): Promise<{ success: boolean; message: string }> {
  // In offline mode, import directly into IndexedDB
  if (getDataMode() === 'offline') {
    return offlineStore.importOfflineData(payload);
  }
  // In remote mode, import to remote server and also sync to local store
  await offlineStore.importOfflineData(payload).catch(() => {});
  const res = await fetch(`${API_BASE}/settings/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<{ success: boolean; message: string }>(res);
}

export async function exportDataJson(): Promise<any> {
  if (getDataMode() === 'offline') {
    return offlineStore.exportOfflineData();
  }
  const res = await fetch(`${API_BASE}/settings/export`);
  return handleResponse<any>(res);
}

// ─── Journal ─────────────────────────────────────────────────────────────────

export async function fetchJournalList(): Promise<JournalSummary[]> {
  if (getDataMode() === 'offline') {
    return offlineStore.getOfflineJournalList();
  }
  const res = await fetch(`${API_BASE}/journal`);
  return handleResponse<JournalSummary[]>(res);
}

export async function fetchJournalEntry(date: string): Promise<JournalEntry> {
  if (getDataMode() === 'offline') {
    return offlineStore.getOfflineJournalEntry(date);
  }
  const res = await fetch(`${API_BASE}/journal/${date}`);
  return handleResponse<JournalEntry>(res);
}

export async function saveJournalEntry(date: string, content: string): Promise<{ success: boolean; wordCount: number }> {
  if (getDataMode() === 'offline') {
    return offlineStore.saveOfflineJournalEntry(date, content);
  }
  const res = await fetch(`${API_BASE}/journal/${date}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  const data = await handleResponse<{ success: boolean; wordCount: number }>(res);
  offlineStore.saveOfflineJournalEntry(date, content).catch(() => {});
  return data;
}

export async function deleteJournalEntry(date: string): Promise<{ success: boolean }> {
  if (getDataMode() === 'offline') {
    return offlineStore.deleteOfflineJournalEntry(date);
  }
  const res = await fetch(`${API_BASE}/journal/${date}`, { method: 'DELETE' });
  const data = await handleResponse<{ success: boolean }>(res);
  offlineStore.deleteOfflineJournalEntry(date).catch(() => {});
  return data;
}

export async function fetchJournalHeatmap(): Promise<Record<string, { wordCount: number; hasEntry: boolean }>> {
  if (getDataMode() === 'offline') {
    return offlineStore.getOfflineJournalHeatmap();
  }
  const res = await fetch(`${API_BASE}/journal/stats/heatmap`);
  return handleResponse<Record<string, { wordCount: number; hasEntry: boolean }>>(res);
}

// ─── Kanban ──────────────────────────────────────────────────────────────────

export async function fetchKanban(): Promise<{ columns: KanbanColumn[]; cards: KanbanCard[] }> {
  if (getDataMode() === 'offline') {
    return offlineStore.getOfflineKanban();
  }
  const res = await fetch(`${API_BASE}/kanban`);
  return handleResponse<{ columns: KanbanColumn[]; cards: KanbanCard[] }>(res);
}

export async function createKanbanColumn(name: string): Promise<KanbanColumn> {
  if (getDataMode() === 'offline') {
    return offlineStore.createOfflineKanbanColumn(name);
  }
  const res = await fetch(`${API_BASE}/kanban/columns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return handleResponse<KanbanColumn>(res);
}

export async function updateKanbanColumn(id: string, updates: Partial<KanbanColumn>): Promise<{ success: boolean }> {
  if (getDataMode() === 'offline') {
    return offlineStore.updateOfflineKanbanColumn(id, updates);
  }
  const res = await fetch(`${API_BASE}/kanban/columns/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse<{ success: boolean }>(res);
}

export async function deleteKanbanColumn(id: string): Promise<{ success: boolean }> {
  if (getDataMode() === 'offline') {
    return offlineStore.deleteOfflineKanbanColumn(id);
  }
  const res = await fetch(`${API_BASE}/kanban/columns/${id}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean }>(res);
}

export async function createKanbanCard(card: Partial<KanbanCard>): Promise<KanbanCard> {
  if (getDataMode() === 'offline') {
    return offlineStore.createOfflineKanbanCard(card);
  }
  const res = await fetch(`${API_BASE}/kanban/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card),
  });
  return handleResponse<KanbanCard>(res);
}

export async function updateKanbanCard(id: string, updates: Partial<KanbanCard>): Promise<{ success: boolean }> {
  if (getDataMode() === 'offline') {
    return offlineStore.updateOfflineKanbanCard(id, updates);
  }
  const res = await fetch(`${API_BASE}/kanban/cards/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse<{ success: boolean }>(res);
}

export async function reorderKanban(payload: { columns?: KanbanColumn[]; cards?: KanbanCard[] }): Promise<{ success: boolean }> {
  if (getDataMode() === 'offline') {
    return offlineStore.reorderOfflineKanban(payload);
  }
  const res = await fetch(`${API_BASE}/kanban/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<{ success: boolean }>(res);
}

export async function deleteKanbanCard(id: string): Promise<{ success: boolean }> {
  if (getDataMode() === 'offline') {
    return offlineStore.deleteOfflineKanbanCard(id);
  }
  const res = await fetch(`${API_BASE}/kanban/cards/${id}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean }>(res);
}

// ─── Watchlist ───────────────────────────────────────────────────────────────

export async function fetchWatchlist(): Promise<WatchlistItem[]> {
  if (getDataMode() === 'offline') {
    return offlineStore.getOfflineWatchlist();
  }
  const res = await fetch(`${API_BASE}/watchlist`);
  return handleResponse<WatchlistItem[]>(res);
}

export async function searchTmdb(query: string): Promise<TMDBSearchResult[]> {
  if (getDataMode() === 'offline') {
    const key = await offlineStore.getOfflineSetting('tmdb_api_key');
    return directExternalApi.directSearchTmdb(query, key);
  }
  try {
    const res = await fetch(`${API_BASE}/watchlist/search?query=${encodeURIComponent(query)}`);
    return await handleResponse<TMDBSearchResult[]>(res);
  } catch (err: any) {
    const key = await offlineStore.getOfflineSetting('tmdb_api_key');
    if (key) {
      return directExternalApi.directSearchTmdb(query, key);
    }
    throw err;
  }
}

export async function addWatchlistItem(item: Partial<WatchlistItem>): Promise<WatchlistItem> {
  if (getDataMode() === 'offline') {
    return offlineStore.addOfflineWatchlistItem(item);
  }
  const res = await fetch(`${API_BASE}/watchlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  return handleResponse<WatchlistItem>(res);
}

export async function updateWatchlistItem(id: string, updates: Partial<WatchlistItem>): Promise<{ success: boolean }> {
  if (getDataMode() === 'offline') {
    return offlineStore.updateOfflineWatchlistItem(id, updates);
  }
  const res = await fetch(`${API_BASE}/watchlist/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse<{ success: boolean }>(res);
}

export async function updateWatchlistEpisodes(
  id: string,
  action: 'increment' | 'decrement' | 'complete' | 'reset' | 'set',
  episode?: number
): Promise<{ success: boolean; id: string; currentEpisode: number; status: 'watching' | 'want' | 'watched' }> {
  if (getDataMode() === 'offline') {
    return offlineStore.updateOfflineWatchlistEpisodes(id, action, episode);
  }
  const res = await fetch(`${API_BASE}/watchlist/${id}/episodes`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, episode }),
  });
  return handleResponse<{ success: boolean; id: string; currentEpisode: number; status: 'watching' | 'want' | 'watched' }>(res);
}

export async function deleteWatchlistItem(id: string): Promise<{ success: boolean }> {
  if (getDataMode() === 'offline') {
    return offlineStore.deleteOfflineWatchlistItem(id);
  }
  const res = await fetch(`${API_BASE}/watchlist/${id}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean }>(res);
}

// ─── Food ────────────────────────────────────────────────────────────────────

export async function fetchFood(date?: string): Promise<FoodGroupedResponse> {
  if (getDataMode() === 'offline') {
    return offlineStore.getOfflineFood(date);
  }
  const url = date ? `${API_BASE}/food?date=${encodeURIComponent(date)}` : `${API_BASE}/food`;
  const res = await fetch(url);
  return handleResponse<FoodGroupedResponse>(res);
}

export async function addFoodEntry(entry: Partial<FoodEntry>): Promise<FoodEntry> {
  if (getDataMode() === 'offline') {
    return offlineStore.addOfflineFoodEntry(entry);
  }
  const res = await fetch(`${API_BASE}/food`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  return handleResponse<FoodEntry>(res);
}

export async function updateFoodEntry(id: string, updates: Partial<FoodEntry>): Promise<{ success: boolean }> {
  if (getDataMode() === 'offline') {
    return offlineStore.updateOfflineFoodEntry(id, updates);
  }
  const res = await fetch(`${API_BASE}/food/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse<{ success: boolean }>(res);
}

export async function deleteFoodEntry(id: string): Promise<{ success: boolean }> {
  if (getDataMode() === 'offline') {
    return offlineStore.deleteOfflineFoodEntry(id);
  }
  const res = await fetch(`${API_BASE}/food/${id}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean }>(res);
}

export async function fetchFoodStats(): Promise<Record<string, number>> {
  if (getDataMode() === 'offline') {
    return offlineStore.getOfflineFoodStats();
  }
  const res = await fetch(`${API_BASE}/food/stats/history`);
  return handleResponse<Record<string, number>>(res);
}

// ─── Games ───────────────────────────────────────────────────────────────────

export async function fetchGames(date?: string): Promise<GameEntry[]> {
  if (getDataMode() === 'offline') {
    return offlineStore.getOfflineGames(date);
  }
  const url = date ? `${API_BASE}/games?date=${encodeURIComponent(date)}` : `${API_BASE}/games`;
  const res = await fetch(url);
  return handleResponse<GameEntry[]>(res);
}

export async function fetchGameLibrary(): Promise<import('./types').GameLibraryItem[]> {
  if (getDataMode() === 'offline') {
    return offlineStore.getOfflineGameLibrary();
  }
  const res = await fetch(`${API_BASE}/games/library`);
  return handleResponse<import('./types').GameLibraryItem[]>(res);
}

export async function fetchGameStats(): Promise<GameStatsResponse> {
  if (getDataMode() === 'offline') {
    return offlineStore.getOfflineGameStats();
  }
  const res = await fetch(`${API_BASE}/games/stats`);
  return handleResponse<GameStatsResponse>(res);
}

export async function searchRawg(query: string): Promise<RAWGSearchResult[]> {
  if (getDataMode() === 'offline') {
    const key = await offlineStore.getOfflineSetting('rawg_api_key');
    return directExternalApi.directSearchRawg(query, key);
  }
  try {
    const res = await fetch(`${API_BASE}/games/search?query=${encodeURIComponent(query)}`);
    return await handleResponse<RAWGSearchResult[]>(res);
  } catch (err: any) {
    const key = await offlineStore.getOfflineSetting('rawg_api_key');
    if (key) {
      return directExternalApi.directSearchRawg(query, key);
    }
    throw err;
  }
}

export async function addGameEntry(entry: Partial<GameEntry>): Promise<GameEntry> {
  if (getDataMode() === 'offline') {
    return offlineStore.addOfflineGameEntry(entry);
  }
  const res = await fetch(`${API_BASE}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  return handleResponse<GameEntry>(res);
}

export async function deleteGameEntry(id: string): Promise<{ success: boolean }> {
  if (getDataMode() === 'offline') {
    return offlineStore.deleteOfflineGameEntry(id);
  }
  const res = await fetch(`${API_BASE}/games/${id}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean }>(res);
}

export async function updateGameCover(gameName: string, coverUrl: string | null): Promise<{ success: boolean; gameName: string; coverUrl: string | null }> {
  if (getDataMode() === 'offline') {
    return offlineStore.updateOfflineGameCover(gameName, coverUrl);
  }
  const res = await fetch(`${API_BASE}/games/cover`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameName, coverUrl }),
  });
  return handleResponse<{ success: boolean; gameName: string; coverUrl: string | null }>(res);
}

// ─── Image Upload ────────────────────────────────────────────────────────────

export async function uploadImage(file: File): Promise<{ success: boolean; url: string; filename: string; size: number }> {
  const maxBytes = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxBytes) {
    throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum 5 MB limit.`);
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  if (getDataMode() === 'offline') {
    return {
      success: true,
      url: dataUrl,
      filename: file.name,
      size: file.size,
    };
  }

  try {
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl, filename: file.name }),
    });
    return await handleResponse<{ success: boolean; url: string; filename: string; size: number }>(res);
  } catch {
    return {
      success: true,
      url: dataUrl,
      filename: file.name,
      size: file.size,
    };
  }
}

// ─── GitHub ──────────────────────────────────────────────────────────────────

export async function fetchGithubContributions(force = false): Promise<GithubContributionsResponse> {
  if (getDataMode() === 'offline') {
    const token = await offlineStore.getOfflineSetting('github_token');
    const username = (await offlineStore.getOfflineSetting('github_username')) || 'user';
    return {
      user: { login: username, name: username, avatarUrl: '' },
      totalContributions: 0,
      weeks: [],
      fetchedAt: new Date().toISOString(),
    };
  }
  const res = await fetch(`${API_BASE}/github/contributions${force ? '?force=true' : ''}`);
  return handleResponse<GithubContributionsResponse>(res);
}

export async function fetchGithubRepos(force = false): Promise<{ repos: GithubRepo[]; fetchedAt: string }> {
  if (getDataMode() === 'offline') {
    const token = await offlineStore.getOfflineSetting('github_token');
    return directExternalApi.directFetchGithubRepos(token);
  }
  try {
    const res = await fetch(`${API_BASE}/github/repos${force ? '?force=true' : ''}`);
    return await handleResponse<{ repos: GithubRepo[]; fetchedAt: string }>(res);
  } catch (err: any) {
    const token = await offlineStore.getOfflineSetting('github_token');
    if (token) {
      return directExternalApi.directFetchGithubRepos(token);
    }
    throw err;
  }
}

export async function refreshGithubCache(): Promise<{ success: boolean }> {
  if (getDataMode() === 'offline') {
    return { success: true };
  }
  const res = await fetch(`${API_BASE}/github/refresh`, { method: 'POST' });
  return handleResponse<{ success: boolean }>(res);
}

export async function fetchRepoBranches(
  owner: string,
  repo: string,
  force = false
): Promise<GithubBranchesResponse> {
  if (getDataMode() === 'offline') {
    const token = await offlineStore.getOfflineSetting('github_token');
    return directExternalApi.directFetchRepoBranches(owner, repo, token);
  }
  try {
    const res = await fetch(
      `${API_BASE}/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches${force ? '?force=true' : ''}`
    );
    return await handleResponse<GithubBranchesResponse>(res);
  } catch (err: any) {
    const token = await offlineStore.getOfflineSetting('github_token');
    if (token) {
      return directExternalApi.directFetchRepoBranches(owner, repo, token);
    }
    throw err;
  }
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function fetchProjects(force = false): Promise<ProjectWithStats[]> {
  if (getDataMode() === 'offline') {
    return offlineStore.getOfflineProjects();
  }
  const res = await fetch(`${API_BASE}/projects${force ? '?force=true' : ''}`);
  return handleResponse<ProjectWithStats[]>(res);
}

export async function fetchProject(id: string, force = false): Promise<ProjectDetailResponse> {
  if (getDataMode() === 'offline') {
    return offlineStore.getOfflineProject(id);
  }
  const res = await fetch(`${API_BASE}/projects/${id}${force ? '?force=true' : ''}`);
  return handleResponse<ProjectDetailResponse>(res);
}

export async function createProject(project: {
  name: string;
  domainType: string;
  status?: string;
  linkedRepo?: string | null;
  linkedBranch?: string | null;
}): Promise<Project> {
  if (getDataMode() === 'offline') {
    return offlineStore.createOfflineProject(project);
  }
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
  if (getDataMode() === 'offline') {
    return offlineStore.updateOfflineProject(id, updates);
  }
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse<Project>(res);
}

export async function deleteProject(id: string): Promise<{ success: boolean }> {
  if (getDataMode() === 'offline') {
    return offlineStore.deleteOfflineProject(id);
  }
  const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean }>(res);
}

export async function logProjectActivity(
  id: string,
  count: number,
  date?: string,
  note?: string
): Promise<{ success: boolean; id: string; date: string; count: number; note?: string | null; isNew: boolean }> {
  if (getDataMode() === 'offline') {
    return offlineStore.logOfflineProjectActivity(id, count, date, note);
  }
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
  if (getDataMode() === 'offline') {
    return offlineStore.deleteOfflineProjectActivity(projectId, activityId);
  }
  const res = await fetch(`${API_BASE}/projects/${projectId}/activity/${activityId}`, {
    method: 'DELETE',
  });
  return handleResponse<{ success: boolean }>(res);
}

// ─── Daily Recap & Discord Webhook ───────────────────────────────────────────

export async function fetchDailyRecap(date?: string): Promise<DailyRecapResponse> {
  if (getDataMode() === 'offline') {
    return offlineStore.getOfflineDailyRecap(date);
  }
  const url = date ? `${API_BASE}/recap?date=${encodeURIComponent(date)}` : `${API_BASE}/recap`;
  const res = await fetch(url);
  return handleResponse<DailyRecapResponse>(res);
}

export async function sendDiscordRecap(params: SendDiscordRecapParams): Promise<SendDiscordRecapResponse> {
  if (getDataMode() === 'offline') {
    const recap = await offlineStore.getOfflineDailyRecap(params.date);
    const webhookUrl = params.webhookUrl || recap.savedWebhookUrl;
    if (!webhookUrl) {
      throw new Error('No Discord Webhook URL provided or configured.');
    }
    return directExternalApi.directSendDiscordRecap({ ...params, webhookUrl }, recap.discordPayload);
  }
  const res = await fetch(`${API_BASE}/recap/discord`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return handleResponse<SendDiscordRecapResponse>(res);
}

export async function fetchDiscordWebhookSettings(): Promise<{ hasWebhook: boolean; maskedUrl: string | null }> {
  if (getDataMode() === 'offline') {
    const url = await offlineStore.getOfflineSetting('discord_webhook_url');
    return {
      hasWebhook: Boolean(url?.trim()),
      maskedUrl: url ? '••••••••' : null,
    };
  }
  const res = await fetch(`${API_BASE}/recap/settings`);
  return handleResponse<{ hasWebhook: boolean; maskedUrl: string | null }>(res);
}

export async function saveDiscordWebhookSettings(
  webhookUrl: string
): Promise<{ success: boolean; hasWebhook: boolean; maskedUrl: string | null }> {
  await offlineStore.saveOfflineSettings({ discord_webhook_url: webhookUrl });
  if (getDataMode() === 'offline') {
    return {
      success: true,
      hasWebhook: Boolean(webhookUrl.trim()),
      maskedUrl: webhookUrl.trim() ? '••••••••' : null,
    };
  }
  const res = await fetch(`${API_BASE}/recap/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ webhookUrl }),
  });
  return handleResponse<{ success: boolean; hasWebhook: boolean; maskedUrl: string | null }>(res);
}
