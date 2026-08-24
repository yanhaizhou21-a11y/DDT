#!/usr/bin/env node

import { Command } from 'commander';
import open from 'open';
import http from 'http';
import { createServer } from '@ddt/server';

const program = new Command();

program
  .name('ddt')
  .description('Daily Dashboard Tracker — local-first personal ledger dashboard')
  .version('1.0.0')
  .option('-p, --port <number>', 'Port to listen on', '3000')
  .option('-d, --db <path>', 'Custom SQLite database path')
  .option('--no-open', 'Do not open browser automatically')
  .action(async (options) => {
    let port = parseInt(options.port, 10) || 3000;
    const host = '127.0.0.1';

    const { app, dbPath } = createServer({ dbPath: options.db });

    function tryListen(targetPort: number) {
      const server = http.createServer(app);

      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`[DDT] Port ${targetPort} in use, trying port ${targetPort + 1}...`);
          tryListen(targetPort + 1);
        } else {
          console.error('[DDT] Server error:', err);
          process.exit(1);
        }
      });

      server.listen(targetPort, host, async () => {
        const url = `http://${host}:${targetPort}`;
        console.log('\n========================================');
        console.log('   DDT — Daily Dashboard Tracker');
        console.log('   Personal Ledger Dashboard');
        console.log('========================================');
        console.log(`\n  Dashboard: ${url}`);
        console.log(`  Database:  ${dbPath}`);
        console.log('  Mode:      Local Single-User');
        console.log('\nPress Ctrl+C to stop.\n');

        if (options.open !== false) {
          try {
            await open(url);
          } catch {
            // Ignore browser launch failure
          }
        }
      });

      const cleanup = () => {
        console.log('\n[DDT] Shutting down cleanly...');
        server.close(() => {
          process.exit(0);
        });
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
    }

    tryListen(port);
  });

program.parse(process.argv);
