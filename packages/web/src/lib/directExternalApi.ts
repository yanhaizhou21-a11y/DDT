import type {
  TMDBSearchResult,
  RAWGSearchResult,
  GithubContributionsResponse,
  GithubRepo,
  GithubBranchesResponse,
  SendDiscordRecapParams,
  SendDiscordRecapResponse,
} from '../types';

// ─── Direct TMDB Calls ───────────────────────────────────────────────────────

export async function directSearchTmdb(query: string, apiKey?: string): Promise<TMDBSearchResult[]> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('TMDB API Key or Access Token is missing. Please configure it in Settings.');
  }

  const cleanKey = apiKey.trim();
  const isBearer = cleanKey.length > 50;
  const url = isBearer
    ? `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`
    : `https://api.themoviedb.org/3/search/multi?api_key=${encodeURIComponent(cleanKey)}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (isBearer) headers['Authorization'] = `Bearer ${cleanKey}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`TMDB API returned HTTP ${res.status}`);
  }

  const data = await res.json();
  const results = data.results || [];

  return results
    .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
    .map((item: any) => ({
      tmdbId: item.id,
      title: item.title || item.name || 'Untitled',
      mediaType: item.media_type,
      posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
      releaseDate: item.release_date || item.first_air_date || null,
      overview: item.overview || '',
    }));
}

export async function directTestTmdbKey(apiKey?: string): Promise<{ valid: boolean; message?: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { valid: false, message: 'No TMDB API key provided.' };
  }

  const cleanKey = apiKey.trim();
  const isBearer = cleanKey.length > 50;
  const url = isBearer
    ? 'https://api.themoviedb.org/3/authentication'
    : `https://api.themoviedb.org/3/authentication?api_key=${encodeURIComponent(cleanKey)}`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (isBearer) headers['Authorization'] = `Bearer ${cleanKey}`;

  try {
    const res = await fetch(url, { headers });
    if (res.ok) {
      return { valid: true, message: 'TMDB key verified successfully.' };
    }
    return { valid: false, message: 'Invalid TMDB API key or Access Token.' };
  } catch (err: any) {
    return { valid: false, message: err.message || 'Network error verifying TMDB key.' };
  }
}

// ─── Direct RAWG Calls ───────────────────────────────────────────────────────

export async function directSearchRawg(query: string, apiKey?: string): Promise<RAWGSearchResult[]> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('RAWG API Key is missing. Please configure it in Settings.');
  }

  const cleanKey = apiKey.trim();
  const url = `https://api.rawg.io/api/games?key=${encodeURIComponent(cleanKey)}&search=${encodeURIComponent(query)}&page_size=10`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`RAWG API returned HTTP ${res.status}`);
  }

  const data = await res.json();
  const results = data.results || [];

  return results.map((item: any) => ({
    id: item.id,
    name: item.name,
    coverUrl: item.background_image || null,
    released: item.released || null,
    rating: typeof item.rating === 'number' ? item.rating : null,
  }));
}

export async function directTestRawgKey(apiKey?: string): Promise<{ valid: boolean; message?: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { valid: false, message: 'No RAWG API key provided.' };
  }

  try {
    const res = await fetch(`https://api.rawg.io/api/games?key=${encodeURIComponent(apiKey.trim())}&page_size=1`);
    if (res.ok) {
      return { valid: true, message: 'RAWG connected successfully.' };
    }
    return { valid: false, message: 'Invalid RAWG API key.' };
  } catch (err: any) {
    return { valid: false, message: err.message || 'Network error verifying RAWG key.' };
  }
}

// ─── Direct GitHub Calls ─────────────────────────────────────────────────────

export async function directTestGithubToken(token?: string): Promise<{ valid: boolean; username?: string; name?: string; message?: string }> {
  if (!token || !token.trim()) {
    return { valid: false, message: 'No GitHub token provided.' };
  }

  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (res.ok) {
      const user = await res.json();
      return { valid: true, username: user.login, name: user.name };
    }
    return { valid: false, message: 'Invalid GitHub Personal Access Token.' };
  } catch (err: any) {
    return { valid: false, message: err.message || 'Network error verifying GitHub token.' };
  }
}

