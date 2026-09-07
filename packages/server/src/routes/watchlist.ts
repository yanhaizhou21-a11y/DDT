import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { watchlistItems, settings, apiCache } from '../db/schema.js';
import type { AppDatabase } from '../db/index.js';

// Helper to evaluate auto-increment for ongoing TV shows on their broadcast air days
async function evaluateAutoIncrements(db: AppDatabase) {
  try {
    const shows = await db
      .select()
      .from(watchlistItems)
      .where(eq(watchlistItems.mediaType, 'tv'));

    const activeShows = shows.filter(
      (s) =>
        s.status === 'watching' &&
        Boolean(s.autoIncrement) &&
        s.airDay !== null &&
        s.airDay !== undefined
    );

    if (activeShows.length === 0) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayDate = new Date(todayStr + 'T00:00:00Z');

    for (const show of activeShows) {
      const airDay = Number(show.airDay);
      const currentEp = show.currentEpisode ?? 0;
      const totalEp = show.totalEpisodes ?? null;

      if (totalEp !== null && currentEp >= totalEp) {
        continue;
      }

      let startDate: Date;
      if (show.lastAirDate) {
        startDate = new Date(show.lastAirDate + 'T00:00:00Z');
        startDate.setUTCDate(startDate.getUTCDate() + 1);
      } else {
        const created = show.createdAt ? new Date(show.createdAt) : new Date();
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        startDate = created > oneWeekAgo ? created : oneWeekAgo;
        startDate = new Date(startDate.toISOString().slice(0, 10) + 'T00:00:00Z');
      }

      let episodesToAdd = 0;
      let latestAirDateStr: string | null = null;
      const iter = new Date(startDate);

      while (iter <= todayDate) {
        if (iter.getUTCDay() === airDay) {
          episodesToAdd++;
          latestAirDateStr = iter.toISOString().slice(0, 10);
        }
        iter.setUTCDate(iter.getUTCDate() + 1);
      }

      if (episodesToAdd > 0 && latestAirDateStr) {
        let newEp = currentEp + episodesToAdd;
        const updates: any = {
          currentEpisode: totalEp !== null ? Math.min(newEp, totalEp) : newEp,
          lastAirDate: latestAirDateStr,
          updatedAt: new Date(),
        };
        // If series finished by auto-increment, mark as watched
        if (totalEp !== null && newEp >= totalEp) {
          updates.status = 'watched';
        }
        await db.update(watchlistItems).set(updates).where(eq(watchlistItems.id, show.id));
      } else if (!show.lastAirDate) {
        await db
          .update(watchlistItems)
          .set({ lastAirDate: todayStr })
          .where(eq(watchlistItems.id, show.id));
      }
    }
  } catch (err) {
    console.error('Failed evaluating auto-increments', err);
  }
}

