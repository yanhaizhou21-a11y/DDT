import { Router } from 'express';
import { eq, asc } from 'drizzle-orm';
import { kanbanColumns, kanbanCards } from '../db/schema.js';
import type { AppDatabase, SqliteClient } from '../db/index.js';

export function createKanbanRouter(db: AppDatabase, client: SqliteClient): Router {
  const router = Router();

  // GET /api/kanban - list all columns and cards
  router.get('/', async (_req, res) => {
    try {
      const columns = await db.select().from(kanbanColumns).orderBy(asc(kanbanColumns.position));
      const cards = await db.select().from(kanbanCards).orderBy(asc(kanbanCards.position));
      res.json({ columns, cards });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch kanban data' });
    }
  });

  // POST /api/kanban/columns - create column
  router.post('/columns', async (req, res) => {
    try {
      const { name, id, position } = req.body;
      const colId = id || `col-${Date.now()}`;
      const cols = await db.select().from(kanbanColumns);
      const pos = typeof position === 'number' ? position : cols.length;

      const newCol = {
        id: colId,
        name: name || 'New Column',
        position: pos,
        createdAt: new Date(),
      };

      await db.insert(kanbanColumns).values(newCol);
      res.json(newCol);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create column' });
    }
  });

  // PATCH /api/kanban/columns/:id - rename or move column
  router.patch('/columns/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, position } = req.body;
      const updates: any = {};
      if (typeof name === 'string') updates.name = name;
      if (typeof position === 'number') updates.position = position;

      await db.update(kanbanColumns).set(updates).where(eq(kanbanColumns.id, id));
      res.json({ success: true, id, ...updates });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update column' });
    }
  });

  // DELETE /api/kanban/columns/:id
  router.delete('/columns/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await client.batch([
        { sql: 'DELETE FROM kanban_cards WHERE column_id = ?', args: [id] },
        { sql: 'DELETE FROM kanban_columns WHERE id = ?', args: [id] },
      ]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete column' });
    }
  });

  // POST /api/kanban/cards - create card
  router.post('/cards', async (req, res) => {
    try {
      const { columnId, title, description, dueDate, tag, position } = req.body;
      if (!columnId || !title) {
        return res.status(400).json({ error: 'columnId and title are required' });
      }

      const cardId = req.body.id || `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const existingCards = await db.select().from(kanbanCards).where(eq(kanbanCards.columnId, columnId));
      const pos = typeof position === 'number' ? position : existingCards.length;

      const now = new Date();
      const newCard = {
        id: cardId,
        columnId,
        title,
        description: description || '',
        dueDate: dueDate || null,
        tag: tag || null,
        position: pos,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(kanbanCards).values(newCard);
      res.json(newCard);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create card' });
    }
  });

  // PATCH /api/kanban/cards/:id - update card
  router.patch('/cards/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { columnId, title, description, dueDate, tag, position } = req.body;
      const updates: any = { updatedAt: new Date() };

      if (columnId !== undefined) updates.columnId = columnId;
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (dueDate !== undefined) updates.dueDate = dueDate;
      if (tag !== undefined) updates.tag = tag;
      if (position !== undefined) updates.position = position;

      await db.update(kanbanCards).set(updates).where(eq(kanbanCards.id, id));
      res.json({ success: true, id, ...updates });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update card' });
    }
  });

  // POST /api/kanban/reorder - batch update cards and columns
  router.post('/reorder', async (req, res) => {
    try {
      const { columns, cards } = req.body;
      const statements: { sql: string; args: any[] }[] = [];

      if (Array.isArray(columns)) {
        for (let i = 0; i < columns.length; i++) {
          statements.push({
            sql: 'UPDATE kanban_columns SET position = ? WHERE id = ?',
            args: [i, columns[i].id],
          });
        }
      }

      if (Array.isArray(cards)) {
        const now = Date.now();
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          statements.push({
            sql: 'UPDATE kanban_cards SET column_id = ?, position = ?, updated_at = ? WHERE id = ?',
            args: [c.columnId, c.position ?? i, now, c.id],
          });
        }
      }

      if (statements.length > 0) {
        await client.batch(statements);
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to reorder' });
    }
  });

  // DELETE /api/kanban/cards/:id
  router.delete('/cards/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(kanbanCards).where(eq(kanbanCards.id, id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete card' });
    }
  });

  return router;
}
