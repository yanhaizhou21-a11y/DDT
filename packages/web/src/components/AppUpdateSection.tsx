import React, { useState, useEffect } from 'react';
import {
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Download,
  ExternalLink,
  Monitor,
  Smartphone,
  Globe,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileDown,
  Check,
} from 'lucide-react';

export const CURRENT_APP_VERSION = '1.0.0';
const GITHUB_REPO = 'yanhaizhou21-a11y/DDT';
const LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const RELEASES_PAGE_URL = `https://github.com/${GITHUB_REPO}/releases`;
const STORAGE_AUTO_CHECK = 'ddt_auto_check_updates';
const STORAGE_LAST_CHECKED = 'ddt_last_update_check';

export type AppPlatform = 'desktop' | 'mobile' | 'web';

export function getAppPlatform(): AppPlatform {
  if (typeof window === 'undefined') return 'web';

  const ua = window.navigator.userAgent || '';
  const isMobileUa = /android|iphone|ipad|ipod/i.test(ua);
  const isAndroidAsset = window.location.href.includes('android_asset');
  const hasCapacitor = Boolean((window as any).Capacitor);
  const isCapacitorProto = window.location.protocol === 'capacitor:';

  if (isAndroidAsset || hasCapacitor || isCapacitorProto || (isMobileUa && window.location.protocol === 'file:')) {
    return 'mobile';
  }

  const hasTauri = Boolean((window as any).__TAURI_INTERNALS__) || Boolean((window as any).__TAURI__);
  const isTauriHost = window.location.hostname === 'tauri.localhost' || window.location.protocol === 'tauri:';

  if (hasTauri || isTauriHost) {
    return 'desktop';
  }

  if (window.location.protocol === 'file:' && !isMobileUa) {
    return 'desktop';
  }

  return 'web';
}

export function parseSemver(v: string): number[] {
  const cleaned = v.trim().replace(/^v/i, '');
  const [versionPart] = cleaned.split('-');
  const parts = versionPart.split('.').map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts;
}

export function isNewerVersion(remoteTag: string, currentVersion: string): boolean {
  const remote = parseSemver(remoteTag);
  const current = parseSemver(currentVersion);
  for (let i = 0; i < 3; i++) {
    if (remote[i] > current[i]) return true;
    if (remote[i] < current[i]) return false;
  }
  return false;
}

export interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

export interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  assets: GitHubAsset[];
}

