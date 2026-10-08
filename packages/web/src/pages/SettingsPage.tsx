import React, { useEffect, useState } from 'react';
import type { RouteTab } from '../types';
import {
  fetchSettings,
  saveSettings,
  testGithubToken,
  testTmdbKey,
  testRawgKey,
  testDiscordWebhook,
  importData,
  getApiBase,
  setApiBase,
  resetApiBase,
  testServerConnection,
  getExportUrl,
} from '../api';
import { Header } from '../components/Header';
import { ThemeToggle } from '../components/ThemeToggle';
import { AppUpdateSection } from '../components/AppUpdateSection';
import { cn } from '../lib/utils';

import {
  Key,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  Database,
  ShieldCheck,
  Save,
  RotateCw,
  Eye,
  EyeOff,
  Sparkles,
  GitCommit,
  Film,
  Gamepad2,
  Check,
  Copy,
  ExternalLink,
  Lock,
  Send,
  Server,
  Wifi,
  Smartphone,
} from 'lucide-react';

interface SettingsPageProps {
  onNavigate: (tab: RouteTab) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = () => {
  const [githubToken, setGithubToken] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [tmdbKey, setTmdbKey] = useState('');
  const [rawgKey, setRawgKey] = useState('');
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [dbPath, setDbPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [copiedDbPath, setCopiedDbPath] = useState(false);

  // Show/hide tokens
  const [showGithub, setShowGithub] = useState(false);
  const [showTmdb, setShowTmdb] = useState(false);
  const [showRawg, setShowRawg] = useState(false);
  const [showDiscord, setShowDiscord] = useState(false);

  // Test states
  const [githubTest, setGithubTest] = useState<{ testing: boolean; result?: { valid: boolean; username?: string; message?: string } }>({ testing: false });
  const [tmdbTest, setTmdbTest] = useState<{ testing: boolean; result?: { valid: boolean; message?: string } }>({ testing: false });
  const [rawgTest, setRawgTest] = useState<{ testing: boolean; result?: { valid: boolean; message?: string } }>({ testing: false });
  const [discordTest, setDiscordTest] = useState<{ testing: boolean; result?: { valid: boolean; name?: string; channelId?: string; message?: string } }>({ testing: false });

  // Import state
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Dynamic API server URL state
  const [serverUrl, setServerUrl] = useState<string>(() => {
    const current = getApiBase();
    return current === '/api' ? '' : current;
  });
  const [serverTest, setServerTest] = useState<{ testing: boolean; result?: { success: boolean; message: string } }>({ testing: false });
  const [serverSavedMessage, setServerSavedMessage] = useState<string | null>(null);

  const [desktopNavMode, setDesktopNavMode] = useState<'sidebar' | 'dock'>(() => {
    if (typeof window !== 'undefined') {
      return (window.localStorage.getItem('ddt_desktop_nav_mode') as 'sidebar' | 'dock') || 'sidebar';
    }
    return 'sidebar';
  });

  const handleNavModeChange = (mode: 'sidebar' | 'dock') => {
    setDesktopNavMode(mode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ddt_desktop_nav_mode', mode);
      window.dispatchEvent(new Event('ddt_nav_mode_changed'));
    }
  };

  const handleSaveServerUrl = () => {
    setApiBase(serverUrl.trim() || null);
    setServerSavedMessage('Server URL configuration saved.');
    setTimeout(() => setServerSavedMessage(null), 3500);
  };

  const handleResetServerUrl = () => {
    resetApiBase();
    setServerUrl('');
    setServerSavedMessage('Reset to local relative default (/api).');
    setTimeout(() => setServerSavedMessage(null), 3500);
  };

  const handleTestServer = async () => {
    setServerTest({ testing: true });
    try {
      const res = await testServerConnection(serverUrl.trim() || undefined);
      setServerTest({ testing: false, result: res });
    } catch (err: any) {
      setServerTest({ testing: false, result: { success: false, message: err.message || 'Connection failed' } });
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetchSettings();
      setGithubToken(res.settings.github_token || '');
      setGithubUsername(res.settings.github_username || '');
      setTmdbKey(res.settings.tmdb_api_key || '');
      setRawgKey(res.settings.rawg_api_key || '');
      setDiscordWebhookUrl(res.settings.discord_webhook_url || '');
      setDbPath(res.dbPath);

      // Auto-run non-blocking tests if tokens exist
      if (res.settings.github_token) {
        testGithubToken(res.settings.github_token).then((r) => setGithubTest({ testing: false, result: r })).catch(() => {});
      }
      if (res.settings.tmdb_api_key) {
        testTmdbKey(res.settings.tmdb_api_key).then((r) => setTmdbTest({ testing: false, result: r })).catch(() => {});
      }
      if (res.settings.rawg_api_key) {
        testRawgKey(res.settings.rawg_api_key).then((r) => setRawgTest({ testing: false, result: r })).catch(() => {});
      }
      if (res.settings.discord_webhook_url) {
        testDiscordWebhook(res.settings.discord_webhook_url).then((r) => setDiscordTest({ testing: false, result: r })).catch(() => {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSaveMessage(null);
      await saveSettings({
        github_token: githubToken.trim(),
        github_username: githubUsername.trim(),
        tmdb_api_key: tmdbKey.trim(),
        rawg_api_key: rawgKey.trim(),
        discord_webhook_url: discordWebhookUrl.trim(),
      });
      setSaveMessage('All integration keys and preferences saved to SQLite.');
      setTimeout(() => setSaveMessage(null), 3500);
    } catch (err: any) {
      setSaveMessage(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };


  const handleTestGithub = async () => {
    setGithubTest({ testing: true });
    try {
      const res = await testGithubToken(githubToken.trim());
      setGithubTest({ testing: false, result: res });
    } catch (err: any) {
      setGithubTest({ testing: false, result: { valid: false, message: err.message } });
    }
  };

  const handleTestTmdb = async () => {
    setTmdbTest({ testing: true });
    try {
      const res = await testTmdbKey(tmdbKey.trim());
      setTmdbTest({ testing: false, result: res });
    } catch (err: any) {
      setTmdbTest({ testing: false, result: { valid: false, message: err.message } });
    }
  };

  const handleTestRawg = async () => {
    setRawgTest({ testing: true });
    try {
      const res = await testRawgKey(rawgKey.trim());
      setRawgTest({ testing: false, result: res });
    } catch (err: any) {
      setRawgTest({ testing: false, result: { valid: false, message: err.message } });
    }
  };

  const handleTestDiscord = async () => {
    if (!discordWebhookUrl.trim()) return;
    setDiscordTest({ testing: true });
    try {
      const res = await testDiscordWebhook(discordWebhookUrl.trim());
      setDiscordTest({ testing: false, result: res });
    } catch (err: any) {
      setDiscordTest({ testing: false, result: { valid: false, message: err.message || 'Verification failed.' } });
    }
  };

  const handleExportData = () => {
    const link = document.createElement('a');
    link.href = getExportUrl();
    link.download = `ddt-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setImportMessage(null);
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await importData(parsed);
      setImportMessage({ text: res.message || 'Complete dataset restored successfully.' });
      loadSettings();
    } catch (err: any) {
      setImportMessage({ text: err.message || 'Import failed: Invalid JSON structure.', isError: true });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const copyDbPath = () => {
    navigator.clipboard.writeText(dbPath);
    setCopiedDbPath(true);
    setTimeout(() => setCopiedDbPath(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Header
        title="Settings & Integrations"
        subtitle="Third-party API key configurations, database backup & storage security"
      >
        <div className="flex items-center gap-1.5 px-3 py-1 bg-card border border-rule/80 rounded-[4px] text-[11px] font-mono text-ink-soft">
          <Lock className="w-3 h-3 text-ledger-blue" />
          <span>Local Storage Only</span>
        </div>
      </Header>

      {loading ? (
        <div className="py-20 text-center text-xs font-mono text-ink-soft animate-pulse">
          Reading system preferences...
        </div>
      ) : (
        <form onSubmit={handleSaveAll} className="space-y-6">
          {/* Third-party Integrations Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-base font-semibold text-ink flex items-center gap-2">
                  <Key className="w-4 h-4 text-ledger-blue" />
                  <span>API Integrations</span>
                </h2>
                <p className="text-xs text-ink-soft mt-0.5">
                  Unlock automated metadata, cover posters, and GitHub contribution graphs.
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-ledger-blue text-paper text-xs font-medium rounded-[4px] hover:bg-ledger-hover active:scale-95 transition-all disabled:opacity-50 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Keys'}</span>
              </button>
            </div>

            {saveMessage && (
              <div className="p-3 bg-ledger-light border border-ledger-blue/40 rounded-[5px] text-xs font-mono text-ledger-blue font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-ledger-blue flex-shrink-0" />
                <span>{saveMessage}</span>
              </div>
            )}

            {/* GitHub Card */}
            <div className="ledger-card p-5 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-rule/70">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-paper rounded-[4px] border border-rule">
                    <svg className="w-4 h-4 text-ink" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-serif text-sm font-semibold text-ink">GitHub Integration</h3>
                    <p className="text-[11px] text-ink-soft">Fetch commit history, contribution heatmaps & streak counts</p>
                  </div>
                </div>

                {/* Status indicator */}
                {githubTest.result?.valid ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-[4px] text-[11px] font-mono font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    Connected: @{githubTest.result.username}
                  </span>
                ) : githubToken ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-paper text-ink-soft border border-rule rounded-[4px] text-[11px] font-mono">
                    Token Entered (Click Test)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gold-light text-ink border border-gold/40 rounded-[4px] text-[11px] font-mono">
                    Not Configured
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {/* GitHub Username */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-ink">GitHub Username (for public contribution graphs & commits)</label>
                  <input
                    type="text"
                    placeholder="e.g. torvalds or octocat"
                    value={githubUsername}
                    onChange={(e) => setGithubUsername(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-paper border border-rule rounded-md focus:bg-card focus:outline-none focus:ring-2 focus:ring-ledger-blue focus:ring-offset-1 font-mono"
                  />
                </div>

                {/* GitHub Token */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-ink">Personal Access Token (for private repos & GraphQL)</label>
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo,read:user&description=DDT+Dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-mono text-ledger-blue hover:underline flex items-center gap-1"
                    >
                      <span>Generate token</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showGithub ? 'text' : 'password'}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        className="w-full px-3 py-2 pr-9 text-xs bg-paper border border-rule rounded-md focus:bg-card focus:outline-none focus:ring-2 focus:ring-ledger-blue focus:ring-offset-1 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGithub(!showGithub)}
                        aria-label={showGithub ? 'Hide GitHub token' : 'Show GitHub token'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                      >
                        {showGithub ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestGithub}
                      disabled={githubTest.testing || !githubToken.trim()}
                      className="px-3.5 py-2 bg-card border border-rule hover:border-ink-soft text-xs font-mono text-ink rounded-md disabled:opacity-50 flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
                    >
                      {githubTest.testing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>Verify</span>
                    </button>
                  </div>

                  {githubTest.result && !githubTest.result.valid && (
                    <p className="text-xs font-mono text-stamp-red mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{githubTest.result.message || 'Invalid GitHub token. Check scopes (repo, read:user).'}</span>
                    </p>
                  )}

                  {/* Scopes & Collaborator Repos Tip */}
                  <div className="text-[11px] font-mono text-ink-soft bg-paper/60 p-2.5 rounded border border-rule/60 space-y-1 mt-2">
                    <div className="font-semibold text-ink flex items-center gap-1">
                      <span>💡 Token Scopes & Collaborator Repositories:</span>
                    </div>
                    <p className="leading-relaxed">
                      • <strong>Classic Token (<code className="text-ledger-blue font-mono font-bold">ghp_...</code>)</strong>: Recommended if you collaborate on private repositories owned by other users or organizations. Requires the <code className="text-ledger-blue font-bold">repo</code> scope.
                    </p>
                    <p className="leading-relaxed">
                      • <strong>Fine-Grained Token (<code className="text-ledger-blue font-mono font-bold">github_pat_...</code>)</strong>: In GitHub Settings, verify <em>Repository access</em> is set to <em>All repositories</em>, and <em>Permissions</em> has <em>Contents: Read</em>. (Note: GitHub restricts fine-grained tokens from accessing private repos owned by other personal user accounts).
                    </p>
                  </div>
                </div>
              </div>
            </div>


            {/* TMDB Card */}
            <div className="ledger-card p-5 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-rule/70">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-paper rounded-[4px] border border-rule">
                    <Film className="w-4 h-4 text-ink" />
                  </div>
                  <div>
                    <h3 className="font-serif text-sm font-semibold text-ink">The Movie Database (TMDB)</h3>
                    <p className="text-[11px] text-ink-soft">Instant movie/show search, official poster artwork & release dates</p>
                  </div>
                </div>

                {/* Status indicator */}
                {tmdbTest.result?.valid ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-[4px] text-[11px] font-mono font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    Connected
                  </span>
                ) : tmdbKey ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-paper text-ink-soft border border-rule rounded-[4px] text-[11px] font-mono">
                    Key Entered (Click Test)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gold-light text-ink border border-gold/40 rounded-[4px] text-[11px] font-mono">
                    Not Configured
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-ink">TMDB API Key (v3) or API Read Access Token (v4)</label>
                  <a
                    href="https://www.themoviedb.org/settings/api"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-mono text-ledger-blue hover:underline flex items-center gap-1"
                  >
                    <span>Get free TMDB key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showTmdb ? 'text' : 'password'}
                      placeholder="TMDB API Key (32 hex characters) or Bearer Token"
                      value={tmdbKey}
                      onChange={(e) => setTmdbKey(e.target.value)}
                      className="w-full px-3 py-2 pr-9 text-xs bg-paper border border-rule rounded-[4px] focus:bg-card focus:outline-none focus:ring-2 focus:ring-ledger-blue focus:ring-offset-1 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTmdb(!showTmdb)}
                      aria-label={showTmdb ? 'Hide TMDB key' : 'Show TMDB key'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                    >
                      {showTmdb ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestTmdb}
                    disabled={tmdbTest.testing || !tmdbKey.trim()}
                    className="px-3.5 py-2 bg-card border border-rule hover:border-ink-soft text-xs font-mono text-ink rounded-[4px] disabled:opacity-50 flex items-center gap-1.5 active:scale-95 transition-all flex-shrink-0"
                  >
                    {tmdbTest.testing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Verify</span>
                  </button>
                </div>

                {tmdbTest.result && !tmdbTest.result.valid && (
                  <p className="text-xs font-mono text-stamp-red mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{tmdbTest.result.message || 'TMDB key validation failed.'}</span>
                  </p>
                )}
              </div>
            </div>

            {/* RAWG Card */}
            <div className="ledger-card p-5 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-rule/70">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-paper rounded-[4px] border border-rule">
                    <Gamepad2 className="w-4 h-4 text-ink" />
                  </div>
                  <div>
                    <h3 className="font-serif text-sm font-semibold text-ink">RAWG Video Games Database</h3>
                    <p className="text-[11px] text-ink-soft">Search 500,000+ video games & attach official cover art</p>
                  </div>
                </div>

                {/* Status indicator */}
                {rawgTest.result?.valid ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-[4px] text-[11px] font-mono font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    Connected
                  </span>
                ) : rawgKey ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-paper text-ink-soft border border-rule rounded-[4px] text-[11px] font-mono">
                    Key Entered (Click Test)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gold-light text-ink border border-gold/40 rounded-[4px] text-[11px] font-mono">
                    Not Configured
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-ink">RAWG API Key</label>
                  <a
                    href="https://rawg.io/apidocs"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-mono text-ledger-blue hover:underline flex items-center gap-1"
                  >
                    <span>Get free RAWG key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showRawg ? 'text' : 'password'}
                      placeholder="RAWG API Key"
                      value={rawgKey}
                      onChange={(e) => setRawgKey(e.target.value)}
                      className="w-full px-3 py-2 pr-9 text-xs bg-paper border border-rule rounded-[4px] focus:bg-card focus:outline-none focus:ring-2 focus:ring-ledger-blue focus:ring-offset-1 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRawg(!showRawg)}
                      aria-label={showRawg ? 'Hide RAWG key' : 'Show RAWG key'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                    >
                      {showRawg ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestRawg}
                    disabled={rawgTest.testing || !rawgKey.trim()}
                    className="px-3.5 py-2 bg-card border border-rule hover:border-ink-soft text-xs font-mono text-ink rounded-[4px] disabled:opacity-50 flex items-center gap-1.5 active:scale-95 transition-all flex-shrink-0"
                  >
                    {rawgTest.testing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Verify</span>
                  </button>
                </div>

                {rawgTest.result && !rawgTest.result.valid && (
                  <p className="text-xs font-mono text-stamp-red mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{rawgTest.result.message || 'RAWG key validation failed.'}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Discord Daily Recap Webhook Card */}
            <div className="ledger-card p-5 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-rule/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-[#5865F2]/50 shrink-0 shadow-xs relative bg-[#2b2d31]">
                    <img src="/bot-avatar.jpg" alt="DDT Bot Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-serif text-sm font-semibold text-ink">Discord Activity Recap Webhook</h3>
                    <p className="text-[11px] text-ink-soft">Broadcast your daily productivity and media summary to Discord channels</p>
                  </div>
                </div>

                {/* Status indicator */}
                {discordTest.result?.valid ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-[4px] text-[11px] font-mono font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    {discordTest.result.name ? `${discordTest.result.name}` : 'Connected'}
                  </span>
                ) : discordWebhookUrl ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-paper text-ink-soft border border-rule rounded-[4px] text-[11px] font-mono">
                    URL Entered (Click Verify)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gold-light text-ink border border-gold/40 rounded-[4px] text-[11px] font-mono">
                    Not Configured
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-ink">Discord Webhook URL</label>
                  <a
                    href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-mono text-ledger-blue hover:underline flex items-center gap-1"
                  >
                    <span>How to create webhook</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showDiscord ? 'text' : 'password'}
                      placeholder="https://discord.com/api/webhooks/..."
                      value={discordWebhookUrl}
                      onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                      className="w-full px-3 py-2 pr-9 text-xs bg-paper border border-rule rounded-[4px] focus:bg-card focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDiscord(!showDiscord)}
                      aria-label={showDiscord ? 'Hide Webhook URL' : 'Show Webhook URL'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                    >
                      {showDiscord ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestDiscord}
                    disabled={discordTest.testing || !discordWebhookUrl.trim()}
                    className="px-3.5 py-2 bg-card border border-rule hover:border-ink-soft text-xs font-mono text-ink rounded-[4px] disabled:opacity-50 flex items-center gap-1.5 active:scale-95 transition-all flex-shrink-0"
                  >
                    {discordTest.testing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Verify</span>
                  </button>
                </div>

                {discordTest.result && !discordTest.result.valid && (
                  <p className="text-xs font-mono text-stamp-red mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{discordTest.result.message || 'Discord webhook validation failed.'}</span>
                  </p>
                )}
                {discordTest.result?.valid && (
                  <p className="text-xs font-mono text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{discordTest.result.message || 'Webhook verified successfully!'}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Theme & Display Preferences Card */}
          <div className="ledger-card p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-rule/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-paper rounded-md border border-rule text-ledger-blue">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-sm font-semibold text-ink">Theme & Aesthetic Display</h3>
                  <p className="text-[11px] text-ink-soft">Switch between Field Ledger, Vintage Sepia, Kinetic Dark, Cyberpunk, Matcha, and Nordic modes</p>
                </div>
              </div>
              <ThemeToggle placement="bottom-end" />
            </div>
            <p className="text-xs text-ink-soft leading-relaxed">
              DDT supports 6 distinctive handcrafted themes: <strong className="text-ink font-semibold">Field Ledger</strong> (warm paper & ink), <strong className="text-ink font-semibold">Vintage Sepia</strong> (antique parchment & leather), <strong className="text-ink font-semibold">Kinetic Dark</strong> (high-energy brutalism & acid yellow), <strong className="text-ink font-semibold">Cyberpunk Night</strong> (midnight glow & cyan/magenta), <strong className="text-ink font-semibold">Matcha Forest</strong> (earthy botanical green), and <strong className="text-ink font-semibold">Nordic Frost</strong> (arctic slate chill).
            </p>

            <div className="pt-3 border-t border-rule/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-semibold text-ink">Desktop Navigation Style</h4>
                <p className="text-[11px] text-ink-soft">Choose between the classic side rail or the spring-smoothed macOS magnifying dock</p>
              </div>
              <div className="flex items-center gap-1.5 p-1 bg-paper border border-rule rounded-md text-xs font-mono">
                <button
                  type="button"
                  onClick={() => handleNavModeChange('sidebar')}
                  className={cn(
                    'px-2.5 py-1 rounded transition-all font-medium',
                    desktopNavMode === 'sidebar'
                      ? 'bg-card text-ledger-blue font-bold shadow-xs border border-rule'
                      : 'text-ink-soft hover:text-ink'
                  )}
                >
                  Sidebar Rail
                </button>
                <button
                  type="button"
                  onClick={() => handleNavModeChange('dock')}
                  className={cn(
                    'px-2.5 py-1 rounded transition-all font-medium',
                    desktopNavMode === 'dock'
                      ? 'bg-card text-ledger-blue font-bold shadow-xs border border-rule'
                      : 'text-ink-soft hover:text-ink'
                  )}
                >
                  Floating Dock
                </button>
              </div>
            </div>
          </div>

          {/* Database & Data Backup Card */}
          <div className="ledger-card p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-rule/70">
              <Database className="w-4 h-4 text-ledger-blue" />
              <h2 className="font-serif text-base font-semibold text-ink">
                Database & Data Portability
              </h2>
            </div>


            <div>
              <label className="block text-xs font-medium text-ink mb-1">
                SQLite Database Location (Local Disk)
              </label>
              <div className="flex items-center gap-2 p-2.5 bg-paper border border-rule rounded-[4px]">
                <span className="text-xs font-mono text-ink break-all flex-1 select-all">
                  {dbPath}
                </span>
                <button
                  type="button"
                  onClick={copyDbPath}
                  aria-label="Copy database path"
                  className="p-1.5 text-ink-soft hover:text-ledger-blue rounded border border-rule bg-card active:scale-95 transition-all"
                  title="Copy path"
                >
                  {copiedDbPath ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-ink-soft mt-1.5">
                All daily logs, kanban boards, journals, movies, and game sessions reside safely in this local database file.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-rule/70">
              <button
                type="button"
                onClick={handleExportData}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-card border border-rule hover:border-ink-soft text-xs font-mono text-ink rounded-[4px] active:scale-95 transition-all shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-ledger-blue" />
                <span>Export Complete Backup (JSON)</span>
              </button>

              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-card border border-rule hover:border-ink-soft text-xs font-mono text-ink rounded-[4px] cursor-pointer active:scale-95 transition-all shadow-xs">
                <Upload className="w-3.5 h-3.5 text-ledger-blue" />
                <span>{importing ? 'Restoring...' : 'Restore from JSON File'}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  disabled={importing}
                  className="hidden"
                />
              </label>
            </div>

            {importMessage && (
              <div className={`p-3 rounded-[4px] text-xs font-mono border ${
                importMessage.isError ? 'bg-stamp-light border-stamp-red/40 text-stamp-red' : 'bg-emerald-50 border-emerald-300 text-emerald-700'
              }`}>
                {importMessage.text}
              </div>
            )}
          </div>

          {/* Mobile APK & Remote Server Connection Card */}
          <div className="ledger-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-rule/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-paper rounded-md border border-rule text-ledger-blue">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-serif text-base font-semibold text-ink">
                    Mobile APK & Remote Server Connection
                  </h2>
                  <p className="text-[11px] text-ink-soft">
                    Configure custom backend API host for Android APK or network-connected clients
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-paper border border-rule text-[11px] font-mono rounded-[4px] text-ink">
                <Wifi className="w-3 h-3 text-ledger-blue" />
                <span>{serverUrl ? 'Custom Host' : 'Relative /api'}</span>
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-ink">
                Backend API Server Base URL
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="http://192.168.1.50:3000/api (leave blank for local relative /api)"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-paper border border-rule rounded-[4px] focus:bg-card focus:outline-none focus:ring-1 focus:ring-ledger-blue font-mono"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestServer}
                    disabled={serverTest.testing}
                    className="px-3 py-2 bg-card border border-rule hover:border-ink-soft text-xs font-mono text-ink rounded-[4px] disabled:opacity-50 flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    {serverTest.testing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Smartphone className="w-3.5 h-3.5 text-ledger-blue" />}
                    <span>Test Ping</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveServerUrl}
                    className="px-3.5 py-2 bg-ledger-blue hover:bg-ledger-hover text-white text-xs font-mono rounded-[4px] flex items-center gap-1.5 active:scale-95 transition-all shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>

                  {serverUrl && (
                    <button
                      type="button"
                      onClick={handleResetServerUrl}
                      className="px-3 py-2 bg-paper border border-rule hover:bg-card text-xs font-mono text-ink-soft hover:text-ink rounded-[4px] active:scale-95 transition-all"
                      title="Reset to /api"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {(serverUrl.includes('127.0.0.1') || serverUrl.includes('localhost')) && (
                <div className="p-2.5 rounded-[4px] text-[11px] font-mono border bg-amber-500/10 border-amber-500/30 text-amber-600 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    Notice: <code>127.0.0.1</code> and <code>localhost</code> refer to this phone itself. To connect to your computer, enter your PC's local Wi-Fi IP address (e.g. <code>http://192.168.18.47:3000/api</code>).
                  </span>
                </div>
              )}

              <p className="text-[11px] text-ink-soft leading-relaxed">
                When using the Android APK on your phone, set this to your desktop PC's local network IP address (e.g. <code className="bg-paper px-1 py-0.5 rounded text-ink border border-rule font-mono">http://192.168.1.100:3000/api</code>). The web app on desktop uses relative <code className="bg-paper px-1 py-0.5 rounded text-ink border border-rule font-mono">/api</code> by default.
              </p>

              {serverSavedMessage && (
                <p className="text-xs font-mono text-emerald-600 flex items-center gap-1 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{serverSavedMessage}</span>
                </p>
              )}

              {serverTest.result && (
                <div className={`p-2.5 rounded-[4px] text-xs font-mono border flex items-center gap-2 ${
                  serverTest.result.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-stamp-light border-stamp-red/40 text-stamp-red'
                }`}>
                  {serverTest.result.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                  <span>{serverTest.result.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Application Updates & Packaging Section */}
          <AppUpdateSection />
        </form>
      )}
    </div>
  );
};

