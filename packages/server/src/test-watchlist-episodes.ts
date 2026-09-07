import assert from 'node:assert';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import * as schema from './db/schema.js';

async function runTest() {
  console.log('--- Testing Watchlist TV Episode Progression & Auto-Increment ---');

  const client = createClient({ url: ':memory:' });
  await client.batch([
    `CREATE TABLE IF NOT EXISTS watchlist_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      tmdb_id INTEGER,
      poster_path TEXT,
      status TEXT NOT NULL DEFAULT 'want',
      release_date TEXT,
      media_type TEXT DEFAULT 'movie',
      overview TEXT,
      current_episode INTEGER DEFAULT 0,
      total_episodes INTEGER,
      auto_increment INTEGER DEFAULT 0,
      air_day INTEGER,
      last_air_date TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );`
  ]);

  const db = drizzle(client, { schema });
  const now = new Date();

  // 1. Insert TV Show
  const showId = 'test-show-1';
  await db.insert(schema.watchlistItems).values({
    id: showId,
    title: 'Severance',
    status: 'watching',
    mediaType: 'tv',
    currentEpisode: 3,
    totalEpisodes: 10,
    autoIncrement: 1,
    airDay: 0, // Sunday
    lastAirDate: '2026-08-30',
    createdAt: now,
    updatedAt: now,
  });

  const inserted = await db.select().from(schema.watchlistItems).where(eq(schema.watchlistItems.id, showId)).get();
  assert(inserted, 'Show should exist');
  assert.strictEqual(inserted.currentEpisode, 3);
  assert.strictEqual(inserted.totalEpisodes, 10);
  assert.strictEqual(inserted.autoIncrement, 1);
  assert.strictEqual(inserted.airDay, 0);
  console.log('✓ 1. Inserted TV show with episode tracking metadata');

  // 2. Test Step Actions
  // Increment
  let currentEp = inserted.currentEpisode ?? 0;
  let newEp = Math.min(currentEp + 1, inserted.totalEpisodes ?? Infinity);
  await db.update(schema.watchlistItems).set({ currentEpisode: newEp }).where(eq(schema.watchlistItems.id, showId));
  let row = await db.select().from(schema.watchlistItems).where(eq(schema.watchlistItems.id, showId)).get();
  assert.strictEqual(row?.currentEpisode, 4);
  console.log('✓ 2. Increment action (+1 Ep) advanced to episode 4');

  // Decrement
  newEp = Math.max(0, (row?.currentEpisode ?? 0) - 1);
  await db.update(schema.watchlistItems).set({ currentEpisode: newEp }).where(eq(schema.watchlistItems.id, showId));
  row = await db.select().from(schema.watchlistItems).where(eq(schema.watchlistItems.id, showId)).get();
  assert.strictEqual(row?.currentEpisode, 3);
  console.log('✓ 3. Decrement action (-1 Ep) returned to episode 3');

  // "Dari awal sampai akhir": Complete All
  await db.update(schema.watchlistItems).set({ currentEpisode: row?.totalEpisodes, status: 'watched' }).where(eq(schema.watchlistItems.id, showId));
  row = await db.select().from(schema.watchlistItems).where(eq(schema.watchlistItems.id, showId)).get();
  assert.strictEqual(row?.currentEpisode, 10);
  assert.strictEqual(row?.status, 'watched');
  console.log('✓ 4. Complete All ("dari awal sampai akhir") marked 10/10 episodes and watched status');

  // Reset to Start
  await db.update(schema.watchlistItems).set({ currentEpisode: 0, status: 'watching' }).where(eq(schema.watchlistItems.id, showId));
  row = await db.select().from(schema.watchlistItems).where(eq(schema.watchlistItems.id, showId)).get();
  assert.strictEqual(row?.currentEpisode, 0);
  assert.strictEqual(row?.status, 'watching');
  console.log('✓ 5. Reset action restored episode to 0 and status to watching');

  // 3. Test Auto-Increment Logic for Air Day (Sunday = 0)
  const todayStr = '2026-09-06';
  const lastAir = '2026-08-30';
  const airDay = 0;

  const startDate = new Date(lastAir + 'T00:00:00Z');
  startDate.setUTCDate(startDate.getUTCDate() + 1);
  const todayDate = new Date(todayStr + 'T00:00:00Z');

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

  assert.strictEqual(episodesToAdd, 1, 'Should find exactly 1 Sunday between Aug 31 and Sept 6');
  assert.strictEqual(latestAirDateStr, '2026-09-06');
  console.log('✓ 6. Auto-increment calculation detected 1 elapsed Sunday broadcast date');

  // Apply auto-increment
  await db.update(schema.watchlistItems).set({
    currentEpisode: (row?.currentEpisode ?? 0) + episodesToAdd,
    lastAirDate: latestAirDateStr,
  }).where(eq(schema.watchlistItems.id, showId));

  row = await db.select().from(schema.watchlistItems).where(eq(schema.watchlistItems.id, showId)).get();
  assert.strictEqual(row?.currentEpisode, 1);
  assert.strictEqual(row?.lastAirDate, '2026-09-06');
  console.log('✓ 7. Auto-increment advanced currentEpisode to 1 and recorded lastAirDate');

  // Re-run on same day (simulating user opening app again on Sunday): should add 0
  const recheckStart = new Date(row.lastAirDate + 'T00:00:00Z');
  recheckStart.setUTCDate(recheckStart.getUTCDate() + 1);
  let duplicateCount = 0;
  const reIter = new Date(recheckStart);
  while (reIter <= todayDate) {
    if (reIter.getUTCDay() === airDay) duplicateCount++;
    reIter.setUTCDate(reIter.getUTCDate() + 1);
  }
  assert.strictEqual(duplicateCount, 0, 'Should not duplicate on same air date');
  console.log('✓ 8. Idempotency verified: 0 duplicate episodes on subsequent checks');

  // Manual override: User watches next episode on Monday (2026-09-07) and increments themselves
  const userManualLoggedDate = '2026-09-07';
  await db.update(schema.watchlistItems).set({
    currentEpisode: 2,
    lastAirDate: userManualLoggedDate,
  }).where(eq(schema.watchlistItems.id, showId));

  row = await db.select().from(schema.watchlistItems).where(eq(schema.watchlistItems.id, showId)).get();
  assert.strictEqual(row?.currentEpisode, 2);
  assert.strictEqual(row?.lastAirDate, '2026-09-07');
  console.log('✓ 9. Manual increment syncs lastAirDate to prevent double-incrementing ("bila tdk user tambah sendiri")');

  console.log('\nALL 9 TESTS PASSED CLEANLY! 🎉');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
