import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const journalEntries = sqliteTable('journal_entries', {
  date: text('date').primaryKey(), // YYYY-MM-DD
  content: text('content').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const kanbanColumns = sqliteTable('kanban_columns', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const kanbanCards = sqliteTable('kanban_cards', {
  id: text('id').primaryKey(),
  columnId: text('column_id').notNull().references(() => kanbanColumns.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').default(''),
  dueDate: text('due_date'), // YYYY-MM-DD or ISO
  tag: text('tag'),
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const watchlistItems = sqliteTable('watchlist_items', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  tmdbId: integer('tmdb_id'),
  posterPath: text('poster_path'),
  status: text('status', { enum: ['watching', 'want', 'watched'] }).notNull().default('want'),
  releaseDate: text('release_date'), // YYYY-MM-DD
  mediaType: text('media_type', { enum: ['movie', 'tv'] }).default('movie'),
  overview: text('overview'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const foodEntries = sqliteTable('food_entries', {
  id: text('id').primaryKey(),
  itemName: text('item_name').notNull(),
  mealTag: text('meal_tag', { enum: ['breakfast', 'lunch', 'dinner', 'snack'] }).notNull().default('breakfast'),
  status: text('status', { enum: ['eaten', 'want'] }).notNull().default('eaten'),
  loggedAt: text('logged_at').notNull(), // YYYY-MM-DD
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const gameEntries = sqliteTable('game_entries', {
  id: text('id').primaryKey(),
  gameName: text('game_name').notNull(),
  hours: real('hours').notNull().default(1),
  coverUrl: text('cover_url'),
  loggedAt: text('logged_at').notNull(), // YYYY-MM-DD
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const apiCache = sqliteTable('api_cache', {
  key: text('key').primaryKey(),
  payload: text('payload').notNull(), // JSON string
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
});

export const githubCache = sqliteTable('github_cache', {
  key: text('key').primaryKey(),
  payload: text('payload').notNull(),
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
});

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  domainType: text('domain_type', {
    enum: ['software', 'graphic_design', 'game_dev', 'video_photo'],
  }).notNull(),
  status: text('status', {
    enum: ['not_started', 'in_progress', 'ready'],
  }).notNull().default('not_started'),
  linkedRepo: text('linked_repo'), // e.g. "owner/repo"
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const projectActivity = sqliteTable('project_activity', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // YYYY-MM-DD
  count: integer('count').notNull().default(1),
  source: text('source', { enum: ['github', 'manual'] }).notNull().default('manual'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
