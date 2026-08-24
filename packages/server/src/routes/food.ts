import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { foodEntries } from '../db/schema.js';
import type { AppDatabase } from '../db/index.js';

export function createFoodRouter(db: AppDatabase): Router {
  const router = Router();

  // GET /api/food/stats/history - 30/90 days count for dot-ledger
  router.get('/stats/history', async (_req, res) => {
    try {
      const all = await db.select().from(foodEntries);
      const map: Record<string, number> = {};
      for (const entry of all) {
        map[entry.loggedAt] = (map[entry.loggedAt] || 0) + 1;
      }
      res.json(map);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch food stats' });
    }
  });

  // GET /api/food?date=YYYY-MM-DD
  router.get('/', async (req, res) => {
    try {
      const date = req.query.date as string | undefined;
      let entries;
      if (date) {
        entries = await db.select().from(foodEntries).where(eq(foodEntries.loggedAt, date)).orderBy(desc(foodEntries.createdAt));
      } else {
        entries = await db.select().from(foodEntries).orderBy(desc(foodEntries.createdAt));
      }

      // Group by meal_tag
      const grouped = {
        breakfast: entries.filter((e) => e.mealTag === 'breakfast'),
        lunch: entries.filter((e) => e.mealTag === 'lunch'),
        dinner: entries.filter((e) => e.mealTag === 'dinner'),
        snack: entries.filter((e) => e.mealTag === 'snack'),
        all: entries,
      };

      res.json(grouped);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch food entries' });
    }
  });

  // POST /api/food
  router.post('/', async (req, res) => {
    try {
      const { itemName, mealTag, status, loggedAt } = req.body;
      if (!itemName) {
        return res.status(400).json({ error: 'Item name is required' });
      }

      const id = req.body.id || `food-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const dateStr = loggedAt || new Date().toISOString().slice(0, 10);
      const newEntry = {
        id,
        itemName,
        mealTag: mealTag || 'breakfast',
        status: status || 'eaten',
        loggedAt: dateStr,
        createdAt: new Date(),
      };

      await db.insert(foodEntries).values(newEntry);
      res.json(newEntry);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to log food' });
    }
  });

  // PATCH /api/food/:id
  router.patch('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, itemName, mealTag } = req.body;
      const updates: any = {};
      if (status !== undefined) updates.status = status;
      if (itemName !== undefined) updates.itemName = itemName;
      if (mealTag !== undefined) updates.mealTag = mealTag;

      await db.update(foodEntries).set(updates).where(eq(foodEntries.id, id));
      res.json({ success: true, id, ...updates });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update food entry' });
    }
  });

  // DELETE /api/food/:id
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(foodEntries).where(eq(foodEntries.id, id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete food entry' });
    }
  });

  return router;
}
