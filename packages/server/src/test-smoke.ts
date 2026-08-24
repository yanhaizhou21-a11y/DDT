import { createServer } from './server.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

async function runSmokeTest() {
  console.log('--- Starting DDT Smoke Test ---');
  const tempDbPath = path.join(os.tmpdir(), `ddt-test-${Date.now()}.db`);

  try {
    const { app, db, client, dbPath } = createServer({ dbPath: tempDbPath });
    console.log(`[Test] Server created with DB at ${dbPath}`);

    // Wait a brief moment for initial batch table creation
    await new Promise((r) => setTimeout(r, 200));

    // 1. Seed Kanban Columns
    const now = Date.now();
    await client.batch([
      { sql: 'INSERT OR REPLACE INTO kanban_columns (id, name, position, created_at) VALUES (?, ?, ?, ?)', args: ['col-backlog', 'Backlog', 0, now] },
      { sql: 'INSERT OR REPLACE INTO kanban_columns (id, name, position, created_at) VALUES (?, ?, ?, ?)', args: ['col-progress', 'In Progress', 1, now] },
      { sql: 'INSERT OR REPLACE INTO kanban_columns (id, name, position, created_at) VALUES (?, ?, ?, ?)', args: ['col-done', 'Done', 2, now] },
    ]);

    const colsRes = await client.execute('SELECT * FROM kanban_columns ORDER BY position ASC');
    const cols = colsRes.rows;
    console.log(`[Test] Seeded Kanban Columns: ${cols.map((c: any) => c.name).join(', ')}`);

    // 2. Insert test Kanban card
    await client.execute({
      sql: 'INSERT INTO kanban_cards (id, column_id, title, description, due_date, tag, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [
        'test-card-1',
        'col-backlog',
        'Deploy DDT to production',
        'Test description',
        '2026-08-30',
        'Dev',
        0,
        now,
        now,
      ],
    });
    console.log('[Test] Kanban card inserted successfully');

    // 3. Test Journal Entry & Autosave
    const today = '2026-08-24';
    await client.execute({
      sql: 'INSERT OR REPLACE INTO journal_entries (date, content, created_at, updated_at) VALUES (?, ?, ?, ?)',
      args: [
        today,
        '# Daily Log\nSuccessfully implemented DDT dashboard modules according to PRD and design.md specs.',
        now,
        now,
      ],
    });
    console.log('[Test] Journal entry saved');

    // 4. Test Food Entry
    await client.execute({
      sql: 'INSERT INTO food_entries (id, item_name, meal_tag, status, logged_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [
        'food-test-1',
        'Japanese Ramen with Soft-Boiled Egg',
        'dinner',
        'eaten',
        today,
        now,
      ],
    });
    console.log('[Test] Food entry logged');

    // 5. Test Game Entry
    await client.execute({
      sql: 'INSERT INTO game_entries (id, game_name, hours, cover_url, logged_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [
        'game-test-1',
        'Hollow Knight',
        2.5,
        null,
        today,
        now,
      ],
    });
    console.log('[Test] Game entry logged');

    // 6. Test Watchlist Item
    await client.execute({
      sql: 'INSERT INTO watchlist_items (id, title, tmdb_id, poster_path, status, release_date, media_type, overview, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [
        'watch-test-1',
        'Dune: Part Two',
        693134,
        null,
        'want',
        '2026-09-12',
        'movie',
        'Paul Atreides unites with Chani and the Fremen.',
        now,
        now,
      ],
    });
    console.log('[Test] Watchlist item logged');

    // 7. Verify Database counts
    const jCount = await client.execute('SELECT count(*) as count FROM journal_entries');
    const fCount = await client.execute('SELECT count(*) as count FROM food_entries');
    const gCount = await client.execute('SELECT count(*) as count FROM game_entries');
    const wCount = await client.execute('SELECT count(*) as count FROM watchlist_items');
    const cCount = await client.execute('SELECT count(*) as count FROM kanban_cards');

    console.log(`[Test] Counts: Journal=${jCount.rows[0]?.count}, Food=${fCount.rows[0]?.count}, Games=${gCount.rows[0]?.count}, Watchlist=${wCount.rows[0]?.count}, Cards=${cCount.rows[0]?.count}`);

    if (
      Number(jCount.rows[0]?.count) !== 1 ||
      Number(fCount.rows[0]?.count) !== 1 ||
      Number(gCount.rows[0]?.count) !== 1 ||
      Number(wCount.rows[0]?.count) !== 1 ||
      Number(cCount.rows[0]?.count) !== 1
    ) {
      throw new Error('Database count assertion failed');
    }

    console.log('\n>>> All DDT smoke tests passed! <<<');
  } finally {
    if (fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
      } catch {}
    }
  }
}

runSmokeTest().catch((err) => {
  console.error('[Test Failed]:', err);
  process.exit(1);
});
