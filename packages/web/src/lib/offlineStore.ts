import type {
  DashboardResponse,
  SettingsResponse,
  JournalEntry,
  JournalSummary,
  KanbanColumn,
  KanbanCard,
  WatchlistItem,
  FoodEntry,
  FoodGroupedResponse,
  GameEntry,
  GameLibraryItem,
  GameStatsResponse,
  Project,
  ProjectWithStats,
  ProjectDetailResponse,
  ProjectActivity,
  DailyRecapResponse,
  DiscordWebhookPayload,
} from '../types';

const DB_NAME = 'ddt_offline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('journal_entries')) {
        db.createObjectStore('journal_entries', { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains('kanban_columns')) {
        db.createObjectStore('kanban_columns', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('kanban_cards')) {
        db.createObjectStore('kanban_cards', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('watchlist_items')) {
        db.createObjectStore('watchlist_items', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('food_entries')) {
        db.createObjectStore('food_entries', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('game_entries')) {
        db.createObjectStore('game_entries', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('project_activity')) {
        db.createObjectStore('project_activity', { keyPath: 'id' });
      }
    };

    request.onsuccess = async (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Seed default kanban columns if none exist
      try {
        const tx = db.transaction('kanban_columns', 'readonly');
        const store = tx.objectStore('kanban_columns');
        const countReq = store.count();
        countReq.onsuccess = () => {
          if (countReq.result === 0) {
            const seedTx = db.transaction('kanban_columns', 'readwrite');
            const seedStore = seedTx.objectStore('kanban_columns');
            seedStore.put({ id: 'todo', name: 'To Do', position: 0, createdAt: new Date().toISOString() });
            seedStore.put({ id: 'in_progress', name: 'In Progress', position: 1, createdAt: new Date().toISOString() });
            seedStore.put({ id: 'done', name: 'Done', position: 2, createdAt: new Date().toISOString() });
          }
        };
      } catch {
        // Ignore initialization errors
      }

      resolve(db);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB database.'));
    };
  });

  return dbPromise;
}

// Helper: Promisified IndexedDB transactions
async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function getOne<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putOne<T>(storeName: string, value: T): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function deleteOne(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function clearStore(storeName: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── Settings Store ──────────────────────────────────────────────────────────

export async function getOfflineSettings(): Promise<SettingsResponse> {
  const all = await getAll<{ key: string; value: string; updatedAt?: string }>('settings');
  const settingsMap: Record<string, string> = {};
  for (const item of all) {
    settingsMap[item.key] = item.value;
  }

  return {
    settings: settingsMap,
    flags: {
      hasGithubKey: Boolean(settingsMap.github_token?.trim()),
      hasTmdbKey: Boolean(settingsMap.tmdb_api_key?.trim() || settingsMap.tmdb_access_token?.trim()),
      hasRawgKey: Boolean(settingsMap.rawg_api_key?.trim()),
    },
    dbPath: 'IndexedDB (Local Device Storage)',
  };
}

export async function saveOfflineSettings(settings: Record<string, string>): Promise<{ success: boolean }> {
  for (const [key, value] of Object.entries(settings)) {
    await putOne('settings', { key, value: String(value ?? ''), updatedAt: new Date().toISOString() });
  }
  return { success: true };
}

export async function getOfflineSetting(key: string): Promise<string | undefined> {
  const item = await getOne<{ key: string; value: string }>('settings', key);
  return item?.value;
}

// ─── Journal Store ───────────────────────────────────────────────────────────

export async function getOfflineJournalList(): Promise<JournalSummary[]> {
  const all = await getAll<{ date: string; content: string; updatedAt?: string }>('journal_entries');
  return all
    .filter((j) => j.content && j.content.trim().length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((j) => {
      const words = j.content.trim().split(/\s+/).length;
      const preview = j.content.slice(0, 120).replace(/\n/g, ' ');
      return {
        date: j.date,
        wordCount: words,
        preview,
        updatedAt: j.updatedAt || j.date,
      };
    });
}

export async function getOfflineJournalEntry(date: string): Promise<JournalEntry> {
  const entry = await getOne<{ date: string; content: string; updatedAt?: string }>('journal_entries', date);
  if (!entry) {
    return {
      date,
      content: '',
      wordCount: 0,
      updatedAt: null,
      exists: false,
    };
  }
  const wordCount = entry.content.trim() ? entry.content.trim().split(/\s+/).length : 0;
  return {
    date: entry.date,
    content: entry.content,
    wordCount,
    updatedAt: entry.updatedAt || null,
    exists: true,
  };
}

export async function saveOfflineJournalEntry(date: string, content: string): Promise<{ success: boolean; wordCount: number }> {
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  await putOne('journal_entries', {
    date,
    content,
    updatedAt: new Date().toISOString(),
  });
  return { success: true, wordCount };
}

export async function deleteOfflineJournalEntry(date: string): Promise<{ success: boolean }> {
  await deleteOne('journal_entries', date);
  return { success: true };
}

export async function getOfflineJournalHeatmap(): Promise<Record<string, { wordCount: number; hasEntry: boolean }>> {
  const all = await getAll<{ date: string; content: string }>('journal_entries');
  const result: Record<string, { wordCount: number; hasEntry: boolean }> = {};
  for (const item of all) {
    const trimmed = item.content ? item.content.trim() : '';
    if (trimmed.length > 0) {
      result[item.date] = {
        wordCount: trimmed.split(/\s+/).length,
        hasEntry: true,
      };
    }
  }
  return result;
}

// ─── Kanban Store ────────────────────────────────────────────────────────────

export async function getOfflineKanban(): Promise<{ columns: KanbanColumn[]; cards: KanbanCard[] }> {
  const today = formatDate(new Date());
  const columns = await getAll<KanbanColumn>('kanban_columns');
  const cards = await getAll<KanbanCard>('kanban_cards');

  columns.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  cards.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const enrichedCards = cards.map((c) => ({
    ...c,
    isOverdue: Boolean(c.dueDate && c.dueDate < today),
  }));

  return { columns, cards: enrichedCards };
}

export async function createOfflineKanbanColumn(name: string): Promise<KanbanColumn> {
  const cols = await getAll<KanbanColumn>('kanban_columns');
  const newCol: KanbanColumn = {
    id: `col-${Date.now()}`,
    name: name || 'New Column',
    position: cols.length,
    createdAt: new Date().toISOString(),
  };
  await putOne('kanban_columns', newCol);
  return newCol;
}

export async function updateOfflineKanbanColumn(id: string, updates: Partial<KanbanColumn>): Promise<{ success: boolean }> {
  const existing = await getOne<KanbanColumn>('kanban_columns', id);
  if (!existing) throw new Error('Column not found');
  await putOne('kanban_columns', { ...existing, ...updates });
  return { success: true };
}

export async function deleteOfflineKanbanColumn(id: string): Promise<{ success: boolean }> {
  await deleteOne('kanban_columns', id);
  // Also delete associated cards
  const cards = await getAll<KanbanCard>('kanban_cards');
  for (const card of cards) {
    if (card.columnId === id) {
      await deleteOne('kanban_cards', card.id);
    }
  }
  return { success: true };
}

export async function createOfflineKanbanCard(card: Partial<KanbanCard>): Promise<KanbanCard> {
  const cards = await getAll<KanbanCard>('kanban_cards');
  const colCards = cards.filter((c) => c.columnId === card.columnId);
  const newCard: KanbanCard = {
    id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    columnId: card.columnId || 'todo',
    title: card.title || 'Untitled task',
    description: card.description || '',
    dueDate: card.dueDate || null,
    tag: card.tag || null,
    position: typeof card.position === 'number' ? card.position : colCards.length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await putOne('kanban_cards', newCard);
  return newCard;
}

export async function updateOfflineKanbanCard(id: string, updates: Partial<KanbanCard>): Promise<{ success: boolean }> {
  const existing = await getOne<KanbanCard>('kanban_cards', id);
  if (!existing) throw new Error('Card not found');
  await putOne('kanban_cards', { ...existing, ...updates, updatedAt: new Date().toISOString() });
  return { success: true };
}

export async function deleteOfflineKanbanCard(id: string): Promise<{ success: boolean }> {
  await deleteOne('kanban_cards', id);
  return { success: true };
}

export async function reorderOfflineKanban(payload: { columns?: KanbanColumn[]; cards?: KanbanCard[] }): Promise<{ success: boolean }> {
  if (Array.isArray(payload.columns)) {
    for (const col of payload.columns) {
      await putOne('kanban_columns', col);
    }
  }
  if (Array.isArray(payload.cards)) {
    for (const card of payload.cards) {
      await putOne('kanban_cards', card);
    }
  }
  return { success: true };
}

// ─── Watchlist Store ─────────────────────────────────────────────────────────

export async function getOfflineWatchlist(): Promise<WatchlistItem[]> {
  const all = await getAll<WatchlistItem>('watchlist_items');
  return all.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function addOfflineWatchlistItem(item: Partial<WatchlistItem>): Promise<WatchlistItem> {
  const newItem: WatchlistItem = {
    id: `watch-${Date.now()}`,
    title: item.title || 'Untitled',
    tmdbId: item.tmdbId ?? null,
    posterPath: item.posterPath ?? null,
    status: item.status || 'want',
    releaseDate: item.releaseDate ?? null,
    mediaType: item.mediaType || 'movie',
    overview: item.overview ?? null,
    currentEpisode: item.currentEpisode ?? 0,
    totalEpisodes: item.totalEpisodes ?? null,
    autoIncrement: item.autoIncrement ?? 0,
    airDay: item.airDay ?? null,
    lastAirDate: item.lastAirDate ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await putOne('watchlist_items', newItem);
  return newItem;
}

export async function updateOfflineWatchlistItem(id: string, updates: Partial<WatchlistItem>): Promise<{ success: boolean }> {
  const existing = await getOne<WatchlistItem>('watchlist_items', id);
  if (!existing) throw new Error('Watchlist item not found');
  await putOne('watchlist_items', { ...existing, ...updates, updatedAt: new Date().toISOString() });
  return { success: true };
}

export async function updateOfflineWatchlistEpisodes(
  id: string,
  action: 'increment' | 'decrement' | 'complete' | 'reset' | 'set',
  episode?: number
): Promise<{ success: boolean; id: string; currentEpisode: number; status: 'watching' | 'want' | 'watched' }> {
  const item = await getOne<WatchlistItem>('watchlist_items', id);
  if (!item) throw new Error('Watchlist item not found');

  let currentEpisode = item.currentEpisode ?? 0;
  let status: 'watching' | 'want' | 'watched' = item.status;

  if (action === 'increment') {
    currentEpisode += 1;
    if (item.totalEpisodes && currentEpisode >= item.totalEpisodes) {
      status = 'watched';
    } else {
      status = 'watching';
    }
  } else if (action === 'decrement') {
    currentEpisode = Math.max(0, currentEpisode - 1);
  } else if (action === 'complete') {
    currentEpisode = item.totalEpisodes || currentEpisode;
    status = 'watched';
  } else if (action === 'reset') {
    currentEpisode = 0;
    status = 'want';
  } else if (action === 'set' && typeof episode === 'number') {
    currentEpisode = Math.max(0, episode);
    if (item.totalEpisodes && currentEpisode >= item.totalEpisodes) {
      status = 'watched';
    }
  }

  await putOne('watchlist_items', {
    ...item,
    currentEpisode,
    status,
    updatedAt: new Date().toISOString(),
  });

  return { success: true, id, currentEpisode, status };
}

export async function deleteOfflineWatchlistItem(id: string): Promise<{ success: boolean }> {
  await deleteOne('watchlist_items', id);
  return { success: true };
}

// ─── Food Store ──────────────────────────────────────────────────────────────

export async function getOfflineFood(date?: string): Promise<FoodGroupedResponse> {
  const targetDate = date || formatDate(new Date());
  const all = await getAll<FoodEntry>('food_entries');
  const forDate = all.filter((f) => f.loggedAt === targetDate);

  return {
    breakfast: forDate.filter((f) => f.mealTag === 'breakfast'),
    lunch: forDate.filter((f) => f.mealTag === 'lunch'),
    dinner: forDate.filter((f) => f.mealTag === 'dinner'),
    snack: forDate.filter((f) => f.mealTag === 'snack'),
    all: forDate,
  };
}

export async function addOfflineFoodEntry(entry: Partial<FoodEntry>): Promise<FoodEntry> {
  const newEntry: FoodEntry = {
    id: `food-${Date.now()}`,
    itemName: entry.itemName || 'Meal',
    mealTag: entry.mealTag || 'breakfast',
    status: entry.status || 'eaten',
    loggedAt: entry.loggedAt || formatDate(new Date()),
    createdAt: new Date().toISOString(),
  };
  await putOne('food_entries', newEntry);
  return newEntry;
}

export async function updateOfflineFoodEntry(id: string, updates: Partial<FoodEntry>): Promise<{ success: boolean }> {
  const existing = await getOne<FoodEntry>('food_entries', id);
  if (!existing) throw new Error('Food entry not found');
  await putOne('food_entries', { ...existing, ...updates });
  return { success: true };
}

export async function deleteOfflineFoodEntry(id: string): Promise<{ success: boolean }> {
  await deleteOne('food_entries', id);
  return { success: true };
}

export async function getOfflineFoodStats(): Promise<Record<string, number>> {
  const all = await getAll<FoodEntry>('food_entries');
  const history: Record<string, number> = {};
  for (const item of all) {
    history[item.loggedAt] = (history[item.loggedAt] || 0) + 1;
  }
  return history;
}

// ─── Game Store ──────────────────────────────────────────────────────────────

export async function getOfflineGames(date?: string): Promise<GameEntry[]> {
  const targetDate = date || formatDate(new Date());
  const all = await getAll<GameEntry>('game_entries');
  return all.filter((g) => g.loggedAt === targetDate);
}

export async function getOfflineGameLibrary(): Promise<GameLibraryItem[]> {
  const all = await getAll<GameEntry>('game_entries');
  const map = new Map<string, GameEntry[]>();

  for (const session of all) {
    const list = map.get(session.gameName) || [];
    list.push(session);
    map.set(session.gameName, list);
  }

  const items: GameLibraryItem[] = [];
  map.forEach((sessions, gameName) => {
    sessions.sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
    const totalHours = sessions.reduce((sum, s) => sum + s.hours, 0);
    const coverUrl = sessions.find((s) => s.coverUrl)?.coverUrl || null;
    const lastPlayed = sessions[0]?.loggedAt || '';
    const firstPlayed = sessions[sessions.length - 1]?.loggedAt || '';

    items.push({
      gameName,
      coverUrl,
      totalHours: Math.round(totalHours * 10) / 10,
      sessionCount: sessions.length,
      lastPlayed,
      firstPlayed,
      sessions,
    });
  });

  return items.sort((a, b) => b.lastPlayed.localeCompare(a.lastPlayed));
}

export async function getOfflineGameStats(): Promise<GameStatsResponse> {
  const all = await getAll<GameEntry>('game_entries');
  const totalHours = all.reduce((sum, g) => sum + g.hours, 0);

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoStr = formatDate(sevenDaysAgo);

  const thisWeekSessions = all.filter((g) => g.loggedAt >= sevenDaysAgoStr);
  const thisWeekHours = thisWeekSessions.reduce((sum, g) => sum + g.hours, 0);

  const gameHoursMap = new Map<string, number>();
  for (const session of thisWeekSessions) {
    gameHoursMap.set(session.gameName, (gameHoursMap.get(session.gameName) || 0) + session.hours);
  }

  let topGameThisWeek: { name: string; hours: number } | null = null;
  gameHoursMap.forEach((hrs, name) => {
    if (!topGameThisWeek || hrs > topGameThisWeek.hours) {
      topGameThisWeek = { name, hours: Math.round(hrs * 10) / 10 };
    }
  });

  const historyMap: Record<string, number> = {};
  for (const session of all) {
    historyMap[session.loggedAt] = (historyMap[session.loggedAt] || 0) + session.hours;
  }

  return {
    totalHours: Math.round(totalHours * 10) / 10,
    thisWeekHours: Math.round(thisWeekHours * 10) / 10,
    topGameThisWeek,
    historyMap,
  };
}

export async function addOfflineGameEntry(entry: Partial<GameEntry>): Promise<GameEntry> {
  const newEntry: GameEntry = {
    id: `game-${Date.now()}`,
    gameName: entry.gameName || 'Game Session',
    hours: typeof entry.hours === 'number' ? entry.hours : 1,
    coverUrl: entry.coverUrl ?? null,
    loggedAt: entry.loggedAt || formatDate(new Date()),
    createdAt: new Date().toISOString(),
  };
  await putOne('game_entries', newEntry);
  return newEntry;
}

export async function deleteOfflineGameEntry(id: string): Promise<{ success: boolean }> {
  await deleteOne('game_entries', id);
  return { success: true };
}

export async function updateOfflineGameCover(gameName: string, coverUrl: string | null): Promise<{ success: boolean; gameName: string; coverUrl: string | null }> {
  const all = await getAll<GameEntry>('game_entries');
  for (const session of all) {
    if (session.gameName === gameName) {
      await putOne('game_entries', { ...session, coverUrl });
    }
  }
  return { success: true, gameName, coverUrl };
}

// ─── Projects Store ──────────────────────────────────────────────────────────

export async function getOfflineProjects(): Promise<ProjectWithStats[]> {
  const projectsList = await getAll<Project>('projects');
  const activities = await getAll<ProjectActivity>('project_activity');

  const now = new Date();
  const past14Days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    past14Days.push(formatDate(d));
  }

  return projectsList.map((p) => {
    const projActs = activities.filter((a) => a.projectId === p.id);
    const dateMap: Record<string, number> = {};
    let totalActivity = 0;
    let lastActiveDate: string | null = null;

    projActs.forEach((a) => {
      dateMap[a.date] = (dateMap[a.date] || 0) + a.count;
      totalActivity += a.count;
      if (!lastActiveDate || a.date > lastActiveDate) {
        lastActiveDate = a.date;
      }
    });

    const recentActivity = past14Days.map((date) => ({
      date,
      value: dateMap[date] || 0,
    }));

    return {
      ...p,
      isRepoLinked: Boolean(p.linkedRepo?.trim()),
      recentActivity,
      totalActivity,
      lastActiveDate,
    };
  });
}

export async function getOfflineProject(id: string): Promise<ProjectDetailResponse> {
  const project = await getOne<Project>('projects', id);
  if (!project) throw new Error('Project not found');

  const allActivities = await getAll<ProjectActivity>('project_activity');
  const projActivities = allActivities.filter((a) => a.projectId === id);

  const today = formatDate(new Date());
  let todayCount = 0;
  let totalActivity = 0;

  const now = new Date();
  const past30Days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    past30Days.push(formatDate(d));
  }

  const dateMap: Record<string, number> = {};
  projActivities.forEach((a) => {
    dateMap[a.date] = (dateMap[a.date] || 0) + a.count;
    totalActivity += a.count;
    if (a.date === today) todayCount += a.count;
  });

  const recentActivity = past30Days.slice(-14).map((date) => ({
    date,
    value: dateMap[date] || 0,
  }));

  const activity = past30Days.map((date) => {
    const count = dateMap[date] || 0;
    const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 8 ? 3 : 4;
    return { date, count, level };
  });

  return {
    ...project,
    isRepoLinked: Boolean(project.linkedRepo?.trim()),
    activity,
    recentActivity,
    totalActivity,
    todayCount,
    lastCommit: null,
    entries: projActivities.sort((a, b) => b.date.localeCompare(a.date)),
  };
}

export async function createOfflineProject(projectData: {
  name: string;
  domainType: string;
  status?: string;
  linkedRepo?: string | null;
  linkedBranch?: string | null;
}): Promise<Project> {
  const newProj: Project = {
    id: `proj-${Date.now()}`,
    name: projectData.name,
    domainType: projectData.domainType as any,
    status: (projectData.status as any) || 'not_started',
    linkedRepo: projectData.linkedRepo || null,
    linkedBranch: projectData.linkedBranch || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await putOne('projects', newProj);
  return newProj;
}

export async function updateOfflineProject(id: string, updates: Partial<Project>): Promise<Project> {
  const existing = await getOne<Project>('projects', id);
  if (!existing) throw new Error('Project not found');
  const updated: Project = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  await putOne('projects', updated);
  return updated;
}

export async function deleteOfflineProject(id: string): Promise<{ success: boolean }> {
  await deleteOne('projects', id);
  const acts = await getAll<ProjectActivity>('project_activity');
  for (const a of acts) {
    if (a.projectId === id) {
      await deleteOne('project_activity', a.id);
    }
  }
  return { success: true };
}

export async function logOfflineProjectActivity(
  projectId: string,
  count: number,
  date?: string,
  note?: string
): Promise<{ success: boolean; id: string; date: string; count: number; note?: string | null; isNew: boolean }> {
  const actDate = date || formatDate(new Date());
  const newAct: ProjectActivity = {
    id: `act-${Date.now()}`,
    projectId,
    date: actDate,
    count: Math.max(1, count),
    note: note || null,
    source: 'manual',
    createdAt: new Date().toISOString(),
  };
  await putOne('project_activity', newAct);
  return { success: true, id: newAct.id, date: actDate, count: newAct.count, note: newAct.note, isNew: true };
}

export async function deleteOfflineProjectActivity(projectId: string, activityId: string): Promise<{ success: boolean }> {
  await deleteOne('project_activity', activityId);
  return { success: true };
}

// ─── Dashboard Store Compilation ─────────────────────────────────────────────

export async function getOfflineDashboard(): Promise<DashboardResponse> {
  const today = formatDate(new Date());

  // 1. Journal
  const journalEntry = await getOne<{ date: string; content: string; updatedAt?: string }>('journal_entries', today);
  const journalData = journalEntry
    ? {
        date: journalEntry.date,
        content: journalEntry.content,
        wordCount: journalEntry.content.trim() ? journalEntry.content.trim().split(/\s+/).length : 0,
        updatedAt: journalEntry.updatedAt || null,
        hasWritten: journalEntry.content.trim().length > 0,
      }
    : {
        date: today,
        content: '',
        wordCount: 0,
        updatedAt: null,
        hasWritten: false,
      };

  // 2. Kanban Due
  const allCards = await getAll<KanbanCard>('kanban_cards');
  const cardsDue = allCards
    .filter((c) => Boolean(c.dueDate))
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
    .slice(0, 4)
    .map((c) => ({
      ...c,
      isOverdue: Boolean(c.dueDate && c.dueDate < today),
    }));

  // 3. Watchlist In Theater / Upcoming
  const allWatchlist = await getAll<WatchlistItem>('watchlist_items');
  const inTheaterSoon = allWatchlist
    .filter((w) => Boolean(w.releaseDate && w.releaseDate >= today))
    .sort((a, b) => (a.releaseDate || '').localeCompare(b.releaseDate || ''))
    .slice(0, 3);

  // 4. Food logged today
  const allFood = await getAll<FoodEntry>('food_entries');
  const todayFood = allFood.filter((f) => f.loggedAt === today);

  // 5. Game logged today
  const allGames = await getAll<GameEntry>('game_entries');
  const todayGames = allGames.filter((g) => g.loggedAt === today);
  const todayGameHours = todayGames.reduce((sum, g) => sum + g.hours, 0);

  // 6. Dot ledgers for past 30 days
  const days30: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days30.push(formatDate(d));
  }

  const allJournals = await getAll<{ date: string; content: string }>('journal_entries');
  const journalMap: Record<string, number> = {};
  allJournals.forEach((j) => {
    if (j.content && j.content.trim().length > 0) journalMap[j.date] = 1;
  });

  const foodMap: Record<string, number> = {};
  allFood.forEach((f) => {
    foodMap[f.loggedAt] = (foodMap[f.loggedAt] || 0) + 1;
  });

  const gameMap: Record<string, number> = {};
  allGames.forEach((g) => {
    gameMap[g.loggedAt] = (gameMap[g.loggedAt] || 0) + g.hours;
  });

  const ghToken = await getOfflineSetting('github_token');
  const ghUsername = await getOfflineSetting('github_username');

  return {
    today,
    journal: journalData,
    kanbanDue: cardsDue,
    inTheaterSoon,
    foodToday: {
      count: todayFood.length,
      items: todayFood.slice(0, 5),
    },
    gameToday: {
      hours: Math.round(todayGameHours * 100) / 100,
      items: todayGames.slice(0, 5),
    },
    dotLedgers: {
      days: days30,
      journal: days30.map((d) => ({ date: d, value: journalMap[d] || 0 })),
      food: days30.map((d) => ({ date: d, value: foodMap[d] || 0 })),
      game: days30.map((d) => ({ date: d, value: gameMap[d] || 0 })),
      github: days30.map((d) => ({ date: d, value: 0 })),
    },
    github: {
      hasToken: Boolean(ghToken?.trim() || ghUsername?.trim()),
      username: ghUsername || '',
      avatarUrl: '',
      todayCommits: 0,
      totalYearCommits: 0,
    },
  };
}

// ─── Daily Recap Store Compilation ───────────────────────────────────────────

export async function getOfflineDailyRecap(date?: string): Promise<DailyRecapResponse> {
  const targetDate = date || formatDate(new Date());

  const journal = await getOfflineJournalEntry(targetDate);
  const food = await getOfflineFood(targetDate);
  const games = await getOfflineGames(targetDate);
  const watchlist = await getOfflineWatchlist();
  const kanban = await getOfflineKanban();
  const allProjects = await getAll<Project>('projects');
  const allActivities = await getAll<ProjectActivity>('project_activity');

  const projectsActivity = allProjects.map((p) => {
    const dayActs = allActivities.filter((a) => a.projectId === p.id && a.date === targetDate);
    const count = dayActs.reduce((sum, a) => sum + a.count, 0);
    const notes = dayActs.map((a) => a.note).filter(Boolean) as string[];
    return {
      projectName: p.name,
      domainType: p.domainType,
      count,
      notes,
    };
  }).filter((p) => p.count > 0);

  const webhookUrl = await getOfflineSetting('discord_webhook_url');

  const foodGrouped = [
    { tag: 'Breakfast', items: food.breakfast.map((f) => f.itemName) },
    { tag: 'Lunch', items: food.lunch.map((f) => f.itemName) },
    { tag: 'Dinner', items: food.dinner.map((f) => f.itemName) },
    { tag: 'Snack', items: food.snack.map((f) => f.itemName) },
  ].filter((g) => g.items.length > 0);

  const payload: DiscordWebhookPayload = {
    username: 'DDT Activity Ledger',
    embeds: [
      {
        title: `DDT Daily Ledger Recap - ${targetDate}`,
        description: journal.content ? journal.content.slice(0, 200) : 'No journal entry recorded.',
        color: 0x4f46e5,
        fields: [
          { name: 'Meals Logged', value: `${food.all.length} items logged`, inline: true },
          { name: 'Gaming Logged', value: `${games.reduce((sum, g) => sum + g.hours, 0)} hrs`, inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  return {
    date: targetDate,
    formattedDate: targetDate,
    activity: {
      projectsActivity,
      journal: journal.content ? {
        hasEntry: true,
        wordCount: journal.wordCount,
        preview: journal.content.slice(0, 100),
        excerpt: journal.content.slice(0, 100),
      } : null,
      food: foodGrouped,
      games: games.map((g) => ({ title: g.gameName, hours: g.hours })),
      watchlist: watchlist.filter((w) => w.status === 'watching').map((w) => ({
        title: w.title,
        status: w.status,
        mediaType: w.mediaType || 'movie',
      })),
      kanban: kanban.cards.slice(0, 5).map((c) => ({
        title: c.title,
        columnName: kanban.columns.find((col) => col.id === c.columnId)?.name || 'Default',
      })),
    },
    discordPayload: payload,
    hasSavedWebhook: Boolean(webhookUrl?.trim()),
    savedWebhookUrl: webhookUrl || null,
  };
}

// ─── Export / Import Operations ──────────────────────────────────────────────

export async function exportOfflineData(): Promise<any> {
  const allSettings = await getAll('settings');
  const allJournal = await getAll('journal_entries');
  const allColumns = await getAll('kanban_columns');
  const allCards = await getAll('kanban_cards');
  const allWatchlist = await getAll('watchlist_items');
  const allFood = await getAll('food_entries');
  const allGames = await getAll('game_entries');
  const allProjects = await getAll('projects');
  const allActivities = await getAll('project_activity');

  return {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    source: 'offline-indexeddb',
    data: {
      settings: allSettings,
      journalEntries: allJournal,
      kanbanColumns: allColumns,
      kanbanCards: allCards,
      watchlistItems: allWatchlist,
      foodEntries: allFood,
      gameEntries: allGames,
      projects: allProjects,
      projectActivity: allActivities,
    },
  };
}

export async function importOfflineData(payload: any): Promise<{ success: boolean; message: string }> {
  if (!payload || !payload.data) {
    throw new Error('Invalid export file format: missing "data" property.');
  }

  const {
    settings: st,
    journalEntries: journals,
    kanbanColumns: cols,
    kanbanCards: cards,
    watchlistItems: watch,
    foodEntries: foods,
    gameEntries: games,
    projects: projs,
    projectActivity: acts,
  } = payload.data;

  if (Array.isArray(st)) {
    for (const item of st) {
      if (item.key) await putOne('settings', item);
    }
  }
  if (Array.isArray(journals)) {
    for (const item of journals) {
      if (item.date) await putOne('journal_entries', item);
    }
  }
  if (Array.isArray(cols)) {
    for (const item of cols) {
      if (item.id) await putOne('kanban_columns', item);
    }
  }
  if (Array.isArray(cards)) {
    for (const item of cards) {
      if (item.id) await putOne('kanban_cards', item);
    }
  }
  if (Array.isArray(watch)) {
    for (const item of watch) {
      if (item.id) await putOne('watchlist_items', item);
    }
  }
  if (Array.isArray(foods)) {
    for (const item of foods) {
      if (item.id) await putOne('food_entries', item);
    }
  }
  if (Array.isArray(games)) {
    for (const item of games) {
      if (item.id) await putOne('game_entries', item);
    }
  }
  if (Array.isArray(projs)) {
    for (const item of projs) {
      if (item.id) await putOne('projects', item);
    }
  }
  if (Array.isArray(acts)) {
    for (const item of acts) {
      if (item.id) await putOne('project_activity', item);
    }
  }

  return { success: true, message: 'All data successfully imported into local offline database.' };
}
