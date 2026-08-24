import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { settings, journalEntries, kanbanColumns, kanbanCards, watchlistItems, foodEntries, gameEntries } from '../db/schema.js';
import type { AppDatabase, SqliteClient } from '../db/index.js';

export function createSettingsRouter(db: AppDatabase, client: SqliteClient, dbPath: string): Router {
  const router = Router();

  // GET /api/settings
  router.get('/', async (_req, res) => {
    try {
      const allSettings = await db.select().from(settings);
      const settingsMap: Record<string, string> = {};
      for (const item of allSettings) {
        settingsMap[item.key] = item.value;
      }

      res.json({
        settings: settingsMap,
        flags: {
          hasGithubKey: Boolean(settingsMap.github_token?.trim()),
          hasTmdbKey: Boolean(settingsMap.tmdb_api_key?.trim() || settingsMap.tmdb_access_token?.trim()),
          hasRawgKey: Boolean(settingsMap.rawg_api_key?.trim()),
        },
        dbPath,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch settings' });
    }
  });

  // POST /api/settings
  router.post('/', async (req, res) => {
    try {
      const entries = Object.entries(req.body as Record<string, string>);
      for (const [key, value] of entries) {
        const rows = await db.select().from(settings).where(eq(settings.key, key));
        const existing = rows[0];
        if (existing) {
          await db.update(settings).set({ value: String(value ?? ''), updatedAt: new Date() }).where(eq(settings.key, key));
        } else {
          await db.insert(settings).values({ key, value: String(value ?? '') });
        }
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update settings' });
    }
  });

  // POST /api/settings/test-github
  router.post('/test-github', async (req, res) => {
    try {
      let token = req.body?.token;
      if (!token) {
        const rows = await db.select().from(settings).where(eq(settings.key, 'github_token'));
        token = rows[0]?.value;
      }
      if (!token) {
        return res.status(400).json({ valid: false, message: 'No GitHub token provided.' });
      }

      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'DDT-Dashboard/1.0',
        },
      });

      if (response.ok) {
        const user = (await response.json()) as any;
        return res.json({ valid: true, username: user.login, name: user.name });
      } else {
        const err = (await response.json().catch(() => ({}))) as any;
        return res.status(400).json({ valid: false, message: err.message || 'Invalid GitHub token. Check permissions (repo, read:user).' });
      }
    } catch (err: any) {
      return res.status(500).json({ valid: false, message: err.message || 'Network error verifying GitHub token.' });
    }
  });

  // POST /api/settings/test-tmdb
  router.post('/test-tmdb', async (req, res) => {
    try {
      let apiKey = req.body?.apiKey;
      if (!apiKey) {
        const rows = await db.select().from(settings).where(eq(settings.key, 'tmdb_api_key'));
        apiKey = rows[0]?.value;
      }
      if (!apiKey) {
        return res.status(400).json({ valid: false, message: 'No TMDB API key provided.' });
      }

      const isBearer = apiKey.length > 50;
      const url = isBearer
        ? 'https://api.themoviedb.org/3/authentication'
        : `https://api.themoviedb.org/3/authentication?api_key=${encodeURIComponent(apiKey.trim())}`;
      
      const response = await fetch(url, {
        headers: isBearer
          ? { Authorization: `Bearer ${apiKey.trim()}`, Accept: 'application/json' }
          : { Accept: 'application/json' },
      });

      if (response.ok) {
        return res.json({ valid: true, message: 'TMDB connected successfully.' });
      } else {
        return res.status(400).json({ valid: false, message: 'Invalid TMDB API key or Access Token.' });
      }
    } catch (err: any) {
      return res.status(500).json({ valid: false, message: err.message || 'Network error verifying TMDB key.' });
    }
  });

  // POST /api/settings/test-rawg
  router.post('/test-rawg', async (req, res) => {
    try {
      let apiKey = req.body?.apiKey;
      if (!apiKey) {
        const rows = await db.select().from(settings).where(eq(settings.key, 'rawg_api_key'));
        apiKey = rows[0]?.value;
      }
      if (!apiKey) {
        return res.status(400).json({ valid: false, message: 'No RAWG API key provided.' });
      }

      const response = await fetch(`https://api.rawg.io/api/games?key=${encodeURIComponent(apiKey.trim())}&page_size=1`);
      if (response.ok) {
        return res.json({ valid: true, message: 'RAWG connected successfully.' });
      } else {
        return res.status(400).json({ valid: false, message: 'Invalid RAWG API key.' });
      }
    } catch (err: any) {
      return res.status(500).json({ valid: false, message: err.message || 'Network error verifying RAWG key.' });
    }
  });

  // GET /api/settings/export
  router.get('/export', async (_req, res) => {
    try {
      const allSettings = await db.select().from(settings);
      const allJournal = await db.select().from(journalEntries);
      const allColumns = await db.select().from(kanbanColumns);
      const allCards = await db.select().from(kanbanCards);
      const allWatchlist = await db.select().from(watchlistItems);
      const allFood = await db.select().from(foodEntries);
      const allGames = await db.select().from(gameEntries);

      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        data: {
          settings: allSettings,
          journalEntries: allJournal,
          kanbanColumns: allColumns,
          kanbanCards: allCards,
          watchlistItems: allWatchlist,
          foodEntries: allFood,
          gameEntries: allGames,
        },
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=ddt-export-${new Date().toISOString().slice(0, 10)}.json`);
      res.send(JSON.stringify(exportData, null, 2));
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to export data' });
    }
  });

  // POST /api/settings/import
  router.post('/import', async (req, res) => {
    try {
      const payload = req.body;
      if (!payload || !payload.data) {
        return res.status(400).json({ error: 'Invalid export file structure.' });
      }

      const { journalEntries: journals, kanbanColumns: cols, kanbanCards: cards, watchlistItems: watch, foodEntries: foods, gameEntries: games, settings: st } = payload.data;
      const statements: { sql: string; args: any[] }[] = [];

      if (Array.isArray(st)) {
        for (const s of st) {
          statements.push({
            sql: 'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
            args: [s.key, s.value, Date.now()],
          });
        }
      }
      if (Array.isArray(journals)) {
        for (const j of journals) {
          statements.push({
            sql: 'INSERT OR REPLACE INTO journal_entries (date, content, created_at, updated_at) VALUES (?, ?, ?, ?)',
            args: [
              j.date,
              j.content || '',
              j.createdAt ? new Date(j.createdAt).getTime() : Date.now(),
              j.updatedAt ? new Date(j.updatedAt).getTime() : Date.now(),
            ],
          });
        }
      }
      if (Array.isArray(cols)) {
        for (const c of cols) {
          statements.push({
            sql: 'INSERT OR REPLACE INTO kanban_columns (id, name, position, created_at) VALUES (?, ?, ?, ?)',
            args: [c.id, c.name, c.position ?? 0, c.createdAt ? new Date(c.createdAt).getTime() : Date.now()],
          });
        }
      }
      if (Array.isArray(cards)) {
        for (const c of cards) {
          statements.push({
            sql: 'INSERT OR REPLACE INTO kanban_cards (id, column_id, title, description, due_date, tag, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            args: [
              c.id,
              c.columnId,
              c.title,
              c.description || '',
              c.dueDate || null,
              c.tag || null,
              c.position ?? 0,
              c.createdAt ? new Date(c.createdAt).getTime() : Date.now(),
              c.updatedAt ? new Date(c.updatedAt).getTime() : Date.now(),
            ],
          });
        }
      }
      if (Array.isArray(watch)) {
        for (const w of watch) {
          statements.push({
            sql: 'INSERT OR REPLACE INTO watchlist_items (id, title, tmdb_id, poster_path, status, release_date, media_type, overview, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            args: [
              w.id,
              w.title,
              w.tmdbId || null,
              w.posterPath || null,
              w.status || 'want',
              w.releaseDate || null,
              w.mediaType || 'movie',
              w.overview || null,
              w.createdAt ? new Date(w.createdAt).getTime() : Date.now(),
              w.updatedAt ? new Date(w.updatedAt).getTime() : Date.now(),
            ],
          });
        }
      }
      if (Array.isArray(foods)) {
        for (const f of foods) {
          statements.push({
            sql: 'INSERT OR REPLACE INTO food_entries (id, item_name, meal_tag, status, logged_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            args: [
              f.id,
              f.itemName,
              f.mealTag || 'breakfast',
              f.status || 'eaten',
              f.loggedAt || new Date().toISOString().slice(0, 10),
              f.createdAt ? new Date(f.createdAt).getTime() : Date.now(),
            ],
          });
        }
      }
      if (Array.isArray(games)) {
        for (const g of games) {
          statements.push({
            sql: 'INSERT OR REPLACE INTO game_entries (id, game_name, hours, cover_url, logged_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            args: [
              g.id,
              g.gameName,
              g.hours ?? 1,
              g.coverUrl || null,
              g.loggedAt || new Date().toISOString().slice(0, 10),
              g.createdAt ? new Date(g.createdAt).getTime() : Date.now(),
            ],
          });
        }
      }

      if (statements.length > 0) {
        await client.batch(statements);
      }

      res.json({ success: true, message: 'Data imported successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to import data' });
    }
  });

  return router;
}
