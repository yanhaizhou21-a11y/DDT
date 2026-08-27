import React, { useEffect, useState } from 'react';
import type { RouteTab } from '../types';
import {
  fetchSettings,
  saveSettings,
  testGithubToken,
  testTmdbKey,
  testRawgKey,
  importData,
} from '../api';
import { Header } from '../components/Header';
import { ThemeToggle } from '../components/ThemeToggle';

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
} from 'lucide-react';

interface SettingsPageProps {
  onNavigate: (tab: RouteTab) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = () => {
  const [githubToken, setGithubToken] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [tmdbKey, setTmdbKey] = useState('');
  const [rawgKey, setRawgKey] = useState('');
  const [dbPath, setDbPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [copiedDbPath, setCopiedDbPath] = useState(false);

  // Show/hide tokens
  const [showGithub, setShowGithub] = useState(false);
  const [showTmdb, setShowTmdb] = useState(false);
  const [showRawg, setShowRawg] = useState(false);

  // Test states
  const [githubTest, setGithubTest] = useState<{ testing: boolean; result?: { valid: boolean; username?: string; message?: string } }>({ testing: false });
  const [tmdbTest, setTmdbTest] = useState<{ testing: boolean; result?: { valid: boolean; message?: string } }>({ testing: false });
  const [rawgTest, setRawgTest] = useState<{ testing: boolean; result?: { valid: boolean; message?: string } }>({ testing: false });

  // Import state
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetchSettings();
      setGithubToken(res.settings.github_token || '');
      setGithubUsername(res.settings.github_username || '');
      setTmdbKey(res.settings.tmdb_api_key || '');
      setRawgKey(res.settings.rawg_api_key || '');
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

  const handleExportData = () => {
    window.location.href = '/api/settings/export';
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
                    className="w-full px-3 py-2 text-xs bg-paper border border-rule rounded-md focus:bg-card focus:outline-hidden font-mono"
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
                        className="w-full px-3 py-2 pr-9 text-xs bg-paper border border-rule rounded-md focus:bg-card focus:outline-hidden font-mono"
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
                      className="w-full px-3 py-2 pr-9 text-xs bg-paper border border-rule rounded-[4px] focus:bg-card focus:outline-none font-mono"
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
                      className="w-full px-3 py-2 pr-9 text-xs bg-paper border border-rule rounded-[4px] focus:bg-card focus:outline-none font-mono"
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
        </form>
      )}
    </div>
  );
};