export function createWatchlistRouter(db: AppDatabase): Router {
  const router = Router();

  // Helper to fetch TMDB API key from DB
  async function getTmdbKey(): Promise<string | null> {
    const row = await db.select().from(settings).where(eq(settings.key, 'tmdb_api_key')).get();
    return row?.value?.trim() || null;
  }

  // GET /api/watchlist
  router.get('/', async (_req, res) => {
    try {
      await evaluateAutoIncrements(db);

      const items = await db.select().from(watchlistItems).orderBy(desc(watchlistItems.createdAt));
      
      // Sort 'want' list: upcoming release date first, then nulls
      const sorted = [...items].sort((a, b) => {
        if (a.status === 'want' && b.status === 'want') {
          if (a.releaseDate && b.releaseDate) {
            return a.releaseDate.localeCompare(b.releaseDate);
          }
          if (a.releaseDate) return -1;
          if (b.releaseDate) return 1;
        }
        return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
      });

      res.json(sorted);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch watchlist' });
    }
  });

  // GET /api/watchlist/search - search TMDB with 24h caching
  router.get('/search', async (req, res) => {
    try {
      const query = String(req.query.query || '').trim();
      if (!query) {
        return res.json([]);
      }

      const apiKey = await getTmdbKey();
      if (!apiKey) {
        return res.status(400).json({ error: 'TMDB API key not configured. Add your key in Settings.' });
      }

      const cacheKey = `tmdb:search:${query.toLowerCase()}`;
      const cached = await db.select().from(apiCache).where(eq(apiCache.key, cacheKey)).get();
      const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

      if (cached && (Date.now() - cached.fetchedAt.getTime() < CACHE_TTL)) {
        return res.json(JSON.parse(cached.payload));
      }

      const isBearer = apiKey.length > 50;
      const url = isBearer
        ? `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`
        : `https://api.themoviedb.org/3/search/multi?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`;

      const response = await fetch(url, {
        headers: isBearer
          ? { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' }
          : { Accept: 'application/json' },
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as any;
        return res.status(response.status).json({ error: errorBody.status_message || 'TMDB search failed' });
      }

      const data = (await response.json()) as any;
      const results = (data.results || [])
        .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
        .map((item: any) => ({
          tmdbId: item.id,
          title: item.title || item.name,
          mediaType: item.media_type,
          posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
          releaseDate: item.release_date || item.first_air_date || null,
          overview: item.overview || '',
        }));

      // Cache result
      const now = new Date();
      if (cached) {
        await db.update(apiCache).set({ payload: JSON.stringify(results), fetchedAt: now }).where(eq(apiCache.key, cacheKey));
      } else {
        await db.insert(apiCache).values({ key: cacheKey, payload: JSON.stringify(results), fetchedAt: now });
      }

      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'TMDB search error' });
    }
  });

  // POST /api/watchlist - add item
  router.post('/', async (req, res) => {
    try {
      const {
        title,
        tmdbId,
        posterPath,
        status,
        releaseDate,
        mediaType,
        overview,
        currentEpisode,
        totalEpisodes,
        autoIncrement,
        airDay,
        lastAirDate,
      } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const id = req.body.id || `watch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date();
      const newItem = {
        id,
        title,
        tmdbId: tmdbId ? Number(tmdbId) : null,
        posterPath: posterPath || null,
        status: status || 'want',
        releaseDate: releaseDate || null,
        mediaType: mediaType || 'movie',
        overview: overview || null,
        currentEpisode: currentEpisode !== undefined && currentEpisode !== null ? Math.max(0, Number(currentEpisode)) : 0,
        totalEpisodes: totalEpisodes ? Math.max(1, Number(totalEpisodes)) : null,
        autoIncrement: autoIncrement ? 1 : 0,
        airDay: airDay !== undefined && airDay !== null && airDay !== '' ? Number(airDay) : null,
        lastAirDate: lastAirDate || null,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(watchlistItems).values(newItem);
      res.json(newItem);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to add watchlist item' });
    }
  });

  // PATCH /api/watchlist/:id/episodes - quick batch/range episode controls (dari awal sampai akhir)
  router.patch('/:id/episodes', async (req, res) => {
    try {
      const { id } = req.params;
      const { action, episode } = req.body; // 'increment', 'decrement', 'complete', 'reset', 'set'

      const item = await db.select().from(watchlistItems).where(eq(watchlistItems.id, id)).get();
      if (!item) {
        return res.status(404).json({ error: 'Watchlist item not found' });
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      const currentEp = item.currentEpisode ?? 0;
      const totalEp = item.totalEpisodes ?? null;
      let newEp = currentEp;
      let newStatus = item.status;

      if (action === 'increment') {
        newEp = totalEp !== null ? Math.min(currentEp + 1, totalEp) : currentEp + 1;
        if (totalEp !== null && newEp >= totalEp) {
          newStatus = 'watched';
        } else if (newStatus === 'want') {
          newStatus = 'watching';
        }
      } else if (action === 'decrement') {
        newEp = Math.max(0, currentEp - 1);
        if (newStatus === 'watched' && totalEp !== null && newEp < totalEp) {
          newStatus = 'watching';
        }
      } else if (action === 'complete') {
        // Dari awal sampai akhir: complete all episodes
        newEp = totalEp ?? currentEp;
        newStatus = 'watched';
      } else if (action === 'reset') {
        // Reset back to episode 0
        newEp = 0;
        newStatus = 'watching';
      } else if (action === 'set') {
        const val = Number(episode);
        newEp = !isNaN(val) ? Math.max(0, totalEp !== null ? Math.min(val, totalEp) : val) : currentEp;
        if (totalEp !== null && newEp >= totalEp) {
          newStatus = 'watched';
        } else if (newStatus === 'watched' && totalEp !== null && newEp < totalEp) {
          newStatus = 'watching';
        }
      }

      const updates: any = {
        currentEpisode: newEp,
        status: newStatus,
        lastAirDate: todayStr, // Mark today so auto-increment won't re-add if user manually logged
        updatedAt: new Date(),
      };

      await db.update(watchlistItems).set(updates).where(eq(watchlistItems.id, id));
      res.json({ success: true, id, ...updates });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update episodes' });
    }
  });

  // PATCH /api/watchlist/:id - update status or details
  router.patch('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const {
        status,
        title,
        posterPath,
        releaseDate,
        overview,
        currentEpisode,
        totalEpisodes,
        autoIncrement,
        airDay,
        lastAirDate,
      } = req.body;
      const updates: any = { updatedAt: new Date() };

      if (status !== undefined) updates.status = status;
      if (title !== undefined) updates.title = title;
      if (posterPath !== undefined) updates.posterPath = posterPath;
      if (releaseDate !== undefined) updates.releaseDate = releaseDate;
      if (overview !== undefined) updates.overview = overview;
      if (currentEpisode !== undefined) {
        updates.currentEpisode = currentEpisode !== null ? Math.max(0, Number(currentEpisode)) : 0;
        // User manually set episode: sync lastAirDate to today so auto-increment doesn't double-add
        updates.lastAirDate = new Date().toISOString().slice(0, 10);
      }
      if (totalEpisodes !== undefined) {
        updates.totalEpisodes = totalEpisodes !== null && totalEpisodes !== '' ? Math.max(1, Number(totalEpisodes)) : null;
      }
      if (autoIncrement !== undefined) {
        updates.autoIncrement = autoIncrement ? 1 : 0;
      }
      if (airDay !== undefined) {
        updates.airDay = airDay !== null && airDay !== '' ? Number(airDay) : null;
      }
      if (lastAirDate !== undefined) {
        updates.lastAirDate = lastAirDate;
      }

      await db.update(watchlistItems).set(updates).where(eq(watchlistItems.id, id));
      res.json({ success: true, id, ...updates });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update item' });
    }
  });

  // DELETE /api/watchlist/:id
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(watchlistItems).where(eq(watchlistItems.id, id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete item' });
    }
  });

  return router;
}
