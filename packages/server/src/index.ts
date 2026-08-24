import { createServer } from './server.js';

export { createServer } from './server.js';
export * from './db/index.js';
export * as schema from './db/schema.js';

const PORT = Number(process.env.PORT) || 3001;
const HOST = '127.0.0.1';

// Only auto-listen if this is the main module
if (process.argv[1] && (process.argv[1].endsWith('index.ts') || process.argv[1].endsWith('index.js'))) {
  const { app, dbPath } = createServer();

  const server = app.listen(PORT, HOST, () => {
    console.log(`[DDT Server] Running on http://${HOST}:${PORT}`);
    console.log(`[DDT Server] SQLite Database: ${dbPath}`);
  });

  const cleanup = () => {
    console.log('\n[DDT Server] Shutting down gracefully...');
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}
