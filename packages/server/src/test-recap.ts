import { createServer } from './server.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Server } from 'http';

async function runRecapTest() {
  console.log('--- Testing Daily Activity Recap & Discord Webhook ---');
  const tempDbPath = path.join(os.tmpdir(), `ddt-recap-test-${Date.now()}.db`);
  let httpServer: Server | null = null;

  try {
    const { app, db, client, dbPath } = createServer({ dbPath: tempDbPath });
    await new Promise((r) => setTimeout(r, 200));

    // Listen on random port
    const port = await new Promise<number>((resolve) => {
      httpServer = app.listen(0, '127.0.0.1', () => {
        const addr = httpServer!.address();
        if (typeof addr === 'object' && addr) {
          resolve(addr.port);
        } else {
          resolve(4002);
        }
      });
    });

    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`[Test] Server listening on ${baseUrl}`);

    const testDate = '2026-09-04';
    const now = Date.now();

    // 1. Seed sample data across modules for testDate
    // Projects & Activity
    await client.execute({
      sql: 'INSERT INTO projects (id, name, domain_type, status, linked_repo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: ['proj-brand', 'Brand Overhaul', 'graphic_design', 'in_progress', null, now, now],
    });
    await client.execute({
      sql: 'INSERT INTO project_activity (id, project_id, date, count, note, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: ['act-1', 'proj-brand', testDate, 3, 'Logo v2 SVG export', 'manual', now],
    });

    // Journal Entry
    await client.execute({
      sql: 'INSERT INTO journal_entries (date, content, created_at, updated_at) VALUES (?, ?, ?, ?)',
      args: [
        testDate,
        '# Daily Journal\n\n### 🌅 Morning Intentions\n- Focused execution on shipping the Discord webhook recap feature.\n\n### ⚡ Shipped Today\n- Completed backend recap aggregator and live preview component.',
        now,
        now,
      ],
    });

    // Food Entry
    await client.execute({
      sql: 'INSERT INTO food_entries (id, item_name, meal_tag, status, logged_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: ['food-1', 'Grilled Chicken Salad', 'lunch', 'eaten', testDate, now],
    });

    // Game Entry
    await client.execute({
      sql: 'INSERT INTO game_entries (id, game_name, hours, cover_url, logged_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: ['game-1', 'Hollow Knight: Silksong', 2.5, null, testDate, now],
    });

    // Watchlist Item
    await client.execute({
      sql: 'INSERT INTO watchlist_items (id, title, tmdb_id, poster_path, status, release_date, media_type, overview, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: ['watch-1', 'Dune: Part Two', 693134, null, 'watched', testDate, 'movie', 'Epic sci-fi film', now, now],
    });

    console.log('[Test] Seeded test activities for date:', testDate);

    // 2. Test GET /api/recap?date=2026-09-04
    const recapRes = await fetch(`${baseUrl}/api/recap?date=${testDate}`);
    if (!recapRes.ok) {
      throw new Error(`GET /api/recap failed: ${recapRes.status} ${await recapRes.text()}`);
    }

    const recapData = (await recapRes.json()) as any;
    console.log(`[Test] GET /api/recap returned formattedDate: "${recapData.formattedDate}"`);

    // Verify activity data
    if (recapData.activity.projectsActivity.length !== 1) {
      throw new Error(`Expected 1 project activity, got ${recapData.activity.projectsActivity.length}`);
    }
    const projAct = recapData.activity.projectsActivity[0];
    if (projAct.projectName !== 'Brand Overhaul' || projAct.count !== 3 || !projAct.notes.includes('Logo v2 SVG export')) {
      throw new Error(`Project activity mismatch: ${JSON.stringify(projAct)}`);
    }

    if (!recapData.activity.journal || !recapData.activity.journal.hasEntry) {
      throw new Error('Expected journal entry to be present');
    }
    if (recapData.activity.food.length === 0) {
      throw new Error('Expected food entries');
    }
    if (recapData.activity.games.length === 0) {
      throw new Error('Expected game entries');
    }

    // Verify Discord embed payload
    const embed = recapData.discordPayload.embeds[0];
    console.log(`[Test] Discord Embed Title: "${embed.title}"`);
    console.log(`[Test] Discord Embed Fields count: ${embed.fields.length}`);

    const fieldNames = embed.fields.map((f: any) => f.name);
    console.log(`[Test] Embed Field Names: ${JSON.stringify(fieldNames)}`);

    if (!fieldNames.some((n: string) => n.includes('Project Tracker Output'))) {
      throw new Error('Embed missing Project Tracker Output field');
    }
    if (!fieldNames.some((n: string) => n.includes('Daily Journal'))) {
      throw new Error('Embed missing Daily Journal field');
    }
    if (!fieldNames.some((n: string) => n.includes('Nutrition & Meals'))) {
      throw new Error('Embed missing Nutrition & Meals field');
    }
    if (!fieldNames.some((n: string) => n.includes('Gaming & Leisure'))) {
      throw new Error('Embed missing Gaming & Leisure field');
    }

    // 3. Test Webhook Settings save & fetch
    const fakeWebhook = 'https://discord.com/api/webhooks/123456789012345678/mock-token-abc-12345';
    const saveSettingsRes = await fetch(`${baseUrl}/api/recap/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl: fakeWebhook }),
    });

    if (!saveSettingsRes.ok) {
      throw new Error(`Failed to save webhook settings: ${saveSettingsRes.status}`);
    }

    const getSettingsRes = await fetch(`${baseUrl}/api/recap/settings`);
    const settingsData = (await getSettingsRes.json()) as any;
    console.log(`[Test] Saved Webhook masked: ${settingsData.maskedUrl}`);

    if (!settingsData.hasWebhook || !settingsData.maskedUrl.includes('••••••••')) {
      throw new Error('Webhook setting masking failed');
    }

    // 4. Test Webhook Validation (Invalid URL rejection)
    const invalidUrlRes = await fetch(`${baseUrl}/api/recap/discord`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl: 'https://malicious-site.example/webhook',
        date: testDate,
      }),
    });

    if (invalidUrlRes.status !== 400) {
      throw new Error(`Expected 400 for invalid webhook URL, got ${invalidUrlRes.status}`);
    }
    console.log('[Test] Invalid webhook URL correctly rejected with HTTP 400');

    console.log('\n>>> All Daily Activity Recap & Discord Webhook tests passed! <<<');
  } finally {
    if (httpServer) {
      await new Promise<void>((resolve) => (httpServer as Server).close(() => resolve()));
    }
    if (fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
      } catch {}
    }
  }
}

runRecapTest().catch((err) => {
  console.error('[Test Failed]:', err);
  process.exit(1);
});
