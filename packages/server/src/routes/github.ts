import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { settings, githubCache } from '../db/schema.js';
import type { AppDatabase } from '../db/index.js';

export function createGithubRouter(db: AppDatabase): Router {
  const router = Router();

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

  // GET /api/github/contributions
  router.get('/contributions', async (req, res) => {
    try {
      const forceRefresh = req.query.force === 'true';
      const config = await getGithubConfig();
      const token = config.token;
      let username = config.username || (req.query.username as string | undefined);

      if (!token && !username) {
        return res.status(400).json({
          error: 'GitHub token or username not configured. Please add your credentials in Settings.',
          unconfigured: true,
        });
      }

      const cacheKey = `github:contributions:${username || 'viewer'}`;
      const cached = await db.select().from(githubCache).where(eq(githubCache.key, cacheKey)).get();
      const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

      if (!forceRefresh && cached && (Date.now() - cached.fetchedAt.getTime() < CACHE_TTL)) {
        return res.json(JSON.parse(cached.payload));
      }

      let result: any = null;

      // Tier 1: If Token is provided, try GitHub GraphQL API
      if (token) {
        try {
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

          const ghRes = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              'User-Agent': 'DDT-Dashboard/1.0',
            },
            body: JSON.stringify({ query: graphqlQuery }),
          });

          if (ghRes.ok) {
            const data = (await ghRes.json()) as any;
            if (data.data?.viewer) {
              const viewer = data.data.viewer;
              const calendar = viewer.contributionsCollection?.contributionCalendar;
              username = viewer.login;

              result = {
                user: {
                  login: viewer.login,
                  name: viewer.name || viewer.login,
                  avatarUrl: viewer.avatarUrl,
                },
                totalContributions: calendar?.totalContributions || 0,
                weeks: calendar?.weeks || [],
                fetchedAt: new Date().toISOString(),
              };
            }
          }
        } catch {
          // Fall through to public API
        }
      }

      // Tier 2: If Tier 1 didn't succeed or only username is known, use public contributions API
      if (!result && username) {
        try {
          const cleanUser = username.replace(/^@+/, '').trim();
          const publicRes = await fetch(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(cleanUser)}?y=last`);
          
          if (publicRes.ok) {
            const pubData = (await publicRes.json()) as any;
            const contributions: Array<{ date: string; count: number; level: number }> = pubData.contributions || [];

            // Group into 7-day calendar weeks
            const weeksMap: Record<number, any[]> = {};
            let total = 0;

            contributions.forEach((c) => {
              total += c.count;
              const d = new Date(`${c.date}T00:00:00.000Z`);
              const weekNum = Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000));
              if (!weeksMap[weekNum]) weeksMap[weekNum] = [];
              weeksMap[weekNum].push({
                date: c.date,
                contributionCount: c.count,
                color: c.level === 0 ? '#ebedf0' : c.level === 1 ? '#9be9a8' : c.level === 2 ? '#40c463' : c.level === 3 ? '#30a14e' : '#216e39',
                weekday: d.getUTCDay(),
              });
            });

            const weeks = Object.values(weeksMap).map((days) => ({ contributionDays: days }));

            result = {
              user: {
                login: cleanUser,
                name: cleanUser,
                avatarUrl: `https://github.com/${cleanUser}.png`,
              },
              totalContributions: pubData.total?.['lastYear'] ?? total,
              weeks,
              fetchedAt: new Date().toISOString(),
            };
          }
        } catch {
          // Fallback
        }
      }

      if (!result) {
        return res.status(500).json({ error: 'Unable to fetch GitHub contributions. Please check your token or username.' });
      }

      const now = new Date();
      if (cached) {
        await db.update(githubCache).set({ payload: JSON.stringify(result), fetchedAt: now }).where(eq(githubCache.key, cacheKey));
      } else {
        await db.insert(githubCache).values({ key: cacheKey, payload: JSON.stringify(result), fetchedAt: now });
      }

      // Also update general key for dashboard
      await db.delete(githubCache).where(eq(githubCache.key, 'github:contributions:12months')).catch(() => {});
      await db.insert(githubCache).values({ key: 'github:contributions:12months', payload: JSON.stringify(result), fetchedAt: now });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch GitHub contributions' });
    }
  });

  // GET /api/github/repos - recent repos with commits
  router.get('/repos', async (req, res) => {
    try {
      const forceRefresh = req.query.force === 'true';
      const config = await getGithubConfig();
      const token = config.token;
      const username = config.username;

      if (!token && !username) {
        return res.status(400).json({ error: 'GitHub token or username not configured.', unconfigured: true });
      }

      const cacheKey = 'github:repos:recent';
      const cached = await db.select().from(githubCache).where(eq(githubCache.key, cacheKey)).get();
      const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

      if (!forceRefresh && cached && (Date.now() - cached.fetchedAt.getTime() < CACHE_TTL)) {
        return res.json(JSON.parse(cached.payload));
      }

      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DDT-Dashboard/1.0',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const endpoint = token
        ? 'https://api.github.com/user/repos?sort=pushed&per_page=8&direction=desc'
        : `https://api.github.com/users/${encodeURIComponent(username!)}/repos?sort=pushed&per_page=8&direction=desc`;

      const reposRes = await fetch(endpoint, { headers });

      if (!reposRes.ok) {
        return res.status(reposRes.status).json({ error: 'Failed to fetch repositories from GitHub.' });
      }

      const repos = (await reposRes.json()) as any[];
      const reposWithCommits = await Promise.all(
        repos.slice(0, 8).map(async (repo: any) => {
          let lastCommit: any = null;
          try {
            const commitRes = await fetch(`https://api.github.com/repos/${repo.owner.login}/${repo.name}/commits?per_page=1`, {
              headers,
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
            // Ignore commit error
          }

          return {
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            private: repo.private || false,
            htmlUrl: repo.html_url,
            description: repo.description,
            pushedAt: repo.pushed_at,
            language: repo.language,
            stargazersCount: repo.stargazers_count || 0,
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

