import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { journalEntries } from '../db/schema.js';
import type { AppDatabase } from '../db/index.js';

export function createJournalRouter(db: AppDatabase): Router {
  const router = Router();

  // GET /api/journal/stats/heatmap - 365 days dot-ledger & calendar activity
  router.get('/stats/heatmap', async (_req, res) => {
    try {
      const all = await db.select().from(journalEntries);
      const map: Record<string, { wordCount: number; hasEntry: boolean }> = {};
      for (const entry of all) {
        const words = entry.content.trim() ? entry.content.trim().split(/\s+/).length : 0;
        map[entry.date] = {
          wordCount: words,
          hasEntry: words > 0 || entry.content.length > 0,
        };
      }
      res.json(map);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch journal stats' });
    }
  });

  // GET /api/journal - list all entries
  router.get('/', async (_req, res) => {
    try {
      const entries = await db.select().from(journalEntries).orderBy(desc(journalEntries.date));
      const summarized = entries.map((e) => {
        const words = e.content.trim() ? e.content.trim().split(/\s+/).length : 0;
        const preview = e.content.slice(0, 140);
        return {
          date: e.date,
          wordCount: words,
          preview,
          updatedAt: e.updatedAt,
        };
      });
      res.json(summarized);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch journal entries' });
    }
  });

  // GET /api/journal/:date
  router.get('/:date', async (req, res) => {
    try {
      const { date } = req.params;
      const entry = await db.select().from(journalEntries).where(eq(journalEntries.date, date)).get();
      if (!entry) {
        return res.json({ date, content: '', wordCount: 0, exists: false });
      }
      const words = entry.content.trim() ? entry.content.trim().split(/\s+/).length : 0;
      res.json({
        date: entry.date,
        content: entry.content,
        wordCount: words,
        updatedAt: entry.updatedAt,
        exists: true,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch journal entry' });
    }
  });

  // POST /api/journal/:date - autosave
  router.post('/:date', async (req, res) => {
    try {
      const { date } = req.params;
      const { content } = req.body;
      const safeContent = typeof content === 'string' ? content : '';
      const now = new Date();

      const existing = await db.select().from(journalEntries).where(eq(journalEntries.date, date)).get();
      if (existing) {
        await db
          .update(journalEntries)
          .set({ content: safeContent, updatedAt: now })
          .where(eq(journalEntries.date, date));
      } else {
        await db.insert(journalEntries).values({
          date,
          content: safeContent,
          createdAt: now,
          updatedAt: now,
        });
      }

      const words = safeContent.trim() ? safeContent.trim().split(/\s+/).length : 0;
      res.json({
        success: true,
        date,
        wordCount: words,
        updatedAt: now,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save journal entry' });
    }
  });

  // DELETE /api/journal/:date
  router.delete('/:date', async (req, res) => {
    try {
      const { date } = req.params;
      await db.delete(journalEntries).where(eq(journalEntries.date, date));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete journal entry' });
    }
  });

  return router;
}
