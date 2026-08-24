import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { watchlistItems, settings, apiCache } from '../db/schema.js';
import type { AppDatabase } from '../db/index.js';

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
      const { title, tmdbId, posterPath, status, releaseDate, mediaType, overview } = req.body;
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
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(watchlistItems).values(newItem);
      res.json(newItem);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to add watchlist item' });
    }
  });

  // PATCH /api/watchlist/:id - update status or details
  router.patch('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, title, posterPath, releaseDate, overview } = req.body;
      const updates: any = { updatedAt: new Date() };

      if (status !== undefined) updates.status = status;
      if (title !== undefined) updates.title = title;
      if (posterPath !== undefined) updates.posterPath = posterPath;
      if (releaseDate !== undefined) updates.releaseDate = releaseDate;
      if (overview !== undefined) updates.overview = overview;

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
