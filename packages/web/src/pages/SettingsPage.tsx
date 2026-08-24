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
} from 'lucide-react';

interface SettingsPageProps {
  onNavigate: (tab: RouteTab) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = () => {
  const [githubToken, setGithubToken] = useState('');
  const [tmdbKey, setTmdbKey] = useState('');
  const [rawgKey, setRawgKey] = useState('');
  const [dbPath, setDbPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Test states
  const [githubTest, setGithubTest] = useState<{ testing: boolean; result?: { valid: boolean; username?: string; message?: string } }>({ testing: false });
  const [tmdbTest, setTmdbTest] = useState<{ testing: boolean; result?: { valid: boolean; message?: string } }>({ testing: false });
  const [rawgTest, setRawgTest] = useState<{ testing: boolean; result?: { valid: boolean; message?: string } }>({ testing: false });

  // Import state
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetchSettings();
      setGithubToken(res.settings.github_token || '');
      setTmdbKey(res.settings.tmdb_api_key || '');
      setRawgKey(res.settings.rawg_api_key || '');
      setDbPath(res.dbPath);
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
        tmdb_api_key: tmdbKey.trim(),
        rawg_api_key: rawgKey.trim(),
      });
      setSaveMessage('Settings saved successfully.');
      setTimeout(() => setSaveMessage(null), 3000);
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
      setImportMessage(res.message || 'Data imported successfully.');
      loadSettings();
    } catch (err: any) {
      setImportMessage(err.message || 'Import failed: Invalid JSON structure.');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Header
        title="Settings"
        subtitle="Third-party API key configurations, database backup & storage info"
      />

      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-ink-soft animate-pulse">
          Loading settings...
        </div>
      ) : (
        <form onSubmit={handleSaveAll} className="space-y-6">
          {/* API Keys Configuration Card */}
          <div className="ledger-card p-5 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-rule">
              <Key className="w-4 h-4 text-ledger-blue" />
              <h2 className="font-serif text-base font-semibold text-ink">
                Third-Party Integrations
              </h2>
            </div>

            <p className="text-xs text-ink-soft leading-relaxed">
              All keys are stored locally in your SQLite database and never sent anywhere except directly to the third-party services. Each integration is completely optional.
            </p>

            {/* GitHub PAT */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-ink">
                  GitHub Personal Access Token
                </label>
                <span className="text-[11px] font-mono text-ink-soft">Scopes: repo, read:user</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-paper border border-rule rounded-[3px] focus:bg-card focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={handleTestGithub}
                  disabled={githubTest.testing || !githubToken.trim()}
                  className="px-3 py-2 bg-card border border-rule hover:border-ink-soft text-xs font-mono text-ink rounded disabled:opacity-50 flex items-center gap-1"
                >
                  {githubTest.testing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Test</span>
                </button>
              </div>
              {githubTest.result && (
                <div
                  className={`text-xs font-mono flex items-center gap-1.5 mt-1 ${
                    githubTest.result.valid ? 'text-emerald-700' : 'text-stamp-red'
                  }`}
                >
                  {githubTest.result.valid ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified for user: @{githubTest.result.username}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{githubTest.result.message || 'Token verification failed'}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* TMDB API Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-ink">
                  TMDB (The Movie Database) API Key or Access Token
                </label>
                <a
                  href="https://www.themoviedb.org/settings/api"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-mono text-ledger-blue hover:underline"
                >
                  Get Key →
                </a>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="TMDB API Key (v3) or Bearer Token (v4)"
                  value={tmdbKey}
                  onChange={(e) => setTmdbKey(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-paper border border-rule rounded-[3px] focus:bg-card focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={handleTestTmdb}
                  disabled={tmdbTest.testing || !tmdbKey.trim()}
                  className="px-3 py-2 bg-card border border-rule hover:border-ink-soft text-xs font-mono text-ink rounded disabled:opacity-50 flex items-center gap-1"
                >
                  {tmdbTest.testing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Test</span>
                </button>
              </div>
              {tmdbTest.result && (
                <div
                  className={`text-xs font-mono flex items-center gap-1.5 mt-1 ${
                    tmdbTest.result.valid ? 'text-emerald-700' : 'text-stamp-red'
                  }`}
                >
                  {tmdbTest.result.valid ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>TMDB connection verified.</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{tmdbTest.result.message || 'Key invalid'}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* RAWG API Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-ink">
                  RAWG Video Games Database API Key
                </label>
                <a
                  href="https://rawg.io/apidocs"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-mono text-ledger-blue hover:underline"
                >
                  Get Key →
                </a>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="RAWG API Key"
                  value={rawgKey}
                  onChange={(e) => setRawgKey(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-paper border border-rule rounded-[3px] focus:bg-card focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={handleTestRawg}
                  disabled={rawgTest.testing || !rawgKey.trim()}
                  className="px-3 py-2 bg-card border border-rule hover:border-ink-soft text-xs font-mono text-ink rounded disabled:opacity-50 flex items-center gap-1"
                >
                  {rawgTest.testing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Test</span>
                </button>
              </div>
              {rawgTest.result && (
                <div
                  className={`text-xs font-mono flex items-center gap-1.5 mt-1 ${
                    rawgTest.result.valid ? 'text-emerald-700' : 'text-stamp-red'
                  }`}
                >
                  {rawgTest.result.valid ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>RAWG connection verified.</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{rawgTest.result.message || 'Key invalid'}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Save Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-rule">
              {saveMessage ? (
                <span className="text-xs font-mono text-emerald-700">{saveMessage}</span>
              ) : (
                <span className="text-xs font-mono text-ink-soft">Changes persist to SQLite</span>
              )}
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-ledger-blue text-paper text-xs font-medium rounded hover:bg-ledger-hover transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Keys'}</span>
              </button>
            </div>
          </div>

          {/* Data Portability & Backup Card */}
          <div className="ledger-card p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-rule">
              <Database className="w-4 h-4 text-ledger-blue" />
              <h2 className="font-serif text-base font-semibold text-ink">
                Data Portability & Database
              </h2>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1">
                SQLite Database Location
              </label>
              <div className="p-2.5 bg-paper border border-rule rounded-[3px] text-xs font-mono text-ink break-all select-all">
                {dbPath}
              </div>
              <p className="text-[11px] text-ink-soft mt-1">
                All logs, kanban cards, journal entries, food logs, and watchlist items reside in this local SQLite file.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-rule">
              <button
                type="button"
                onClick={handleExportData}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-card border border-rule hover:border-ink-soft text-xs font-mono text-ink rounded transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-ledger-blue" />
                <span>Export All Data (JSON)</span>
              </button>

              <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-card border border-rule hover:border-ink-soft text-xs font-mono text-ink rounded cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-ledger-blue" />
                <span>{importing ? 'Importing...' : 'Restore from JSON'}</span>
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
              <p className="text-xs font-mono text-ink-soft pt-1">{importMessage}</p>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
