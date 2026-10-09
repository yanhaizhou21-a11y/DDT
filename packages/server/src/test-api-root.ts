import assert from 'assert';
import http from 'http';
import path from 'path';
import os from 'os';
import { createServer } from './server.js';

async function testApiRoot() {
  console.log('Testing /api endpoints and browser redirects...');
  const tempDb = path.join(os.tmpdir(), `ddt-api-test-${Date.now()}.db`);
  const { app } = createServer({ dbPath: tempDb });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Browser navigation to /api should redirect to /
    const browserRes = await fetch(`${baseUrl}/api`, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'Sec-Fetch-Dest': 'document',
      },
      redirect: 'manual',
    });
    assert.strictEqual(browserRes.status, 302, 'Browser navigation to /api should return 302 redirect');
    assert.strictEqual(browserRes.headers.get('location'), '/', 'Redirect location should be /');
    console.log('  PASS: Browser navigation to /api redirects to /');

    // 2. Browser navigation to /api/ should also redirect to /
    const browserSlashRes = await fetch(`${baseUrl}/api/`, {
      headers: {
        'Accept': 'text/html',
        'Sec-Fetch-Dest': 'document',
      },
      redirect: 'manual',
    });
    assert.strictEqual(browserSlashRes.status, 302, 'Browser navigation to /api/ should return 302 redirect');
    console.log('  PASS: Browser navigation to /api/ redirects to /');

    // 3. API request to /api should return JSON 200
    const apiRes = await fetch(`${baseUrl}/api`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    assert.strictEqual(apiRes.status, 200, 'API request to /api should return 200 OK');
    const apiJson = await apiRes.json();
    assert.strictEqual(apiJson.status, 'ok', 'API response status should be ok');
    console.log('  PASS: API request to /api returns status ok');

    // 4. API health check
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(healthRes.status, 200);
    const healthJson = await healthRes.json();
    assert.strictEqual(healthJson.status, 'ok');
    console.log('  PASS: /api/health returns status ok');

    // 5. Unknown /api endpoint returns JSON 404 instead of HTML error
    const notFoundRes = await fetch(`${baseUrl}/api/non-existent-route`);
    assert.strictEqual(notFoundRes.status, 404);
    const notFoundJson = await notFoundRes.json();
    assert.strictEqual(notFoundJson.error, 'API endpoint not found');
    console.log('  PASS: Unknown /api/* route returns clean JSON 404');

    console.log('\nAll API root tests passed successfully!');
  } finally {
    server.close();
  }
}

testApiRoot().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
