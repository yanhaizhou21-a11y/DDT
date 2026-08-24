import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { settings, githubCache } from '../db/schema.js';
import type { AppDatabase } from '../db/index.js';

export function createGithubRouter(db: AppDatabase): Router {
  const router = Router();

  async function getGithubToken(): Promise<string | null> {
    const row = await db.select().from(settings).where(eq(settings.key, 'github_token')).get();
    return row?.value?.trim() || null;
  }

  // GET /api/github/contributions
  router.get('/contributions', async (req, res) => {
    try {
      const forceRefresh = req.query.force === 'true';
      const token = await getGithubToken();
      if (!token) {
        return res.status(400).json({ error: 'GitHub token not configured. Please add your token in Settings.', unconfigured: true });
      }

      const cacheKey = 'github:contributions:12months';
      const cached = await db.select().from(githubCache).where(eq(githubCache.key, cacheKey)).get();
      const CACHE_TTL = 60 * 60 * 1000; // 1 hour

      if (!forceRefresh && cached && (Date.now() - cached.fetchedAt.getTime() < CACHE_TTL)) {
        return res.json(JSON.parse(cached.payload));
      }

      // Fetch from GitHub GraphQL
      const graphqlQuery = `
        query {
          viewer {
            login
            name
            avatarUrl
            contributionsCollection {
              contributionCalendar {
                totalContributions
                weeks {
                  contributionDays {
                    contributionCount
                    date
                    weekday
                    color
                  }
                }
              }
            }
          }
        }
      `;

      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'DDT-Dashboard/1.0',
        },
        body: JSON.stringify({ query: graphqlQuery }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as any;
        return res.status(response.status).json({
          error: errorData.message || 'Failed to authenticate with GitHub GraphQL. Check token scopes (repo, read:user).',
        });
      }

      const data = (await response.json()) as any;
      if (data.errors) {
        return res.status(400).json({ error: data.errors[0]?.message || 'GraphQL error' });
      }

      const calendar = data.data?.viewer?.contributionsCollection?.contributionCalendar;
      const result = {
        user: {
          login: data.data?.viewer?.login,
          name: data.data?.viewer?.name,
          avatarUrl: data.data?.viewer?.avatarUrl,
        },
        totalContributions: calendar?.totalContributions || 0,
        weeks: calendar?.weeks || [],
        fetchedAt: new Date().toISOString(),
      };

      const now = new Date();
      if (cached) {
        await db.update(githubCache).set({ payload: JSON.stringify(result), fetchedAt: now }).where(eq(githubCache.key, cacheKey));
      } else {
        await db.insert(githubCache).values({ key: cacheKey, payload: JSON.stringify(result), fetchedAt: now });
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch GitHub contributions' });
    }
  });

  // GET /api/github/repos - recent repos with commits
  router.get('/repos', async (req, res) => {
    try {
      const forceRefresh = req.query.force === 'true';
      const token = await getGithubToken();
      if (!token) {
        return res.status(400).json({ error: 'GitHub token not configured.', unconfigured: true });
      }

      const cacheKey = 'github:repos:recent';
      const cached = await db.select().from(githubCache).where(eq(githubCache.key, cacheKey)).get();
      const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

      if (!forceRefresh && cached && (Date.now() - cached.fetchedAt.getTime() < CACHE_TTL)) {
        return res.json(JSON.parse(cached.payload));
      }

      const reposRes = await fetch('https://api.github.com/user/repos?sort=pushed&per_page=10&direction=desc', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'DDT-Dashboard/1.0',
        },
      });

      if (!reposRes.ok) {
        return res.status(reposRes.status).json({ error: 'Failed to fetch user repositories from GitHub.' });
      }

      const repos = (await reposRes.json()) as any[];
      const reposWithCommits = await Promise.all(
        repos.slice(0, 8).map(async (repo: any) => {
          let lastCommit: any = null;
          try {
            const commitRes = await fetch(`https://api.github.com/repos/${repo.owner.login}/${repo.name}/commits?per_page=1`, {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'DDT-Dashboard/1.0',
              },
            });
            if (commitRes.ok) {
              const commits = (await commitRes.json()) as any[];
              if (commits.length > 0) {
                lastCommit = {
                  message: commits[0].commit.message,
                  sha: commits[0].sha.slice(0, 7),
                  author: commits[0].commit.author.name,
                  date: commits[0].commit.author.date,
                };
              }
            }
          } catch {
            // Ignore individual commit failure
          }

          return {
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            private: repo.private,
            htmlUrl: repo.html_url,
            description: repo.description,
            pushedAt: repo.pushed_at,
            language: repo.language,
            stargazersCount: repo.stargazers_count,
            lastCommit,
          };
        })
      );

      const result = {
        repos: reposWithCommits,
        fetchedAt: new Date().toISOString(),
      };

      const now = new Date();
      if (cached) {
        await db.update(githubCache).set({ payload: JSON.stringify(result), fetchedAt: now }).where(eq(githubCache.key, cacheKey));
      } else {
        await db.insert(githubCache).values({ key: cacheKey, payload: JSON.stringify(result), fetchedAt: now });
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch GitHub repos' });
    }
  });

  // POST /api/github/refresh - bypasses cache
  router.post('/refresh', async (_req, res) => {
    try {
      await db.delete(githubCache);
      res.json({ success: true, message: 'GitHub cache cleared' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to clear cache' });
    }
  });

  return router;
}