function formatDate(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoStr;
  }
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export const AppUpdateSection: React.FC = () => {
  const platform = getAppPlatform();
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<'idle' | 'up-to-date' | 'update-available' | 'error'>('idle');
  const [release, setRelease] = useState<GitHubRelease | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showChangelog, setShowChangelog] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(STORAGE_LAST_CHECKED);
    }
    return null;
  });
  const [autoCheck, setAutoCheck] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(STORAGE_AUTO_CHECK) === 'true';
    }
    return false;
  });

  const handleToggleAutoCheck = (enabled: boolean) => {
    setAutoCheck(enabled);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_AUTO_CHECK, enabled ? 'true' : 'false');
    }
  };

  const checkForUpdates = async () => {
    setChecking(true);
    setErrorMessage(null);

    try {
      const res = await fetch(LATEST_RELEASE_API, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastChecked(now);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_LAST_CHECKED, now);
      }

      if (res.status === 404) {
        setStatus('up-to-date');
        setRelease(null);
        return;
      }

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('GitHub API rate limit exceeded. Please try again later or visit the releases page.');
        }
        throw new Error(`Failed to check updates (HTTP ${res.status})`);
      }

      const data: GitHubRelease = await res.json();
      setRelease(data);

      const hasUpdate = isNewerVersion(data.tag_name, CURRENT_APP_VERSION);
      if (hasUpdate) {
        setStatus('update-available');
      } else {
        setStatus('up-to-date');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Unable to connect to GitHub releases. Check your network connection.');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (autoCheck) {
      checkForUpdates();
    }
  }, []);

  const triggerDownload = (url: string, filename?: string) => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    if (filename) a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const desktopAsset = release?.assets?.find(
    (a) =>
      a.name.toLowerCase() === 'ddt-setup.exe' ||
      a.name.toLowerCase() === 'ddt.exe' ||
      a.name.toLowerCase().endsWith('.exe')
  );

  const desktopSetupAsset = release?.assets?.find((a) => a.name.toLowerCase() === 'ddt-setup.exe');
  const desktopPortableAsset = release?.assets?.find((a) => a.name.toLowerCase() === 'ddt.exe');

  const mobileAsset = release?.assets?.find(
    (a) =>
      a.name.toLowerCase() === 'ddt.apk' ||
      a.name.toLowerCase() === 'app-debug.apk' ||
      a.name.toLowerCase().endsWith('.apk')
  );

  // Fallback direct release links for current version (v1.0.0)
  const fallbackExeUrl = `https://github.com/${GITHUB_REPO}/releases/download/v${CURRENT_APP_VERSION}/DDT-Setup.exe`;
  const fallbackApkUrl = `https://github.com/${GITHUB_REPO}/releases/download/v${CURRENT_APP_VERSION}/app-debug.apk`;

  return (
    <div className="ledger-card p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-rule/70 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-paper rounded-md border border-rule text-ledger-blue">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-serif text-base font-semibold text-ink">
              Application Updates & Packaging
            </h2>
            <p className="text-[11px] text-ink-soft">
              Check for latest releases, desktop .exe installers, and mobile .apk packages
            </p>
          </div>
        </div>

        {/* Platform & Current Version Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-paper border border-rule text-[11px] font-mono rounded-[4px] text-ink">
            {platform === 'desktop' && <Monitor className="w-3.5 h-3.5 text-ledger-blue" />}
            {platform === 'mobile' && <Smartphone className="w-3.5 h-3.5 text-ledger-blue" />}
            {platform === 'web' && <Globe className="w-3.5 h-3.5 text-ledger-blue" />}
            <span>
              {platform === 'desktop' && 'Desktop App'}
              {platform === 'mobile' && 'Mobile App'}
              {platform === 'web' && 'Web Client'}
            </span>
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-paper border border-rule text-[11px] font-mono rounded-[4px] text-ink font-semibold">
            <span>v{CURRENT_APP_VERSION}</span>
          </span>
        </div>
      </div>

      {/* Action Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={checkForUpdates}
            disabled={checking}
            className="px-3.5 py-2 bg-ledger-blue hover:bg-ledger-hover text-white text-xs font-mono rounded-[4px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xs disabled:opacity-60"
          >
            <RotateCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking GitHub...' : 'Check for Updates'}</span>
          </button>

          <a
            href={RELEASES_PAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-card border border-rule hover:border-ink-soft text-xs font-mono text-ink rounded-[4px] flex items-center gap-1.5 active:scale-95 transition-all"
            title="Open GitHub Releases"
          >
            <ExternalLink className="w-3.5 h-3.5 text-ink-soft" />
            <span className="hidden sm:inline">Releases</span>
          </a>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-[11px] text-ink-soft font-mono">
          {lastChecked && <span>Last checked: {lastChecked}</span>}
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoCheck}
              onChange={(e) => handleToggleAutoCheck(e.target.checked)}
              className="rounded border-rule text-ledger-blue focus:ring-0 w-3.5 h-3.5"
            />
            <span>Auto-check on startup</span>
          </label>
        </div>
      </div>

      {/* Status: Error State */}
      {status === 'error' && errorMessage && (
        <div className="p-3 bg-stamp-light border border-stamp-red/40 rounded-[4px] flex items-start gap-2.5 text-xs font-mono text-stamp-red">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold">Update check failed</p>
            <p className="text-[11px] opacity-90 leading-relaxed">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={checkForUpdates}
            className="px-2 py-1 bg-card border border-stamp-red/30 rounded text-[11px] text-ink hover:bg-paper"
          >
            Retry
          </button>
        </div>
      )}

      {/* Status: Up to date */}
      {status === 'up-to-date' && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-[4px] flex items-center justify-between gap-2 text-xs font-mono text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              You are running the latest version: <strong className="font-bold">v{CURRENT_APP_VERSION}</strong>
            </span>
          </div>
          {release?.tag_name && (
            <span className="text-[11px] text-emerald-700 opacity-80">
              Published {formatDate(release.published_at)}
            </span>
          )}
        </div>
      )}

      {/* Status: Update Available */}
      {status === 'update-available' && release && (
        <div className="p-4 bg-ledger-blue/5 border border-ledger-blue/40 rounded-[4px] space-y-3 font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ledger-blue/20 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-ledger-blue text-white rounded text-[11px] font-bold">
                NEW UPDATE
              </span>
              <span className="font-bold text-ink text-sm">
                {release.tag_name}
              </span>
              <span className="text-xs text-ink-soft hidden sm:inline">- {release.name}</span>
            </div>
            <span className="text-[11px] text-ink-soft">
              Released on {formatDate(release.published_at)}
            </span>
          </div>

          {/* Platform-Tailored 1-Click Update Actions */}
          <div className="space-y-2 pt-1">
            <p className="text-xs text-ink">
              Choose your platform download below to update:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Desktop Button */}
              {(platform === 'desktop' || platform === 'web') && (
                <button
                  type="button"
                  onClick={() => triggerDownload(desktopAsset?.browser_download_url || release.html_url)}
                  className={`p-3 rounded-[4px] border flex items-center justify-between gap-2 text-left active:scale-[0.98] transition-all ${
                    platform === 'desktop'
                      ? 'bg-ledger-blue text-white border-ledger-blue hover:bg-ledger-hover shadow-xs'
                      : 'bg-card border-rule text-ink hover:border-ink-soft'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Monitor className="w-4 h-4 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Download Desktop Update (.exe)</div>
                      <div className={`text-[10px] ${platform === 'desktop' ? 'text-white/80' : 'text-ink-soft'}`}>
                        {desktopSetupAsset ? 'DDT-Setup.exe installer' : desktopAsset?.name || 'Windows Executable'}
                      </div>
                    </div>
                  </div>
                  {desktopAsset?.size ? (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      platform === 'desktop' ? 'bg-white/20 text-white' : 'bg-paper text-ink-soft border border-rule'
                    }`}>
                      {formatBytes(desktopAsset.size)}
                    </span>
                  ) : (
                    <Download className="w-3.5 h-3.5 shrink-0" />
                  )}
                </button>
              )}

              {/* Mobile Button */}
              {(platform === 'mobile' || platform === 'web') && (
                <button
                  type="button"
                  onClick={() => triggerDownload(mobileAsset?.browser_download_url || release.html_url)}
                  className={`p-3 rounded-[4px] border flex items-center justify-between gap-2 text-left active:scale-[0.98] transition-all ${
                    platform === 'mobile'
                      ? 'bg-ledger-blue text-white border-ledger-blue hover:bg-ledger-hover shadow-xs'
                      : 'bg-card border-rule text-ink hover:border-ink-soft'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Download APK Update (.apk)</div>
                      <div className={`text-[10px] ${platform === 'mobile' ? 'text-white/80' : 'text-ink-soft'}`}>
                        {mobileAsset?.name || 'DDT.apk package'}
                      </div>
                    </div>
                  </div>
                  {mobileAsset?.size ? (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      platform === 'mobile' ? 'bg-white/20 text-white' : 'bg-paper text-ink-soft border border-rule'
                    }`}>
                      {formatBytes(mobileAsset.size)}
                    </span>
                  ) : (
                    <Download className="w-3.5 h-3.5 shrink-0" />
                  )}
                </button>
              )}
            </div>

            {/* Additional download variant links */}
            {platform === 'desktop' && desktopPortableAsset && desktopSetupAsset && (
              <div className="flex items-center gap-2 pt-1 text-[11px] text-ink-soft">
                <span>Alternative:</span>
                <button
                  type="button"
                  onClick={() => triggerDownload(desktopPortableAsset.browser_download_url)}
                  className="text-ledger-blue hover:underline inline-flex items-center gap-1"
                >
                  <FileDown className="w-3 h-3" />
                  <span>Portable DDT.exe ({formatBytes(desktopPortableAsset.size)})</span>
                </button>
              </div>
            )}
          </div>

          {/* Changelog Toggle */}
          {release.body && (
            <div className="pt-2 border-t border-ledger-blue/20">
              <button
                type="button"
                onClick={() => setShowChangelog(!showChangelog)}
                className="flex items-center justify-between w-full text-xs text-ink hover:text-ledger-blue"
              >
                <span className="font-semibold">Release Notes & Changelog</span>
                {showChangelog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showChangelog && (
                <div className="mt-2 p-3 bg-paper border border-rule rounded-[4px] text-[11px] text-ink whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
                  {release.body}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Direct Package Downloads Card (Available anytime) */}
      <div className="pt-2 border-t border-rule/70 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink font-mono">
            Direct Application Packages
          </span>
          <span className="text-[11px] text-ink-soft font-mono">
            v{CURRENT_APP_VERSION} Stable
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Windows Installer */}
          <div className="p-3 bg-paper border border-rule rounded-[4px] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Monitor className="w-4 h-4 text-ledger-blue shrink-0" />
              <div>
                <div className="text-xs font-mono font-medium text-ink">Windows Desktop (.exe)</div>
                <div className="text-[11px] text-ink-soft">Tauri v2 Native Bundle</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => triggerDownload(desktopAsset?.browser_download_url || fallbackExeUrl, 'DDT-Setup.exe')}
              className="px-2.5 py-1.5 bg-card border border-rule hover:border-ink-soft text-xs font-mono text-ink rounded-[4px] flex items-center gap-1 active:scale-95 transition-all shadow-xs"
              title="Download Windows Installer"
            >
              <Download className="w-3.5 h-3.5 text-ledger-blue" />
              <span>.exe</span>
            </button>
          </div>

          {/* Android APK */}
          <div className="p-3 bg-paper border border-rule rounded-[4px] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-4 h-4 text-ledger-blue shrink-0" />
              <div>
                <div className="text-xs font-mono font-medium text-ink">Android Mobile (.apk)</div>
                <div className="text-[11px] text-ink-soft">ARM64 & x86_64 Package</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => triggerDownload(mobileAsset?.browser_download_url || fallbackApkUrl, 'DDT.apk')}
              className="px-2.5 py-1.5 bg-card border border-rule hover:border-ink-soft text-xs font-mono text-ink rounded-[4px] flex items-center gap-1 active:scale-95 transition-all shadow-xs"
              title="Download Android APK"
            >
              <Download className="w-3.5 h-3.5 text-ledger-blue" />
              <span>.apk</span>
            </button>
          </div>
        </div>

        <p className="text-[11px] text-ink-soft leading-relaxed font-mono">
          For desktop apps, the installer automatically sets up local start menu shortcuts. For mobile apps, install the .apk on your phone and configure the backend host address above to sync with your desktop.
        </p>
      </div>
    </div>
  );
};
