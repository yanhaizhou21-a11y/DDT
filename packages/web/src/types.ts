export type RouteTab =
  | 'home'
  | 'dev'
  | 'projects'
  | 'watchlist'
  | 'kanban'
  | 'journal'
  | 'food'
  | 'games'
  | 'settings';

export type ProjectDomainType = 'software' | 'graphic_design' | 'game_dev' | 'video_photo';
export type ProjectStatus = 'not_started' | 'in_progress' | 'ready';

export interface Project {
  id: string;
  name: string;
  domainType: ProjectDomainType;
  status: ProjectStatus;
  linkedRepo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectActivity {
  id: string;
  projectId: string;
  date: string; // YYYY-MM-DD
  count: number;
  note?: string | null;
  source: 'github' | 'manual';
  createdAt?: string;
}

export interface ProjectWithStats extends Project {
  isRepoLinked: boolean;
  recentActivity: { date: string; value: number }[];
  totalActivity: number;
  lastActiveDate: string | null;
  repoError?: string;
}

export interface ProjectDetailResponse extends Project {
  isRepoLinked: boolean;
  activity: { date: string; count: number; level: number }[];
  recentActivity: { date: string; value: number }[];
  totalActivity: number;
  todayCount: number;
  lastCommit?: {
    sha: string;
    message: string;
    author: string;
    date: string;
    htmlUrl?: string;
  } | null;
  repoError?: string;
  entries?: ProjectActivity[];
}

export interface SettingsMap {
  github_token?: string;
  tmdb_api_key?: string;
  rawg_api_key?: string;
  [key: string]: string | undefined;
}

export interface SettingsResponse {
  settings: SettingsMap;
  flags: {
    hasGithubKey: boolean;
    hasTmdbKey: boolean;
    hasRawgKey: boolean;
  };
  dbPath: string;
}

export interface JournalEntry {
  date: string; // YYYY-MM-DD
  content: string;
  wordCount: number;
  updatedAt: string | null;
  exists?: boolean;
}

export interface JournalSummary {
  date: string;
  wordCount: number;
  preview: string;
  updatedAt: string;
}

export interface KanbanCard {
  id: string;
  columnId: string;
  title: string;
  description?: string | null;
  dueDate?: string | null; // YYYY-MM-DD
  tag?: string | null;
  position: number;
  createdAt?: string;
  updatedAt?: string;
  isOverdue?: boolean;
}

export interface KanbanColumn {
  id: string;
  name: string;
  position: number;
  createdAt?: string;
}

export interface WatchlistItem {
  id: string;
  title: string;
  tmdbId?: number | null;
  posterPath?: string | null;
  status: 'watching' | 'want' | 'watched';
  releaseDate?: string | null;
  mediaType?: 'movie' | 'tv' | null;
  overview?: string | null;
  createdAt?: string;
}

export interface TMDBSearchResult {
  tmdbId: number;
  title: string;
  mediaType: 'movie' | 'tv';
  posterPath: string | null;
  releaseDate: string | null;
  overview: string;
}

export interface FoodEntry {
  id: string;
  itemName: string;
  mealTag: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  status: 'eaten' | 'want';
  loggedAt: string; // YYYY-MM-DD
  createdAt?: string;
}

export interface FoodGroupedResponse {
  breakfast: FoodEntry[];
  lunch: FoodEntry[];
  dinner: FoodEntry[];
  snack: FoodEntry[];
  all: FoodEntry[];
}

export interface GameEntry {
  id: string;
  gameName: string;
  hours: number;
  coverUrl?: string | null;
  loggedAt: string; // YYYY-MM-DD
  createdAt?: string;
}

export interface GameLibraryItem {
  gameName: string;
  coverUrl: string | null;
  totalHours: number;
  sessionCount: number;
  lastPlayed: string;
  firstPlayed: string;
  sessions: GameEntry[];
}


export interface RAWGSearchResult {
  id: number;
  name: string;
  coverUrl: string | null;
  released: string | null;
  rating: number | null;
}

export interface GameStatsResponse {
  totalHours: number;
  thisWeekHours: number;
  topGameThisWeek: { name: string; hours: number } | null;
  historyMap: Record<string, number>;
}

export interface GithubDay {
  contributionCount: number;
  date: string;
  weekday: number;
  color: string;
}

export interface GithubWeek {
  contributionDays: GithubDay[];
}

export interface GithubContributionsResponse {
  user: {
    login: string;
    name: string;
    avatarUrl: string;
  };
  totalContributions: number;
  weeks: GithubWeek[];
  fetchedAt: string;
}

export interface GithubCommit {
  message: string;
  sha: string;
  author: string;
  date: string;
}

export interface GithubRepo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  htmlUrl: string;
  description: string | null;
  pushedAt: string;
  language: string | null;
  stargazersCount: number;
  lastCommit: GithubCommit | null;
}

export interface DashboardResponse {
  today: string;
  journal: JournalEntry & { hasWritten: boolean };
  kanbanDue: KanbanCard[];
  inTheaterSoon: WatchlistItem[];
  foodToday: {
    count: number;
    items: FoodEntry[];
  };
  gameToday: {
    hours: number;
    items: GameEntry[];
  };
  dotLedgers: {
    days: string[];
    journal: { date: string; value: number }[];
    food: { date: string; value: number }[];
    game: { date: string; value: number }[];
    github: { date: string; value: number }[];
  };
  github: {
    hasToken: boolean;
    username?: string;
    avatarUrl?: string;
    todayCommits: number;
    totalYearCommits?: number;
  };
}

