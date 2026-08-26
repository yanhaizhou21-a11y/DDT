import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase, type AppDatabase, type SqliteClient } from './db/index.js';
import { createSettingsRouter } from './routes/settings.js';
import { createJournalRouter } from './routes/journal.js';
import { createKanbanRouter } from './routes/kanban.js';
import { createWatchlistRouter } from './routes/watchlist.js';
import { createFoodRouter } from './routes/food.js';
import { createGamesRouter } from './routes/games.js';
import { createGithubRouter } from './routes/github.js';
import { createDashboardRouter } from './routes/dashboard.js';
import { createUploadRouter } from './routes/upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerInstance {
  app: express.Express;
  db: AppDatabase;
  client: SqliteClient;
  dbPath: string;
}

export function createServer(options: { dbPath?: string } = {}): ServerInstance {
  const app = express();
  const { db, client, dbPath } = initDatabase(options.dbPath);

  // Uploads directory in user DDT folder (~/.ddt/uploads)
  const ddtDir = path.dirname(dbPath);
  const uploadsDir = path.join(ddtDir, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Enable CORS & JSON parsing
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '20mb' }));

  // Static uploads serving
  app.use('/uploads', express.static(uploadsDir));

  // API Routes
  app.use('/api/settings', createSettingsRouter(db, client, dbPath));
  app.use('/api/journal', createJournalRouter(db));
  app.use('/api/kanban', createKanbanRouter(db, client));
  app.use('/api/watchlist', createWatchlistRouter(db));
  app.use('/api/food', createFoodRouter(db));
  app.use('/api/games', createGamesRouter(db));
  app.use('/api/github', createGithubRouter(db));
  app.use('/api/dashboard', createDashboardRouter(db));
  app.use('/api/upload', createUploadRouter(uploadsDir));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });


  // Serve static web app in production if web/dist exists
  const possibleStaticPaths = [
    path.resolve(__dirname, '../../web/dist'),
    path.resolve(__dirname, '../../../packages/web/dist'),
    path.resolve(__dirname, '../../packages/web/dist'),
    path.resolve(__dirname, '../node_modules/@ddt/web/dist'),
    path.resolve(process.cwd(), 'packages/web/dist'),
    path.resolve(process.cwd(), 'node_modules/@ddt/web/dist'),
    path.resolve(process.cwd(), 'web/dist'),
  ];

  let staticPath = possibleStaticPaths.find((p) => fs.existsSync(p));
  if (staticPath) {
    app.use(
      express.static(staticPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
          }
        },
      })
    );

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/assets/')) {
        return next();
      }
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.sendFile(path.join(staticPath!, 'index.html'));
    });
  }

  return { app, db, client, dbPath };
}

