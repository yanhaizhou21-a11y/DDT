import { Router } from 'express';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { projects, projectActivity, settings, githubCache } from '../db/schema.js';
import type { AppDatabase } from '../db/index.js';

export function createProjectsRouter(db: AppDatabase): Router {
  const router = Router();

  function formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  function getDaysRange(days: number): string[] {
    const dates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(formatDate(d));
    }
    return dates;
  }

  async function getGithubConfig(): Promise<{ token: string | null; username: string | null }> {
    const rows = await db.select().from(settings);
    const map: Record<string, string> = {};
    rows.forEach((r) => {
      map[r.key] = r.value?.trim() || '';
    });
    return {
      token: map.github_token || null,
      username: map.github_username || null,
    };
  }

  // Fetch commits for a specific repo from GitHub API
  async function fetchRepoCommits(
    linkedRepo: string,
    force = false
  ): Promise<{ historyMap: Record<string, number>; totalCommits: number; lastCommit: any; error?: string }> {
    const cleanRepo = linkedRepo.trim();
    if (!cleanRepo || !cleanRepo.includes('/')) {
      return { historyMap: {}, totalCommits: 0, lastCommit: null };
    }

    const cacheKey = `github:repo-commits:${cleanRepo.toLowerCase()}`;
    const CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache

    if (!force) {
      const cached = await db.select().from(githubCache).where(eq(githubCache.key, cacheKey)).get();
      if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL) {
        try {
          return JSON.parse(cached.payload);
        } catch {
          // Fall through
        }
      }
    }

    const config = await getGithubConfig();
    const token = config.token;

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'DDT-Dashboard/1.0',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const historyMap: Record<string, number> = {};
    let totalCommits = 0;
    let lastCommit: any = null;

    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const sinceIso = oneYearAgo.toISOString();

      // Fetch recent commits up to 100
      const [owner, repo] = cleanRepo.split('/');
      const res = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?since=${sinceIso}&per_page=100`,
        { headers }
      );

      if (res.ok) {
        const commits = (await res.json()) as any[];
        if (Array.isArray(commits)) {
          totalCommits = commits.length;
          commits.forEach((c, idx) => {
            const dateStr = c.commit?.author?.date || c.commit?.committer?.date;
            if (dateStr) {
              const date = dateStr.slice(0, 10);
              historyMap[date] = (historyMap[date] || 0) + 1;
            }
            if (idx === 0) {
              lastCommit = {
                sha: c.sha?.slice(0, 7),
                message: c.commit?.message || '',
                author: c.commit?.author?.name || c.author?.login || 'Unknown',
                date: dateStr,
                htmlUrl: c.html_url,
              };
            }
          });
        }
      } else if (res.status === 404) {
        return { historyMap: {}, totalCommits: 0, lastCommit: null, error: `Repository "${cleanRepo}" not found or private.` };
      } else if (res.status === 401 || res.status === 403) {
        return { historyMap: {}, totalCommits: 0, lastCommit: null, error: 'GitHub API rate limit or token authorization error.' };
      }

      const result = { historyMap, totalCommits, lastCommit };
      const now = new Date();

      await db.delete(githubCache).where(eq(githubCache.key, cacheKey)).catch(() => {});
      await db.insert(githubCache).values({ key: cacheKey, payload: JSON.stringify(result), fetchedAt: now });

      return result;
    } catch (err: any) {
      console.error(`Error fetching commits for repo ${cleanRepo}:`, err);
      return { historyMap, totalCommits, lastCommit, error: err.message };
    }
  }

  // GET /api/projects - List all projects with 30-day activity strip
  router.get('/', async (req, res) => {
    try {
      const forceRefresh = req.query.force === 'true';
      const allProjects = await db.select().from(projects).orderBy(desc(projects.createdAt));
      const days30 = getDaysRange(30);

      const projectsWithStats = await Promise.all(
        allProjects.map(async (project) => {
          const isRepoLinked =
            (project.domainType === 'software' || project.domainType === 'game_dev') &&
            Boolean(project.linkedRepo?.trim());

          let recentActivity: { date: string; value: number }[] = [];
          let totalActivity = 0;
          let lastActiveDate: string | null = null;
          let repoError: string | undefined;

          if (isRepoLinked && project.linkedRepo) {
            const { historyMap, totalCommits, error } = await fetchRepoCommits(project.linkedRepo, forceRefresh);
            repoError = error;
            totalActivity = totalCommits;
            recentActivity = days30.map((d) => {
              const val = historyMap[d] || 0;
              if (val > 0) lastActiveDate = d;
              return { date: d, value: val };
            });
          } else {
            const activities = await db
              .select()
              .from(projectActivity)
              .where(eq(projectActivity.projectId, project.id));

            const actMap: Record<string, number> = {};
            activities.forEach((a) => {
              actMap[a.date] = (actMap[a.date] || 0) + a.count;
              totalActivity += a.count;
            });

            recentActivity = days30.map((d) => {
              const val = actMap[d] || 0;
              if (val > 0) lastActiveDate = d;
              return { date: d, value: val };
            });
          }

          return {
            ...project,
            isRepoLinked,
            recentActivity,
            totalActivity,
            lastActiveDate,
            repoError,
          };
        })
      );

      res.json(projectsWithStats);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch projects' });
    }
  });

  // POST /api/projects - Create a new project
  router.post('/', async (req, res) => {
    try {
      const { name, domainType, status, linkedRepo } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Project name is required' });
      }

      const validDomains = ['software', 'graphic_design', 'game_dev', 'video_photo'];
      if (!domainType || !validDomains.includes(domainType)) {
        return res.status(400).json({ error: `Invalid domain type. Must be one of: ${validDomains.join(', ')}` });
      }

      const validStatuses = ['not_started', 'in_progress', 'ready'];
      const finalStatus = status && validStatuses.includes(status) ? status : 'not_started';

      const id = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const now = new Date();

      const newProject = {
        id,
        name: name.trim(),
        domainType,
        status: finalStatus,
        linkedRepo: (domainType === 'software' || domainType === 'game_dev') && linkedRepo ? linkedRepo.trim() : null,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(projects).values(newProject);

      res.status(201).json(newProject);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create project' });
    }
  });

  // GET /api/projects/:id - Get project details with 12-month activity timeline
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const forceRefresh = req.query.force === 'true';

      const project = await db.select().from(projects).where(eq(projects.id, id)).get();
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const isRepoLinked =
        (project.domainType === 'software' || project.domainType === 'game_dev') &&
        Boolean(project.linkedRepo?.trim());

      const days365 = getDaysRange(365);
      const today = formatDate(new Date());

      let activityList: { date: string; count: number; level: number }[] = [];
      let totalActivity = 0;
      let todayCount = 0;
      let lastCommit: any = null;
      let repoError: string | undefined;

      if (isRepoLinked && project.linkedRepo) {
        const { historyMap, totalCommits, lastCommit: lc, error } = await fetchRepoCommits(project.linkedRepo, forceRefresh);
        repoError = error;
        totalActivity = totalCommits;
        lastCommit = lc;
        todayCount = historyMap[today] || 0;

        activityList = days365.map((d) => {
          const count = historyMap[d] || 0;
          const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 9 ? 3 : 4;
          return { date: d, count, level };
        });
      } else {
        const activities = await db
          .select()
          .from(projectActivity)
          .where(eq(projectActivity.projectId, project.id))
          .orderBy(desc(projectActivity.date));

        const actMap: Record<string, number> = {};
        activities.forEach((a) => {
          actMap[a.date] = (actMap[a.date] || 0) + a.count;
          totalActivity += a.count;
        });

        todayCount = actMap[today] || 0;

        // Calculate maximum for dynamic scaling
        const maxVal = Math.max(...Object.values(actMap), 1);

        activityList = days365.map((d) => {
          const count = actMap[d] || 0;
          let level = 0;
          if (count > 0) {
            const ratio = count / maxVal;
            level = ratio < 0.25 ? 1 : ratio < 0.5 ? 2 : ratio < 0.8 ? 3 : 4;
          }
          return { date: d, count, level };
        });
      }

      // Recent 30 days strip
      const days30 = getDaysRange(30);
      const actMapRecent: Record<string, number> = {};
      activityList.forEach((a) => {
        actMapRecent[a.date] = a.count;
      });
      const recentActivity = days30.map((d) => ({ date: d, value: actMapRecent[d] || 0 }));

      // Fetch raw activity log entries (if manual)
      const rawEntries = !isRepoLinked
        ? await db
            .select()
            .from(projectActivity)
            .where(eq(projectActivity.projectId, project.id))
            .orderBy(desc(projectActivity.date), desc(projectActivity.createdAt))
            .limit(20)
        : [];

      res.json({
        ...project,
        isRepoLinked,
        activity: activityList,
        recentActivity,
        totalActivity,
        todayCount,
        lastCommit,
        repoError,
        entries: rawEntries,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch project details' });
    }
  });

  // PATCH /api/projects/:id - Update project
  router.patch('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, domainType, status, linkedRepo } = req.body;

      const project = await db.select().from(projects).where(eq(projects.id, id)).get();
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const updates: Partial<typeof projects.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (name !== undefined) {
        if (typeof name !== 'string' || !name.trim()) {
          return res.status(400).json({ error: 'Project name cannot be empty' });
        }
        updates.name = name.trim();
      }

      if (domainType !== undefined) {
        const validDomains = ['software', 'graphic_design', 'game_dev', 'video_photo'];
        if (!validDomains.includes(domainType)) {
          return res.status(400).json({ error: `Invalid domain type: ${domainType}` });
        }
        updates.domainType = domainType;
        // If domain type changed away from software/game_dev, clear linkedRepo
        if (domainType !== 'software' && domainType !== 'game_dev') {
          updates.linkedRepo = null;
        }
      }

      if (status !== undefined) {
        const validStatuses = ['not_started', 'in_progress', 'ready'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ error: `Invalid status: ${status}` });
        }
        updates.status = status;
      }

      if (linkedRepo !== undefined) {
        const currentDomain = domainType || project.domainType;
        if (currentDomain === 'software' || currentDomain === 'game_dev') {
          updates.linkedRepo = linkedRepo ? linkedRepo.trim() : null;
        } else {
          updates.linkedRepo = null;
        }
      }

      await db.update(projects).set(updates).where(eq(projects.id, id));

      const updated = await db.select().from(projects).where(eq(projects.id, id)).get();
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update project' });
    }
  });

  // DELETE /api/projects/:id - Delete project
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const project = await db.select().from(projects).where(eq(projects.id, id)).get();
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Delete activity entries & project (cascade fallback)
      await db.delete(projectActivity).where(eq(projectActivity.projectId, id));
      await db.delete(projects).where(eq(projects.id, id));

      res.json({ success: true, message: 'Project deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete project' });
    }
  });

  // POST /api/projects/:id/activity - Log manual daily activity
  router.post('/:id/activity', async (req, res) => {
    try {
      const { id } = req.params;
      const { count = 1, date, note } = req.body;

      const project = await db.select().from(projects).where(eq(projects.id, id)).get();
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const isRepoLinked =
        (project.domainType === 'software' || project.domainType === 'game_dev') &&
        Boolean(project.linkedRepo?.trim());

      if (isRepoLinked) {
        return res.status(400).json({
          error: 'This project is linked to a GitHub repository and tracks commit activity automatically. Manual logging is disabled to prevent double counting.',
        });
      }

      const numCount = Number(count);
      if (isNaN(numCount) || numCount <= 0) {
        return res.status(400).json({ error: 'Activity count must be a positive number' });
      }

      const entryDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : formatDate(new Date());
      const trimmedNote = typeof note === 'string' && note.trim() ? note.trim() : null;
      const now = new Date();

      // If a specific note/action is specified, insert as a distinct item so history tracks what was done
      if (trimmedNote) {
        const actId = `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        await db.insert(projectActivity).values({
          id: actId,
          projectId: id,
          date: entryDate,
          count: numCount,
          note: trimmedNote,
          source: 'manual',
          createdAt: now,
        });

        return res.status(201).json({
          success: true,
          id: actId,
          date: entryDate,
          count: numCount,
          note: trimmedNote,
          isNew: true,
        });
      }

      // Check if general un-noted entry exists for this project on this date
      const existing = await db
        .select()
        .from(projectActivity)
        .where(
          and(
            eq(projectActivity.projectId, id),
            eq(projectActivity.date, entryDate),
            eq(projectActivity.source, 'manual'),
            isNull(projectActivity.note)
          )
        )
        .get();

      if (existing) {
        const newCount = existing.count + numCount;
        await db
          .update(projectActivity)
          .set({ count: newCount })
          .where(eq(projectActivity.id, existing.id));

        res.json({ success: true, id: existing.id, date: entryDate, count: newCount, isNew: false });
      } else {
        const actId = `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        await db.insert(projectActivity).values({
          id: actId,
          projectId: id,
          date: entryDate,
          count: numCount,
          note: null,
          source: 'manual',
          createdAt: now,
        });

        res.status(201).json({ success: true, id: actId, date: entryDate, count: numCount, isNew: true });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to log project activity' });
    }
  });

  // DELETE /api/projects/:id/activity/:activityId - Delete specific activity entry
  router.delete('/:id/activity/:activityId', async (req, res) => {
    try {
      const { id, activityId } = req.params;
      await db
        .delete(projectActivity)
        .where(and(eq(projectActivity.id, activityId), eq(projectActivity.projectId, id)));

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete activity entry' });
    }
  });

  return router;
}
