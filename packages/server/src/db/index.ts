import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';
import path from 'path';
import os from 'os';
import fs from 'fs';

export function getDatabasePath(): string {
  if (process.env.DDT_DB_PATH) {
    return process.env.DDT_DB_PATH;
  }
  const ddtDir = path.join(os.homedir(), '.ddt');
  if (!fs.existsSync(ddtDir)) {
    fs.mkdirSync(ddtDir, { recursive: true });
  }
  return path.join(ddtDir, 'data.db');
}

export type SqliteClient = Client;
export type AppDatabase = ReturnType<typeof drizzle<typeof schema>>;

export interface InitDatabaseResult {
  db: AppDatabase;
  client: SqliteClient;
  dbPath: string;
}

export function initDatabase(dbPath?: string): InitDatabaseResult {
  const targetPath = dbPath || getDatabasePath();
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Normalize path for Windows file URL
  const normalizedPath = targetPath.replace(/\\/g, '/');
  const fileUrl = normalizedPath.startsWith('/') || normalizedPath.includes(':') 
    ? `file:${normalizedPath}` 
    : `file://${normalizedPath}`;

  const client = createClient({
    url: fileUrl,
  });

  // Auto-create tables if they don't exist
  client.batch([
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER
    );`,
    `CREATE TABLE IF NOT EXISTS journal_entries (
      date TEXT PRIMARY KEY,
      content TEXT NOT NULL DEFAULT '',
      created_at INTEGER,
      updated_at INTEGER
    );`,
    `CREATE TABLE IF NOT EXISTS kanban_columns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER
    );`,
    `CREATE TABLE IF NOT EXISTS kanban_cards (
      id TEXT PRIMARY KEY,
      column_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      due_date TEXT,
      tag TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY (column_id) REFERENCES kanban_columns(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS watchlist_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      tmdb_id INTEGER,
      poster_path TEXT,
      status TEXT NOT NULL DEFAULT 'want',
      release_date TEXT,
      media_type TEXT DEFAULT 'movie',
      overview TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );`,
    `CREATE TABLE IF NOT EXISTS food_entries (
      id TEXT PRIMARY KEY,
      item_name TEXT NOT NULL,
      meal_tag TEXT NOT NULL DEFAULT 'breakfast',
      status TEXT NOT NULL DEFAULT 'eaten',
      logged_at TEXT NOT NULL,
      created_at INTEGER
    );`,
    `CREATE TABLE IF NOT EXISTS game_entries (
      id TEXT PRIMARY KEY,
      game_name TEXT NOT NULL,
      hours REAL NOT NULL DEFAULT 1,
      cover_url TEXT,
      logged_at TEXT NOT NULL,
      created_at INTEGER
    );`,
    `CREATE TABLE IF NOT EXISTS api_cache (
      key TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      fetched_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS github_cache (
      key TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      fetched_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'not_started',
      linked_repo TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );`,
    `CREATE TABLE IF NOT EXISTS project_activity (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      date TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 1,
      source TEXT NOT NULL DEFAULT 'manual',
      created_at INTEGER,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );`
  ]).then(async () => {
    // Seed default kanban columns if none exist
    try {
      const existing = await client.execute('SELECT count(*) as count FROM kanban_columns');
      const count = Number(existing.rows[0]?.count ?? 0);
      if (count === 0) {
        const now = Date.now();
        await client.batch([
          { sql: 'INSERT INTO kanban_columns (id, name, position, created_at) VALUES (?, ?, ?, ?)', args: ['col-backlog', 'Backlog', 0, now] },
          { sql: 'INSERT INTO kanban_columns (id, name, position, created_at) VALUES (?, ?, ?, ?)', args: ['col-progress', 'In Progress', 1, now] },
          { sql: 'INSERT INTO kanban_columns (id, name, position, created_at) VALUES (?, ?, ?, ?)', args: ['col-done', 'Done', 2, now] },
        ]);
      }
    } catch (e) {
      console.error('Seeding kanban columns error:', e);
    }
  }).catch((e) => {
    console.error('DB Migration error:', e);
  });

  const db = drizzle(client, { schema });
  return { db, client, dbPath: targetPath };
}
