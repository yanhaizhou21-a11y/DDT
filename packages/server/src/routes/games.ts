import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { gameEntries, settings, apiCache } from '../db/schema.js';
import type { AppDatabase } from '../db/index.js';

export function createGamesRouter(db: AppDatabase): Router {
  const router = Router();

  async function getRawgKey(): Promise<string | null> {
    const row = await db.select().from(settings).where(eq(settings.key, 'rawg_api_key')).get();
    return row?.value?.trim() || null;
  }

  // GET /api/games/stats - summaries & dot-ledger history
  router.get('/stats', async (_req, res) => {
    try {
      const all = await db.select().from(gameEntries).orderBy(desc(gameEntries.loggedAt));
      let totalHours = 0;
      const historyMap: Record<string, number> = {};
      const gameTotalsThisWeek: Record<string, number> = {};

      const now = new Date();
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      const oneWeekAgoStr = oneWeekAgo.toISOString().slice(0, 10);

      let thisWeekHours = 0;

      for (const entry of all) {
        totalHours += entry.hours;
        historyMap[entry.loggedAt] = (historyMap[entry.loggedAt] || 0) + entry.hours;

        if (entry.loggedAt >= oneWeekAgoStr) {
          thisWeekHours += entry.hours;
          gameTotalsThisWeek[entry.gameName] = (gameTotalsThisWeek[entry.gameName] || 0) + entry.hours;
        }
      }

      let topGameThisWeek: { name: string; hours: number } | null = null;
      for (const [name, hours] of Object.entries(gameTotalsThisWeek)) {
        if (!topGameThisWeek || hours > topGameThisWeek.hours) {
          topGameThisWeek = { name, hours };
        }
      }

      res.json({
        totalHours: Math.round(totalHours * 10) / 10,
        thisWeekHours: Math.round(thisWeekHours * 10) / 10,
        topGameThisWeek,
        historyMap,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to calculate game stats' });
    }
  });

  // GET /api/games/search - search RAWG
  router.get('/search', async (req, res) => {
    try {
      const query = String(req.query.query || '').trim();
      if (!query) {
        return res.json([]);
      }

      const apiKey = await getRawgKey();
      if (!apiKey) {
        return res.status(400).json({ error: 'RAWG API key not configured. Add your key in Settings.' });
      }

      const cacheKey = `rawg:search:${query.toLowerCase()}`;
      const cached = await db.select().from(apiCache).where(eq(apiCache.key, cacheKey)).get();
      const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

      if (cached && (Date.now() - cached.fetchedAt.getTime() < CACHE_TTL)) {
        return res.json(JSON.parse(cached.payload));
      }

      const url = `https://api.rawg.io/api/games?key=${encodeURIComponent(apiKey)}&search=${encodeURIComponent(query)}&page_size=6`;
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(response.status).json({ error: 'RAWG search failed' });
      }

      const data = (await response.json()) as any;
      const results = (data.results || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        coverUrl: g.background_image || null,
        released: g.released || null,
        rating: g.rating || null,
      }));

      const now = new Date();
      if (cached) {
        await db.update(apiCache).set({ payload: JSON.stringify(results), fetchedAt: now }).where(eq(apiCache.key, cacheKey));
      } else {
        await db.insert(apiCache).values({ key: cacheKey, payload: JSON.stringify(results), fetchedAt: now });
      }

      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'RAWG search error' });
    }
  });

  // GET /api/games
  router.get('/', async (req, res) => {
    try {
      const date = req.query.date as string | undefined;
      let entries;
      if (date) {
        entries = await db.select().from(gameEntries).where(eq(gameEntries.loggedAt, date)).orderBy(desc(gameEntries.createdAt));
      } else {
        entries = await db.select().from(gameEntries).orderBy(desc(gameEntries.loggedAt), desc(gameEntries.createdAt));
      }
      res.json(entries);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch game logs' });
    }
  });

  // POST /api/games
  router.post('/', async (req, res) => {
    try {
      const { gameName, hours, coverUrl, loggedAt } = req.body;
      if (!gameName) {
        return res.status(400).json({ error: 'Game name is required' });
      }

      const id = req.body.id || `game-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const dateStr = loggedAt || new Date().toISOString().slice(0, 10);
      const parsedHours = Number(hours) || 1;

      const newEntry = {
        id,
        gameName,
        hours: parsedHours,
        coverUrl: coverUrl || null,
        loggedAt: dateStr,
        createdAt: new Date(),
      };

      await db.insert(gameEntries).values(newEntry);
      res.json(newEntry);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to log game' });
    }
  });

  // DELETE /api/games/:id
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(gameEntries).where(eq(gameEntries.id, id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete game entry' });
    }
  });

  return router;
}
