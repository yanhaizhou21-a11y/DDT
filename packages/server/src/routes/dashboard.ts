import { Router } from 'express';
import { eq, desc, asc, not, isNull } from 'drizzle-orm';
import {
  journalEntries,
  kanbanCards,
  watchlistItems,
  foodEntries,
  gameEntries,
  settings,
  githubCache,
} from '../db/schema.js';
import type { AppDatabase } from '../db/index.js';

export function createDashboardRouter(db: AppDatabase): Router {
  const router = Router();

  function formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  // GET /api/dashboard
  router.get('/', async (_req, res) => {
    try {
      const today = formatDate(new Date());

      // 1. Today's Journal Entry
      const todayJournal = await db.select().from(journalEntries).where(eq(journalEntries.date, today)).get();
      const journalData = todayJournal
        ? {
            date: todayJournal.date,
            content: todayJournal.content,
            wordCount: todayJournal.content.trim() ? todayJournal.content.trim().split(/\s+/).length : 0,
            updatedAt: todayJournal.updatedAt,
            hasWritten: todayJournal.content.trim().length > 0,
          }
        : {
            date: today,
            content: '',
            wordCount: 0,
            updatedAt: null,
            hasWritten: false,
          };

      // 2. Next 2 Kanban cards due
      const allCards = await db.select().from(kanbanCards).where(not(isNull(kanbanCards.dueDate))).orderBy(asc(kanbanCards.dueDate));
      
      const cardsDue = allCards.slice(0, 4).map((c) => ({
        id: c.id,
        columnId: c.columnId,
        title: c.title,
        dueDate: c.dueDate,
        tag: c.tag,
        isOverdue: Boolean(c.dueDate && c.dueDate < today),
      }));

      // 3. Upcoming theater/watchlist releases
      const allWatchlist = await db.select().from(watchlistItems).orderBy(desc(watchlistItems.createdAt));
      const inTheaterSoon = allWatchlist
        .filter((w) => w.releaseDate && w.releaseDate >= today)
        .sort((a, b) => (a.releaseDate || '').localeCompare(b.releaseDate || ''))
        .slice(0, 3);

      // 4. Food logged today
      const todayFood = await db.select().from(foodEntries).where(eq(foodEntries.loggedAt, today));

      // 5. Game logged today
      const todayGames = await db.select().from(gameEntries).where(eq(gameEntries.loggedAt, today));
      const todayGameHours = todayGames.reduce((sum, g) => sum + g.hours, 0);

      // 6. Dot-ledger strip data for last 30 days
      const days30: string[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days30.push(formatDate(d));
      }

      const allJournals = await db.select().from(journalEntries);
      const allFoods = await db.select().from(foodEntries);
      const allGames = await db.select().from(gameEntries);

      const journalMap: Record<string, number> = {};
      allJournals.forEach((j) => {
        if (j.content.trim().length > 0) journalMap[j.date] = 1;
      });

      const foodMap: Record<string, number> = {};
      allFoods.forEach((f) => {
        foodMap[f.loggedAt] = (foodMap[f.loggedAt] || 0) + 1;
      });

      const gameMap: Record<string, number> = {};
      allGames.forEach((g) => {
        gameMap[g.loggedAt] = (gameMap[g.loggedAt] || 0) + g.hours;
      });

      const stRows = await db.select().from(settings);
      const settingsMap: Record<string, string> = {};
      stRows.forEach((s) => (settingsMap[s.key] = s.value));

      let ghCacheRow = await db.select().from(githubCache).where(eq(githubCache.key, 'github:contributions:12months')).get();
      if (!ghCacheRow) {
        // Look for any cached contributions
        const anyGh = await db.select().from(githubCache).get();
        if (anyGh && anyGh.key.startsWith('github:contributions')) {
          ghCacheRow = anyGh;
        }
      }

      let todayGithubCommits = 0;
      let totalYearCommits = 0;
      let githubUsername = settingsMap.github_username || '';
      let githubAvatar = '';
      const githubMap: Record<string, number> = {};

      if (ghCacheRow) {
        try {
          const parsed = JSON.parse(ghCacheRow.payload);
          totalYearCommits = parsed.totalContributions || 0;
          if (parsed.user?.login) githubUsername = parsed.user.login;
          if (parsed.user?.avatarUrl) githubAvatar = parsed.user.avatarUrl;
          const weeks = parsed.weeks || [];
          for (const week of weeks) {
            for (const day of week.contributionDays || []) {
              githubMap[day.date] = day.contributionCount;
              if (day.date === today) {
                todayGithubCommits = day.contributionCount;
              }
            }
          }
        } catch {
          // Ignore
        }
      }

      res.json({
        today,
        journal: journalData,
        kanbanDue: cardsDue.slice(0, 4),
        inTheaterSoon,
        foodToday: {
          count: todayFood.length,
          items: todayFood.slice(0, 5),
        },
        gameToday: {
          hours: Math.round(todayGameHours * 100) / 100,
          items: todayGames.slice(0, 5),
        },
        dotLedgers: {
          days: days30,
          journal: days30.map((d) => ({ date: d, value: journalMap[d] || 0 })),
          food: days30.map((d) => ({ date: d, value: foodMap[d] || 0 })),
          game: days30.map((d) => ({ date: d, value: gameMap[d] || 0 })),
          github: days30.map((d) => ({ date: d, value: githubMap[d] || 0 })),
        },
        github: {
          hasToken: Boolean(settingsMap.github_token?.trim() || settingsMap.github_username?.trim()),
          username: githubUsername,
          avatarUrl: githubAvatar,
          todayCommits: todayGithubCommits,
          totalYearCommits,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch dashboard data' });
    }
  });

  return router;
}
