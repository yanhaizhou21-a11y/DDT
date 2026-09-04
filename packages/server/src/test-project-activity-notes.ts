import { createServer } from './server.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Server } from 'http';

async function runNotesTest() {
  console.log('--- Testing Project Activity Notes & Logging (Native Fetch) ---');
  const tempDbPath = path.join(os.tmpdir(), `ddt-notes-test-${Date.now()}.db`);
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
          resolve(4001);
        }
      });
    });

    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`[Test] Test server listening on ${baseUrl}`);

    // 1. Create a test project
    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Brand Redesign Project',
        domainType: 'graphic_design',
        status: 'in_progress',
      }),
    });

    if (!createRes.ok) {
      throw new Error(`Failed to create project: ${createRes.status} ${await createRes.text()}`);
    }

    const created = await createRes.json() as { id: string };
    const projectId = created.id;
    console.log(`[Test] Created project ${projectId}`);

    // 2. Log first activity with note
    const today = new Date().toISOString().slice(0, 10);
    const act1Res = await fetch(`${baseUrl}/api/projects/${projectId}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        count: 1,
        note: 'Logo v2 SVG export',
        date: today,
      }),
    });

    if (!act1Res.ok) {
      throw new Error(`Failed to log activity 1: ${act1Res.status} ${await act1Res.text()}`);
    }
    console.log('[Test] Logged note 1: "Logo v2 SVG export"');

    // 3. Log second activity on same date with different note
    const act2Res = await fetch(`${baseUrl}/api/projects/${projectId}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        count: 2,
        note: 'Brand Guidelines PDF',
        date: today,
      }),
    });

    if (!act2Res.ok) {
      throw new Error(`Failed to log activity 2: ${act2Res.status} ${await act2Res.text()}`);
    }
    console.log('[Test] Logged note 2: "Brand Guidelines PDF"');

    // 4. Fetch project details and verify discrete notes
    const detailRes = await fetch(`${baseUrl}/api/projects/${projectId}`);
    if (!detailRes.ok) {
      throw new Error(`Failed to fetch project detail: ${detailRes.status}`);
    }

    const body = await detailRes.json() as any;
    console.log(`[Test] Total Activity: ${body.totalActivity}, Today: ${body.todayCount}`);

    if (body.todayCount !== 3) {
      throw new Error(`Expected todayCount 3, got ${body.todayCount}`);
    }
    if (body.totalActivity !== 3) {
      throw new Error(`Expected totalActivity 3, got ${body.totalActivity}`);
    }

    // Verify raw activity log entries contains both notes
    const notes = body.entries.map((a: any) => a.note);
    console.log(`[Test] Raw entries notes: ${JSON.stringify(notes)}`);

    if (!notes.includes('Logo v2 SVG export') || !notes.includes('Brand Guidelines PDF')) {
      throw new Error('Raw entries did not include both notes');
    }

    console.log('\n>>> All Project Activity Notes tests passed! <<<');
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

runNotesTest().catch((err) => {
  console.error('[Test Failed]:', err);
  process.exit(1);
});
