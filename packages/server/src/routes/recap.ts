import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import {
  settings,
  projects,
  projectActivity,
  journalEntries,
  foodEntries,
  gameEntries,
  watchlistItems,
  kanbanCards,
  kanbanColumns,
} from '../db/schema.js';
import type { AppDatabase } from '../db/index.js';

export function createRecapRouter(db: AppDatabase): Router {
  const router = Router();

  // Helper: Mask sensitive webhook token
  function maskWebhookUrl(url: string): string {
    try {
      const match = url.match(/^(https:\/\/(?:discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/)(.+)$/);
      if (match && match[1] && match[2]) {
        return `${match[1]}${match[2].slice(0, 4)}••••••••${match[2].slice(-4)}`;
      }
      return 'https://discord.com/api/webhooks/••••••••';
    } catch {
      return 'https://discord.com/api/webhooks/••••••••';
    }
  }

  // Helper: Validate Discord Webhook URL
  function isValidDiscordWebhookUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    return (
      trimmed.startsWith('https://discord.com/api/webhooks/') ||
      trimmed.startsWith('https://discordapp.com/api/webhooks/') ||
      // Also allow localhost/127.0.0.1 in tests
      (process.env.NODE_ENV === 'test' && (trimmed.startsWith('http://127.0.0.1:') || trimmed.startsWith('http://localhost:')))
    );
  }

  // Helper: Format human date
  function formatHumanDate(dateStr: string): string {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  // Helper: Clean markdown snippet for Discord quote
  function extractJournalExcerpt(markdown: string): string | null {
    if (!markdown || !markdown.trim()) return null;
    const lines = markdown
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && !l.startsWith('---') && !l.startsWith('```'));

    if (lines.length === 0) return null;
    const firstLine = lines[0].replace(/^[-*+]\s+/, '').replace(/\*\*/g, '').replace(/__/g, '');
    return firstLine.length > 180 ? `${firstLine.slice(0, 177)}...` : firstLine;
  }

  // Helper: Build the Discord Rich Embed payload
  function buildDiscordPayload(
    targetDate: string,
    data: {
      projectsActivity: {
        projectName: string;
        domainType: string;
        count: number;
        notes: string[];
      }[];
      journal: {
        hasEntry: boolean;
        wordCount: number;
        preview: string | null;
        excerpt: string | null;
      } | null;
      food: {
        tag: string;
        items: string[];
      }[];
      games: {
        title: string;
        hours: number;
      }[];
      watchlist: {
        title: string;
        status: string;
        mediaType: string;
      }[];
      kanban: {
        title: string;
        columnName: string;
      }[];
    },
    customNote?: string
  ) {
    const formattedDate = formatHumanDate(targetDate);
    const fields: { name: string; value: string; inline?: boolean }[] = [];

    // 1. Projects Field
    if (data.projectsActivity.length > 0) {
      const projectLines = data.projectsActivity.map((p) => {
        let line = `• **${p.projectName}**: +${p.count} ${p.count === 1 ? 'output' : 'outputs'}`;
        if (p.notes.length > 0) {
          line += `\n  └ *${p.notes.join(', ')}*`;
        }
        return line;
      });

      fields.push({
        name: '🚀 Project Tracker Output',
        value: projectLines.join('\n').slice(0, 1024),
        inline: false,
      });
    }

    // 2. Journal Field
    if (data.journal && data.journal.hasEntry) {
      const readTime = Math.max(1, Math.ceil(data.journal.wordCount / 200));
      let val = `📝 **${data.journal.wordCount} words** recorded (⏱️ ~${readTime} min read)`;
      if (data.journal.excerpt) {
        val += `\n> *"${data.journal.excerpt}"*`;
      }
      fields.push({
        name: '📓 Daily Journal',
        value: val.slice(0, 1024),
        inline: false,
      });
    }

    // 3. Nutrition & Food Field
    if (data.food.length > 0) {
      const foodLines = data.food.map((f) => {
        const titleCase = f.tag.charAt(0).toUpperCase() + f.tag.slice(1);
        return `• **${titleCase}**: ${f.items.join(', ')}`;
      });
      fields.push({
        name: '🍱 Nutrition & Meals',
        value: foodLines.join('\n').slice(0, 1024),
        inline: true,
      });
    }

    // 4. Gaming Field
    if (data.games.length > 0) {
      const gameLines = data.games.map((g) => {
        const hrs = g.hours >= 1 ? `${g.hours}h` : `${Math.round(g.hours * 60)}m`;
        return `• **${g.title}**: ${hrs}`;
      });
      fields.push({
        name: '🎮 Gaming & Leisure',
        value: gameLines.join('\n').slice(0, 1024),
        inline: true,
      });
    }

    // 5. Watchlist Field
    if (data.watchlist.length > 0) {
      const watchLines = data.watchlist.map((w) => {
        return `• ${w.status === 'watched' ? 'Watched' : 'Queue'}: **${w.title}**`;
      });
      fields.push({
        name: '🎬 Watchlist & Media',
        value: watchLines.join('\n').slice(0, 1024),
        inline: true,
      });
    }

    // 6. Kanban Field
    if (data.kanban.length > 0) {
      const taskLines = data.kanban.map((k) => `• [${k.columnName}] ${k.title}`);
      fields.push({
        name: '⚡ Tasks & Kanban',
        value: taskLines.join('\n').slice(0, 1024),
        inline: false,
      });
    }

    // Active modules count
    let activeModules = 0;
    if (data.projectsActivity.length > 0) activeModules++;
    if (data.journal?.hasEntry) activeModules++;
    if (data.food.length > 0) activeModules++;
    if (data.games.length > 0) activeModules++;
    if (data.watchlist.length > 0) activeModules++;
    if (data.kanban.length > 0) activeModules++;

    // If day was completely empty:
    if (fields.length === 0) {
      fields.push({
        name: '💤 Quiet Day',
        value: 'No discrete activity was recorded on this date in the ledger.',
        inline: false,
      });
    }

    // Description header (custom note or highlight)
    let description = '';
    if (customNote && customNote.trim()) {
      description = `> 💬 **Dispatch Note:** *"${customNote.trim()}"*\n\n`;
    }
    description += `📊 **Day Summary:** ${activeModules}/6 active modules logged on **${formattedDate}**.`;

    return {
      username: 'DDT Daily Ledger',
      avatar_url: 'https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/www/public/favicon.ico',
      content: `📅 **Daily Ledger Dispatch** — **${formattedDate}**`,
      embeds: [
        {
          title: `📋 Daily Activity Ledger • ${formattedDate}`,
          description,
          color: 3098712, // Hex #2F4858 (DDT Ledger Blue)
          fields,
          footer: {
            text: 'DDT (Daily Dashboard Tracker) • Local-First Personal Ledger',
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  // ─── GET /api/recap ────────────────────────────────────────────────────────
  // Fetches aggregated activity data and preview embed for a given date
  router.get('/', async (req, res) => {
    try {
      const targetDate =
        typeof req.query.date === 'string' && req.query.date.match(/^\d{4}-\d{2}-\d{2}$/)
          ? req.query.date
          : new Date().toISOString().slice(0, 10);

      // 1. Projects & Activity
      const allProjects = await db.select().from(projects);
      const projectMap = new Map(allProjects.map((p) => [p.id, p]));

      const rawActivity = await db
        .select()
        .from(projectActivity)
        .where(eq(projectActivity.date, targetDate));

      const projectSummaryMap = new Map<
        string,
        { projectName: string; domainType: string; count: number; notes: string[] }
      >();

      for (const act of rawActivity) {
        const proj = projectMap.get(act.projectId);
        const name = proj ? proj.name : 'Unknown Project';
        const domain = proj ? proj.domainType : 'software';

        if (!projectSummaryMap.has(act.projectId)) {
          projectSummaryMap.set(act.projectId, {
            projectName: name,
            domainType: domain,
            count: 0,
            notes: [],
          });
        }
        const item = projectSummaryMap.get(act.projectId)!;
        item.count += act.count;
        if (act.note && act.note.trim()) {
          item.notes.push(act.note.trim());
        }
      }

      const projectsActivity = Array.from(projectSummaryMap.values());

      // 2. Journal Entry
      const journalRow = await db
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.date, targetDate))
        .get();

      let journalData = null;
      if (journalRow && journalRow.content && journalRow.content.trim()) {
        const content = journalRow.content.trim();
        const wordCount = content.split(/\s+/).length;
        journalData = {
          hasEntry: true,
          wordCount,
          preview: content.slice(0, 200),
          excerpt: extractJournalExcerpt(content),
        };
      }

      // 3. Food Entries
      const foodRows = await db
        .select()
        .from(foodEntries)
        .where(eq(foodEntries.loggedAt, targetDate));

      const foodByTagMap = new Map<string, string[]>();
      for (const f of foodRows) {
        if (!foodByTagMap.has(f.mealTag)) {
          foodByTagMap.set(f.mealTag, []);
        }
        foodByTagMap.get(f.mealTag)!.push(f.itemName);
      }

      const food = Array.from(foodByTagMap.entries()).map(([tag, items]) => ({
        tag,
        items,
      }));

      // 4. Game Entries
      const gameRows = await db
        .select()
        .from(gameEntries)
        .where(eq(gameEntries.loggedAt, targetDate));

      const games = gameRows.map((g) => ({
        title: g.gameName,
        hours: g.hours,
      }));

      // 5. Watchlist Items (items created or updated on target date or status watched)
      const allWatchlist = await db.select().from(watchlistItems);
      const watchlist = allWatchlist
        .filter((w) => {
          const createdStr = w.createdAt ? new Date(w.createdAt).toISOString().slice(0, 10) : '';
          const updatedStr = w.updatedAt ? new Date(w.updatedAt).toISOString().slice(0, 10) : '';
          return createdStr === targetDate || updatedStr === targetDate;
        })
        .map((w) => ({
          title: w.title,
          status: w.status,
          mediaType: w.mediaType || 'movie',
        }));

      // 6. Kanban Cards (cards created, updated or due on targetDate)
      const allColumns = await db.select().from(kanbanColumns);
      const colMap = new Map(allColumns.map((c) => [c.id, c.name]));

      const allCards = await db.select().from(kanbanCards);
      const kanban = allCards
        .filter((c) => {
          const updatedStr = c.updatedAt ? new Date(c.updatedAt).toISOString().slice(0, 10) : '';
          const dueStr = c.dueDate ? c.dueDate.slice(0, 10) : '';
          return updatedStr === targetDate || dueStr === targetDate;
        })
        .map((c) => ({
          title: c.title,
          columnName: colMap.get(c.columnId) || 'Task',
        }));

      // Check saved webhook
      const webhookSetting = await db
        .select()
        .from(settings)
        .where(eq(settings.key, 'discord_webhook_url'))
        .get();

      const activitySummary = {
        projectsActivity,
        journal: journalData,
        food,
        games,
        watchlist,
        kanban,
      };

      const discordPayload = buildDiscordPayload(targetDate, activitySummary);

      res.json({
        date: targetDate,
        formattedDate: formatHumanDate(targetDate),
        activity: activitySummary,
        discordPayload,
        hasSavedWebhook: Boolean(webhookSetting?.value?.trim()),
        savedWebhookUrl: webhookSetting?.value ? maskWebhookUrl(webhookSetting.value) : null,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to generate daily recap' });
    }
  });

  // ─── POST /api/recap/discord ───────────────────────────────────────────────
  // Dispatches the recap embed to Discord via native fetch
  router.post('/discord', async (req, res) => {
    try {
      const { webhookUrl, date, customNote, saveWebhook } = req.body;

      const targetDate =
        typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)
          ? date
          : new Date().toISOString().slice(0, 10);

      // Resolve webhook URL
      let resolvedUrl = typeof webhookUrl === 'string' ? webhookUrl.trim() : '';
      if (!resolvedUrl) {
        const saved = await db
          .select()
          .from(settings)
          .where(eq(settings.key, 'discord_webhook_url'))
          .get();
        resolvedUrl = saved?.value ? saved.value.trim() : '';
      }

      if (!resolvedUrl) {
        return res.status(400).json({
          error: 'Discord Webhook URL is required. Please provide a webhook URL or save one in settings.',
        });
      }

      if (!isValidDiscordWebhookUrl(resolvedUrl)) {
        return res.status(400).json({
          error:
            'Invalid Discord Webhook URL. It must start with https://discord.com/api/webhooks/ or https://discordapp.com/api/webhooks/',
        });
      }

      // Re-fetch activities for date to build fresh payload
      const allProjects = await db.select().from(projects);
      const projectMap = new Map(allProjects.map((p) => [p.id, p]));

      const rawActivity = await db
        .select()
        .from(projectActivity)
        .where(eq(projectActivity.date, targetDate));

      const projectSummaryMap = new Map<
        string,
        { projectName: string; domainType: string; count: number; notes: string[] }
      >();

      for (const act of rawActivity) {
        const proj = projectMap.get(act.projectId);
        const name = proj ? proj.name : 'Unknown Project';
        const domain = proj ? proj.domainType : 'software';

        if (!projectSummaryMap.has(act.projectId)) {
          projectSummaryMap.set(act.projectId, {
            projectName: name,
            domainType: domain,
            count: 0,
            notes: [],
          });
        }
        const item = projectSummaryMap.get(act.projectId)!;
        item.count += act.count;
        if (act.note && act.note.trim()) {
          item.notes.push(act.note.trim());
        }
      }

      const journalRow = await db
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.date, targetDate))
        .get();

      let journalData = null;
      if (journalRow && journalRow.content && journalRow.content.trim()) {
        const content = journalRow.content.trim();
        journalData = {
          hasEntry: true,
          wordCount: content.split(/\s+/).length,
          preview: content.slice(0, 200),
          excerpt: extractJournalExcerpt(content),
        };
      }

      const foodRows = await db
        .select()
        .from(foodEntries)
        .where(eq(foodEntries.loggedAt, targetDate));

      const foodByTagMap = new Map<string, string[]>();
      for (const f of foodRows) {
        if (!foodByTagMap.has(f.mealTag)) foodByTagMap.set(f.mealTag, []);
        foodByTagMap.get(f.mealTag)!.push(f.itemName);
      }

      const gameRows = await db
        .select()
        .from(gameEntries)
        .where(eq(gameEntries.loggedAt, targetDate));

      const allWatchlist = await db.select().from(watchlistItems);
      const watchlist = allWatchlist
        .filter((w) => {
          const createdStr = w.createdAt ? new Date(w.createdAt).toISOString().slice(0, 10) : '';
          const updatedStr = w.updatedAt ? new Date(w.updatedAt).toISOString().slice(0, 10) : '';
          return createdStr === targetDate || updatedStr === targetDate;
        })
        .map((w) => ({
          title: w.title,
          status: w.status,
          mediaType: w.mediaType || 'movie',
        }));

      const allColumns = await db.select().from(kanbanColumns);
      const colMap = new Map(allColumns.map((c) => [c.id, c.name]));
      const allCards = await db.select().from(kanbanCards);
      const kanban = allCards
        .filter((c) => {
          const updatedStr = c.updatedAt ? new Date(c.updatedAt).toISOString().slice(0, 10) : '';
          const dueStr = c.dueDate ? c.dueDate.slice(0, 10) : '';
          return updatedStr === targetDate || dueStr === targetDate;
        })
        .map((c) => ({
          title: c.title,
          columnName: colMap.get(c.columnId) || 'Task',
        }));

      const activitySummary = {
        projectsActivity: Array.from(projectSummaryMap.values()),
        journal: journalData,
        food: Array.from(foodByTagMap.entries()).map(([tag, items]) => ({ tag, items })),
        games: gameRows.map((g) => ({ title: g.gameName, hours: g.hours })),
        watchlist,
        kanban,
      };

      const payload = buildDiscordPayload(targetDate, activitySummary, customNote);

      // Dispatch to Discord via native fetch
      const discordResponse = await fetch(resolvedUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!discordResponse.ok) {
        const errText = await discordResponse.text();
        if (discordResponse.status === 429) {
          return res.status(429).json({
            error: 'Discord rate limit reached. Please wait a few seconds before trying again.',
            details: errText,
          });
        }
        if (discordResponse.status === 401 || discordResponse.status === 404) {
          return res.status(400).json({
            error: 'Discord Webhook URL is invalid or has been revoked/deleted.',
            details: errText,
          });
        }
        return res.status(502).json({
          error: `Discord returned an error (${discordResponse.status}): ${errText || discordResponse.statusText}`,
        });
      }

      // If user opted to save webhook URL
      if (saveWebhook && resolvedUrl) {
        const existing = await db
          .select()
          .from(settings)
          .where(eq(settings.key, 'discord_webhook_url'))
          .get();

        if (existing) {
          await db
            .update(settings)
            .set({ value: resolvedUrl, updatedAt: new Date() })
            .where(eq(settings.key, 'discord_webhook_url'));
        } else {
          await db.insert(settings).values({
            key: 'discord_webhook_url',
            value: resolvedUrl,
          });
        }
      }

      res.json({
        success: true,
        date: targetDate,
        dispatchedAt: new Date().toISOString(),
        message: 'Daily recap dispatched to Discord successfully.',
      });
    } catch (err: any) {
      res.status(500).json({
        error: err.message || 'Failed to dispatch Discord webhook recap',
      });
    }
  });

  // ─── GET /api/recap/settings ───────────────────────────────────────────────
  router.get('/settings', async (_req, res) => {
    try {
      const webhookSetting = await db
        .select()
        .from(settings)
        .where(eq(settings.key, 'discord_webhook_url'))
        .get();

      res.json({
        hasWebhook: Boolean(webhookSetting?.value?.trim()),
        maskedUrl: webhookSetting?.value ? maskWebhookUrl(webhookSetting.value) : null,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch webhook settings' });
    }
  });

  // ─── POST /api/recap/settings ──────────────────────────────────────────────
  router.post('/settings', async (req, res) => {
    try {
      const { webhookUrl } = req.body;
      const url = typeof webhookUrl === 'string' ? webhookUrl.trim() : '';

      if (url && !isValidDiscordWebhookUrl(url)) {
        return res.status(400).json({
          error: 'Invalid Discord Webhook URL. It must start with https://discord.com/api/webhooks/',
        });
      }

      const existing = await db
        .select()
        .from(settings)
        .where(eq(settings.key, 'discord_webhook_url'))
        .get();

      if (existing) {
        await db
          .update(settings)
          .set({ value: url, updatedAt: new Date() })
          .where(eq(settings.key, 'discord_webhook_url'));
      } else {
        await db.insert(settings).values({
          key: 'discord_webhook_url',
          value: url,
        });
      }

      res.json({
        success: true,
        hasWebhook: Boolean(url),
        maskedUrl: url ? maskWebhookUrl(url) : null,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save webhook settings' });
    }
  });

  return router;
}
