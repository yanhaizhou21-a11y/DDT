import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Send,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Copy,
  Check,
  RotateCw,
  FolderKanban,
  BookOpen,
  Utensils,
  Gamepad2,
  Film,
  SquareKanban,
  ExternalLink,
} from 'lucide-react';
import {
  fetchDailyRecap,
  sendDiscordRecap,
  fetchDiscordWebhookSettings,
  saveDiscordWebhookSettings,
} from '../api';
import type { DailyRecapResponse } from '../types';
import { cn } from '../lib/utils';

export interface DiscordRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
}

export function DiscordIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export const DiscordRecapModal: React.FC<DiscordRecapModalProps> = ({
  isOpen,
  onClose,
  initialDate,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
  const [customNote, setCustomNote] = useState<string>('');
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [maskedSavedUrl, setMaskedSavedUrl] = useState<string | null>(null);
  const [showWebhookUrl, setShowWebhookUrl] = useState(false);
  const [saveWebhookUrl, setSaveWebhookUrl] = useState(true);

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [recapData, setRecapData] = useState<DailyRecapResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  // Sync initial date if passed
  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  // Load saved webhook settings on open
  useEffect(() => {
    if (isOpen) {
      fetchDiscordWebhookSettings()
        .then((s) => {
          if (s.maskedUrl) {
            setMaskedSavedUrl(s.maskedUrl);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Load daily recap data when date or modal state changes
  const loadRecap = async (date: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchDailyRecap(date);
      setRecapData(res);
      if (res.savedWebhookUrl) {
        setMaskedSavedUrl(res.savedWebhookUrl);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load daily activity data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRecap(selectedDate);
    }
  }, [isOpen, selectedDate]);

  // Quick day jumps
  const jumpDay = (offset: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  // Dispatch handler
  const handleSend = async () => {
    try {
      setSending(true);
      setError(null);
      setSuccessNotice(null);

      const targetUrl = webhookUrl.trim() || undefined;

      const res = await sendDiscordRecap({
        webhookUrl: targetUrl,
        date: selectedDate,
        customNote: customNote.trim() || undefined,
        saveWebhook: saveWebhookUrl,
      });

      setSuccessNotice(`Daily recap successfully dispatched to Discord at ${new Date(res.dispatchedAt).toLocaleTimeString()}!`);
      if (saveWebhookUrl && targetUrl) {
        setMaskedSavedUrl(targetUrl.replace(/\/([^/]{6})[^/]+$/, '/$1••••••••'));
        setWebhookUrl('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send recap to Discord.');
    } finally {
      setSending(false);
    }
  };

  // Copy Payload JSON
  const handleCopyPayload = () => {
    if (!recapData) return;
    const payload = {
      ...recapData.discordPayload,
      embeds: recapData.discordPayload.embeds.map((e) => ({
        ...e,
        description: customNote.trim()
          ? `> 💬 **Dispatch Note:** *"${customNote.trim()}"*\n\n${e.description}`
          : e.description,
      })),
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  if (!isOpen) return null;

  const activity = recapData?.activity;
  const embed = recapData?.discordPayload.embeds[0];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-4xl">
      <div className="space-y-5 -mt-2">
        {/* Custom Header with Discord Branding */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-rule/70 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#5865F2] text-white flex items-center justify-center shadow-xs">
              <DiscordIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                <span>Discord Daily Activity Recap</span>
              </h2>
              <p className="text-xs text-ink-soft">
                Dispatch an editorial ledger summary to your Discord channel for any date.
              </p>
            </div>
          </div>

          {/* Quick Date Jumper */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-paper border border-rule/80 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => jumpDay(-1)}
              className="p-1 text-ink-soft hover:text-ink rounded hover:bg-card transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="bg-card text-xs font-mono font-semibold text-ink px-2 py-1 rounded border border-rule/60 focus:outline-hidden"
            />

            <button
              type="button"
              onClick={() => jumpDay(1)}
              className="p-1 text-ink-soft hover:text-ink rounded hover:bg-card transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {selectedDate !== todayStr && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="px-2 py-1 text-[11px] font-mono text-ledger-blue hover:underline"
              >
                Today
              </button>
            )}
          </div>
        </div>

        {/* Status Banners */}
        {error && (
          <div className="p-3 bg-stamp-light/50 border border-stamp-red/50 rounded-lg text-xs text-stamp-red flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-semibold">Dispatch Failed</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        {successNotice && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Activity Summary Strip */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <div className="p-2.5 bg-paper/70 rounded-lg border border-rule/70 text-center">
            <FolderKanban className="w-3.5 h-3.5 mx-auto mb-1 text-ledger-blue" />
            <div className="font-mono text-xs font-bold text-ink">
              {activity ? activity.projectsActivity.reduce((acc, p) => acc + p.count, 0) : 0}
            </div>
            <div className="text-[10px] text-ink-soft truncate">Projects</div>
          </div>

          <div className="p-2.5 bg-paper/70 rounded-lg border border-rule/70 text-center">
            <BookOpen className="w-3.5 h-3.5 mx-auto mb-1 text-gold" />
            <div className="font-mono text-xs font-bold text-ink">
              {activity?.journal?.hasEntry ? `${activity.journal.wordCount}w` : '0w'}
            </div>
            <div className="text-[10px] text-ink-soft truncate">Journal</div>
          </div>

          <div className="p-2.5 bg-paper/70 rounded-lg border border-rule/70 text-center">
            <Utensils className="w-3.5 h-3.5 mx-auto mb-1 text-stamp-red" />
            <div className="font-mono text-xs font-bold text-ink">
              {activity ? activity.food.reduce((acc, f) => acc + f.items.length, 0) : 0}
            </div>
            <div className="text-[10px] text-ink-soft truncate">Meals</div>
          </div>

          <div className="p-2.5 bg-paper/70 rounded-lg border border-rule/70 text-center">
            <Gamepad2 className="w-3.5 h-3.5 mx-auto mb-1 text-purple-600 dark:text-purple-400" />
            <div className="font-mono text-xs font-bold text-ink">
              {activity ? activity.games.reduce((acc, g) => acc + g.hours, 0) : 0}h
            </div>
            <div className="text-[10px] text-ink-soft truncate">Gaming</div>
          </div>

          <div className="p-2.5 bg-paper/70 rounded-lg border border-rule/70 text-center">
            <Film className="w-3.5 h-3.5 mx-auto mb-1 text-blue-500" />
            <div className="font-mono text-xs font-bold text-ink">
              {activity ? activity.watchlist.length : 0}
            </div>
            <div className="text-[10px] text-ink-soft truncate">Watchlist</div>
          </div>

          <div className="p-2.5 bg-paper/70 rounded-lg border border-rule/70 text-center">
            <SquareKanban className="w-3.5 h-3.5 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
            <div className="font-mono text-xs font-bold text-ink">
              {activity ? activity.kanban.length : 0}
            </div>
            <div className="text-[10px] text-ink-soft truncate">Tasks</div>
          </div>
        </div>

        {/* Configuration Section (Webhook & Custom Note) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-paper/40 border border-rule/70 rounded-xl">
          {/* Left: Webhook URL Input (7 cols) */}
          <div className="md:col-span-7 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-semibold text-ink flex items-center gap-1.5">
                <DiscordIcon className="w-3.5 h-3.5 text-[#5865F2]" />
                Discord Webhook URL:
              </label>
              {maskedSavedUrl && !webhookUrl && (
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-700">
                  Configured
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type={showWebhookUrl ? 'text' : 'password'}
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder={maskedSavedUrl || 'https://discord.com/api/webhooks/...'}
                className="w-full pl-3 pr-10 py-2 bg-card border border-rule/80 rounded-lg text-xs font-mono text-ink placeholder:text-ink-soft/40 focus:outline-hidden focus:ring-1 focus:ring-[#5865F2]"
              />
              <button
                type="button"
                onClick={() => setShowWebhookUrl(!showWebhookUrl)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink p-1"
                title={showWebhookUrl ? 'Hide URL' : 'Show URL'}
              >
                {showWebhookUrl ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-ink-soft pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveWebhookUrl}
                  onChange={(e) => setSaveWebhookUrl(e.target.checked)}
                  className="rounded border-rule text-[#5865F2] focus:ring-[#5865F2] accent-[#5865F2]"
                />
                <span>Save Webhook URL for future dispatches</span>
              </label>

              <span className="text-[10px] opacity-75">
                Discord: Integrations → Webhooks
              </span>
            </div>
          </div>

          {/* Right: Custom Dispatch Note (5 cols) */}
          <div className="md:col-span-5 space-y-2">
            <label className="text-xs font-mono font-semibold text-ink block">
              Optional Note / Intro Message:
            </label>
            <textarea
              rows={2}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. Productive Friday shipping the project tracker..."
              className="w-full p-2 bg-card border border-rule/80 rounded-lg text-xs font-sans text-ink placeholder:text-ink-soft/40 focus:outline-hidden focus:ring-1 focus:ring-[#5865F2] resize-none"
            />
          </div>
        </div>

        {/* ─── LIVE DISCORD MESSAGE MOCKUP PREVIEW ────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-ink-soft">
            <span className="flex items-center gap-1.5 font-semibold text-ink">
              <Sparkles className="w-3.5 h-3.5 text-[#5865F2]" />
              Live Discord Message Preview
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyPayload}
                className="flex items-center gap-1 px-2 py-0.5 bg-paper hover:bg-card border border-rule rounded text-[11px] text-ink-soft hover:text-ink transition-colors"
                title="Copy raw JSON payload"
              >
                {copiedJson ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
              </button>
              <button
                type="button"
                onClick={() => loadRecap(selectedDate)}
                className="p-1 text-ink-soft hover:text-ink"
                title="Refresh preview"
              >
                <RotateCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Authentic Discord Chat Mockup Container */}
          <div className="bg-[#313338] text-[#dbdee1] font-sans p-4 rounded-xl border border-[#232428] shadow-inner space-y-3 select-text max-h-[340px] overflow-y-auto">
            {/* Discord Bot Message Row */}
            <div className="flex items-start gap-3">
              {/* Bot Avatar */}
              <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center shrink-0 text-white shadow-xs">
                <DiscordIcon className="w-6 h-6" />
              </div>

              {/* Bot Message Body */}
              <div className="min-w-0 flex-1 space-y-1.5">
                {/* Author row */}
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-semibold text-white text-sm hover:underline cursor-pointer">
                    DDT Daily Ledger
                  </span>
                  <span className="bg-[#5865F2] text-white text-[9px] font-bold px-1 py-0.5 rounded uppercase tracking-wider font-mono">
                    BOT
                  </span>
                  <span className="text-[#949ba4] text-[11px] ml-1">
                    Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Content text */}
                <div className="text-xs text-[#dbdee1]">
                  📅 <strong>Daily Ledger Dispatch</strong> — <strong>{recapData?.formattedDate || selectedDate}</strong>
                </div>

                {/* Discord Embed Box */}
                {embed && (
                  <div className="bg-[#2b2d31] border-l-4 border-[#2F4858] rounded-r p-3.5 space-y-3 shadow-md max-w-2xl">
                    {/* Embed Title & Description */}
                    <div>
                      <div className="text-white font-bold text-sm tracking-tight mb-1">
                        {embed.title}
                      </div>

                      {customNote.trim() && (
                        <div className="text-xs text-[#b5bac1] italic border-l-2 border-[#5865F2]/60 pl-2 mb-2">
                          💬 <strong>Dispatch Note:</strong> &ldquo;{customNote.trim()}&rdquo;
                        </div>
                      )}

                      <div className="text-[11px] text-[#949ba4]">
                        📊 <strong>Day Summary:</strong> {activity ? Object.values(activity).filter((v) => (Array.isArray(v) ? v.length > 0 : v?.hasEntry)).length : 0}/6 active modules logged on <strong>{recapData?.formattedDate}</strong>.
                      </div>
                    </div>

                    {/* Embed Fields Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#3f4147]/50">
                      {embed.fields.map((field, idx) => (
                        <div
                          key={`field-${idx}`}
                          className={cn(
                            'space-y-0.5',
                            !field.inline && 'sm:col-span-2'
                          )}
                        >
                          <div className="text-[#b5bac1] font-semibold text-[11px] tracking-wide">
                            {field.name}
                          </div>
                          <div className="text-xs text-[#dbdee1] whitespace-pre-wrap leading-relaxed">
                            {field.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Embed Footer */}
                    <div className="pt-2 border-t border-[#3f4147]/40 flex items-center gap-1.5 text-[10px] text-[#949ba4]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{embed.footer?.text || 'DDT • Local-First Personal Ledger'}</span>
                      <span>•</span>
                      <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-rule/70">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-card border border-rule text-ink-soft hover:text-ink rounded-lg text-xs font-mono transition-colors"
          >
            Close
          </button>

          <button
            type="button"
            disabled={sending || (!webhookUrl.trim() && !maskedSavedUrl)}
            onClick={handleSend}
            className={cn(
              'flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold text-white transition-all shadow-subtle active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
              'bg-[#5865F2] hover:bg-[#4752C4]'
            )}
          >
            {sending ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <DiscordIcon className="w-4 h-4" />
            )}
            <span>{sending ? 'Dispatching to Discord...' : 'Send Recap to Discord'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