export async function directFetchGithubRepos(token?: string): Promise<{ repos: GithubRepo[]; fetchedAt: string }> {
  if (!token || !token.trim()) {
    return { repos: [], fetchedAt: new Date().toISOString() };
  }

  try {
    const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=pushed', {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) return { repos: [], fetchedAt: new Date().toISOString() };

    const data = await res.json();
    const repos: GithubRepo[] = Array.isArray(data)
      ? data.map((r: any) => ({
          id: r.id,
          name: r.name,
          fullName: r.full_name,
          private: r.private,
          defaultBranch: r.default_branch,
          htmlUrl: r.html_url,
          description: r.description,
          pushedAt: r.pushed_at,
          language: r.language,
          stargazersCount: r.stargazers_count,
          lastCommit: null,
        }))
      : [];

    return { repos, fetchedAt: new Date().toISOString() };
  } catch {
    return { repos: [], fetchedAt: new Date().toISOString() };
  }
}

export async function directFetchRepoBranches(
  owner: string,
  repo: string,
  token?: string
): Promise<GithubBranchesResponse> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
  if (token?.trim()) headers['Authorization'] = `Bearer ${token.trim()}`;

  try {
    const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches`, {
      headers,
    });

    if (!res.ok) {
      return { repo: `${owner}/${repo}`, defaultBranch: 'main', branches: [], fetchedAt: new Date().toISOString() };
    }

    const data = await res.json();
    const branches = Array.isArray(data)
      ? data.map((b: any) => ({
          name: b.name,
          commitSha: b.commit?.sha?.slice(0, 7),
          isProtected: b.protected,
        }))
      : [];

    return {
      repo: `${owner}/${repo}`,
      defaultBranch: branches.find((b) => b.name === 'main' || b.name === 'master')?.name || 'main',
      branches,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return { repo: `${owner}/${repo}`, defaultBranch: 'main', branches: [], fetchedAt: new Date().toISOString() };
  }
}

// ─── Direct Discord Webhook Calls ────────────────────────────────────────────

export async function directTestDiscordWebhook(
  webhookUrl?: string
): Promise<{ valid: boolean; name?: string; channelId?: string; message?: string }> {
  if (!webhookUrl || !webhookUrl.trim()) {
    return { valid: false, message: 'No Discord Webhook URL provided.' };
  }

  const trimmed = webhookUrl.trim();
  if (
    !trimmed.startsWith('https://discord.com/api/webhooks/') &&
    !trimmed.startsWith('https://discordapp.com/api/webhooks/')
  ) {
    return { valid: false, message: 'Invalid Discord Webhook URL format.' };
  }

  try {
    const res = await fetch(trimmed, { method: 'GET' });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        valid: true,
        name: data.name || 'Discord Webhook',
        channelId: data.channel_id,
        message: 'Discord Webhook is active and reachable.',
      };
    }
    return { valid: false, message: `Discord Webhook returned HTTP ${res.status}.` };
  } catch (err: any) {
    return { valid: false, message: err.message || 'Network error verifying Discord Webhook.' };
  }
}

export async function directSendDiscordRecap(
  params: SendDiscordRecapParams,
  discordPayload: any
): Promise<SendDiscordRecapResponse> {
  const webhookUrl = params.webhookUrl?.trim();
  if (!webhookUrl) {
    throw new Error('No Discord Webhook URL provided.');
  }

  const now = new Date();
  const dateStr = params.date || now.toISOString().slice(0, 10);

  const payloadToSend = {
    ...discordPayload,
    content: params.customNote ? `**Personal Note**: ${params.customNote}` : discordPayload.content,
  };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payloadToSend),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Discord Webhook returned HTTP ${res.status}: ${text}`);
  }

  return {
    success: true,
    date: dateStr,
    dispatchedAt: now.toISOString(),
    message: 'Recap dispatched successfully to Discord channel.',
  };
}
