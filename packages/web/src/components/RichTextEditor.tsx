import React, { useRef, useState, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  FileCode,
  Undo,
  Redo,
  Eye,
  Edit3,
  Columns,
  Sparkles,
  CheckCircle2,
  Clock,
  RotateCcw,
  Save,
  FileText,
} from 'lucide-react';

import { cn } from '../lib/utils';

export type EditorFontSize = 'normal' | 'large' | 'huge';

export interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  onSave?: () => void;
  saveStatus?: 'saved' | 'saving' | 'unsaved';
  lastSavedAt?: string | null;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  defaultViewMode?: 'edit' | 'split' | 'preview';
  hideHeaderSave?: boolean;
  minHeight?: string;
  onOpenTemplates?: () => void;
  initialFontSize?: EditorFontSize;
}

export function RichTextEditor({
  value,
  onChange,
  onSave,
  saveStatus = 'saved',
  lastSavedAt,
  placeholder = 'Write your thoughts, daily ledger, achievements, or notes here...',
  className,
  compact = false,
  defaultViewMode,
  hideHeaderSave = false,
  minHeight,
  onOpenTemplates,
  initialFontSize,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'split' | 'preview'>(() => {
    if (defaultViewMode) return defaultViewMode;
    if (compact && value.trim()) return 'preview';
    return 'edit';
  });
  const [fontSize, setFontSize] = useState<EditorFontSize>(() => {
    if (initialFontSize) return initialFontSize;
    if (compact) return 'normal';
    return 'large'; // Default to large so it feels noticeably bigger immediately
  });
  const [history, setHistory] = useState<string[]>([value]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Sync default view mode if value changes from empty on mount
  useEffect(() => {
    if (defaultViewMode) {
      setViewMode(defaultViewMode);
    }
  }, [defaultViewMode]);

  // Stats
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  const updateContentWithHistory = useCallback((newText: string) => {
    onChange(newText);
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), newText].slice(-30));
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }, [onChange, historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      onChange(history[nextIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      onChange(history[nextIndex]);
    }
  };

  const insertFormatting = (prefix: string, suffix = '', defaultText = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || defaultText;

    const before = value.slice(0, start);
    const after = value.slice(end);

    const replacement = `${prefix}${selected}${suffix}`;
    const nextVal = before + replacement + after;

    updateContentWithHistory(nextVal);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length
      );
    }, 10);
  };

  const insertLinePrefix = (linePrefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const beforeCursor = value.slice(0, start);
    const lastNewline = beforeCursor.lastIndexOf('\n');
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

    const before = value.slice(0, lineStart);
    const after = value.slice(lineStart);

    const nextVal = before + linePrefix + after;
    updateContentWithHistory(nextVal);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + linePrefix.length, start + linePrefix.length);
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) handleRedo();
      else handleUndo();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      insertFormatting('**', '**', 'bold text');
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      insertFormatting('*', '*', 'italic text');
    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      onSave?.();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      insertFormatting('  ', '');
    }
  };

  const resolvedMinHeight = minHeight || (compact ? 'min-h-[170px]' : 'min-h-[420px]');

  const fontSizeConfig = {
    normal: {
      label: 'Normal',
      textareaClass: 'text-base md:text-lg leading-relaxed',
      proseClass: 'text-base md:text-lg leading-relaxed',
      h1Class: 'text-2xl md:text-3xl font-serif font-bold tracking-tight',
      h2Class: 'text-xl md:text-2xl font-serif font-bold tracking-tight',
      h3Class: 'text-lg md:text-xl font-serif font-semibold',
      pClass: 'text-base md:text-lg leading-relaxed mb-3.5 font-sans',
      listClass: 'text-base md:text-lg space-y-2 my-2.5',
      quoteClass: 'text-base md:text-lg pl-4 py-2 my-3.5 italic text-ink-soft',
      codeInlineClass: 'px-1.5 py-0.5 rounded bg-paper text-ink font-mono text-xs md:text-sm border border-rule',
      codeBlockClass: 'p-3.5 my-3 rounded-lg bg-paper text-ink font-mono text-xs md:text-sm overflow-x-auto border border-rule',
    },
    large: {
      label: 'Large',
      textareaClass: 'text-lg md:text-xl lg:text-2xl leading-relaxed',
      proseClass: 'text-lg md:text-xl lg:text-2xl leading-relaxed',
      h1Class: 'text-3xl md:text-4xl font-serif font-bold tracking-tight',
      h2Class: 'text-2xl md:text-3xl font-serif font-bold tracking-tight',
      h3Class: 'text-xl md:text-2xl font-serif font-semibold',
      pClass: 'text-lg md:text-xl lg:text-2xl leading-relaxed mb-4 font-sans',
      listClass: 'text-lg md:text-xl lg:text-2xl space-y-2.5 my-3',
      quoteClass: 'text-lg md:text-xl lg:text-2xl pl-5 py-2.5 my-4 italic text-ink-soft',
      codeInlineClass: 'px-2 py-0.5 rounded bg-paper text-ink font-mono text-sm md:text-base border border-rule',
      codeBlockClass: 'p-4 my-4 rounded-lg bg-paper text-ink font-mono text-sm md:text-base overflow-x-auto border border-rule',
    },
    huge: {
      label: 'Huge',
      textareaClass: 'text-xl md:text-2xl lg:text-3xl leading-relaxed',
      proseClass: 'text-xl md:text-2xl lg:text-3xl leading-relaxed',
      h1Class: 'text-4xl md:text-5xl font-serif font-bold tracking-tight',
      h2Class: 'text-3xl md:text-4xl font-serif font-bold tracking-tight',
      h3Class: 'text-2xl md:text-3xl font-serif font-semibold',
      pClass: 'text-xl md:text-2xl lg:text-3xl leading-relaxed mb-5 font-sans',
      listClass: 'text-xl md:text-2xl lg:text-3xl space-y-3 my-4',
      quoteClass: 'text-xl md:text-2xl lg:text-3xl pl-6 py-3 my-5 italic text-ink-soft',
      codeInlineClass: 'px-2 py-0.5 rounded bg-paper text-ink font-mono text-base md:text-lg border border-rule',
      codeBlockClass: 'p-5 my-5 rounded-lg bg-paper text-ink font-mono text-base md:text-lg overflow-x-auto border border-rule',
    },
  };

  const activeFont = compact
    ? {
        label: 'Compact',
        textareaClass: 'text-xs sm:text-sm leading-relaxed',
        proseClass: 'text-xs sm:text-sm leading-relaxed',
        h1Class: 'text-lg font-serif font-bold tracking-tight',
        h2Class: 'text-base font-serif font-bold tracking-tight',
        h3Class: 'text-sm font-serif font-semibold',
        pClass: 'text-xs sm:text-sm leading-relaxed mb-2 font-sans',
        listClass: 'text-xs sm:text-sm space-y-1 my-1.5',
        quoteClass: 'text-xs sm:text-sm pl-3 py-1 my-2 italic text-ink-soft',
        codeInlineClass: 'px-1 py-0.5 rounded bg-paper text-ink font-mono text-[11px] border border-rule',
        codeBlockClass: 'p-2.5 my-2 rounded bg-paper text-ink font-mono text-xs overflow-x-auto border border-rule',
      }
    : fontSizeConfig[fontSize];

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border border-rule bg-card shadow-subtle overflow-hidden transition-all duration-200',
        compact ? 'border-rule/80' : '',
        className
      )}
    >
      {/* Top Formatting Toolbar */}
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-1.5 bg-paper/60 border-b border-rule/70 backdrop-blur-xs',
          compact ? 'px-2.5 py-1.5' : 'px-3.5 py-2.5'
        )}
      >
        {/* Formatting actions group */}
        <div className="flex items-center flex-wrap gap-0.5 sm:gap-1">
          {/* History */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            className="p-1 sm:p-1.5 rounded-md text-ink-soft hover:text-ink hover:bg-paper/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Redo (Ctrl+Shift+Z)"
            aria-label="Redo"
            className="p-1 sm:p-1.5 rounded-md text-ink-soft hover:text-ink hover:bg-paper/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-3.5 bg-rule/70 mx-0.5 sm:mx-1" />

          {/* Typography */}
          <button
            type="button"
            onClick={() => insertFormatting('**', '**', 'bold')}
            title="Bold (Ctrl+B)"
            aria-label="Bold text"
            className="p-1 sm:p-1.5 rounded-md text-ink-soft hover:text-ink hover:bg-paper/80 font-bold transition-colors"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('*', '*', 'italic')}
            title="Italic (Ctrl+I)"
            aria-label="Italic text"
            className="p-1 sm:p-1.5 rounded-md text-ink-soft hover:text-ink hover:bg-paper/80 italic transition-colors"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('`', '`', 'code')}
            title="Inline Code"
            aria-label="Inline code"
            className="p-1 sm:p-1.5 rounded-md text-ink-soft hover:text-ink hover:bg-paper/80 transition-colors"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          {!compact && (
            <>
              <button
                type="button"
                onClick={() => insertFormatting('~~', '~~', 'strikethrough')}
                title="Strikethrough"
                aria-label="Strikethrough text"
                className="p-1.5 rounded-md text-ink-soft hover:text-ink hover:bg-paper/80 transition-colors"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
              <span className="w-px h-4 bg-rule/70 mx-1" />
              <button
                type="button"
                onClick={() => insertLinePrefix('# ')}
                title="Heading 1"
                aria-label="Heading 1"
                className="p-1.5 rounded-md text-ink-soft hover:text-ink hover:bg-paper/80 transition-colors font-serif font-bold text-xs"
              >
                <Heading1 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => insertLinePrefix('## ')}
            title="Heading 2"
            aria-label="Heading 2"
            className="p-1 sm:p-1.5 rounded-md text-ink-soft hover:text-ink hover:bg-paper/80 transition-colors font-serif font-semibold text-xs"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-3.5 bg-rule/70 mx-0.5 sm:mx-1" />

          {/* Structures */}
          <button
            type="button"
            onClick={() => insertLinePrefix('- ')}
            title="Bullet List"
            aria-label="Bullet list"
            className="p-1 sm:p-1.5 rounded-md text-ink-soft hover:text-ink hover:bg-paper/80 transition-colors"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix('1. ')}
            title="Numbered List"
            aria-label="Numbered list"
            className="p-1 sm:p-1.5 rounded-md text-ink-soft hover:text-ink hover:bg-paper/80 transition-colors"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          {!compact && (
            <>
              <button
                type="button"
                onClick={() => insertLinePrefix('> ')}
                title="Blockquote"
                aria-label="Blockquote"
                className="p-1.5 rounded-md text-ink-soft hover:text-ink hover:bg-paper/80 transition-colors"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('\n```ts\n', '\n```\n', '// code here')}
                title="Code Block"
                aria-label="Code block"
                className="p-1.5 rounded-md text-ink-soft hover:text-ink hover:bg-paper/80 transition-colors"
              >
                <FileCode className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertLinePrefix('\n---\n\n')}
                title="Horizontal Divider"
                aria-label="Horizontal divider"
                className="p-1.5 rounded-md text-ink-soft hover:text-ink hover:bg-paper/80 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {onOpenTemplates && (
            <>
              <span className="w-px h-3.5 bg-rule/70 mx-0.5 sm:mx-1" />
              <button
                type="button"
                onClick={onOpenTemplates}
                title="Insert Journal Template"
                aria-label="Insert Journal Template"
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-md text-ledger-blue bg-paper border border-rule hover:border-ledger-blue hover:bg-card transition-all shadow-xs group"
              >
                <Sparkles className="w-3.5 h-3.5 text-gold group-hover:rotate-12 transition-transform" />
                <span className="font-mono text-[11px]">Templates</span>
              </button>
            </>
          )}
        </div>

        {/* View Mode Pills, Font Sizing, Save Status & Action */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Font Size Switcher (only on full editor) */}
          {!compact && (
            <div className="flex items-center p-0.5 rounded-lg bg-paper border border-rule" title="Adjust Editor Text Size">
              <button
                type="button"
                onClick={() => setFontSize('normal')}
                className={cn(
                  'px-2 py-0.5 sm:py-1 text-xs font-mono font-medium rounded-md transition-all',
                  fontSize === 'normal'
                    ? 'bg-card text-ink shadow-xs font-bold'
                    : 'text-ink-soft hover:text-ink'
                )}
                title="Normal text size (16-18px)"
              >
                Aa
              </button>
              <button
                type="button"
                onClick={() => setFontSize('large')}
                className={cn(
                  'px-2 py-0.5 sm:py-1 text-xs font-mono font-medium rounded-md transition-all',
                  fontSize === 'large'
                    ? 'bg-card text-ledger-blue shadow-xs font-bold'
                    : 'text-ink-soft hover:text-ink'
                )}
                title="Large text size (18-22px, recommended for Split View)"
              >
                Aa+
              </button>
              <button
                type="button"
                onClick={() => setFontSize('huge')}
                className={cn(
                  'px-2 py-0.5 sm:py-1 text-xs font-mono font-medium rounded-md transition-all',
                  fontSize === 'huge'
                    ? 'bg-card text-ink shadow-xs font-bold'
                    : 'text-ink-soft hover:text-ink'
                )}
                title="Huge text size (20-26px)"
              >
                Aa++
              </button>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-paper border border-rule">
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 sm:py-1 text-xs font-medium rounded-md transition-all',
                viewMode === 'edit'
                  ? 'bg-card text-ink shadow-xs font-semibold'
                  : 'text-ink-soft hover:text-ink'
              )}
            >
              <Edit3 className="w-3 h-3" />
              <span>Write</span>
            </button>
            {!compact && (
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all',
                  viewMode === 'split'
                    ? 'bg-card text-ink shadow-xs font-semibold'
                    : 'text-ink-soft hover:text-ink'
                )}
              >
                <Columns className="w-3 h-3" />
                <span className="hidden md:inline">Split</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 sm:py-1 text-xs font-medium rounded-md transition-all',
                viewMode === 'preview'
                  ? 'bg-card text-ink shadow-xs font-semibold'
                  : 'text-ink-soft hover:text-ink'
              )}
            >
              <Eye className="w-3 h-3" />
              <span>Preview</span>
            </button>
          </div>

          {/* Prominent Save Button (if not hidden) */}
          {!hideHeaderSave && onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={saveStatus === 'saving'}
              title="Save Entry (Ctrl+S)"
              className={cn(
                'flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold rounded-md transition-all shadow-xs active:scale-95 disabled:opacity-50',
                saveStatus === 'saving'
                  ? 'bg-gold-light text-ink border border-gold/40'
                  : saveStatus === 'saved'
                  ? 'bg-ledger-blue text-paper hover:bg-ledger-hover'
                  : 'bg-ledger-blue text-paper hover:bg-ledger-hover ring-2 ring-gold/50'
              )}
            >
              <Save className={cn('w-3.5 h-3.5', saveStatus === 'saving' && 'animate-spin')} />
              <span>{saveStatus === 'saving' ? 'Saving...' : 'Save'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor Body */}
      <div
        className={cn('flex-1 grid', resolvedMinHeight)}
        style={{ gridTemplateColumns: viewMode === 'split' ? '1fr 1fr' : '1fr' }}
      >
        {/* Write pane */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className="relative flex flex-col h-full bg-card">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => updateContentWithHistory(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={cn(
                'w-full h-full bg-transparent text-ink font-sans resize-none focus:outline-hidden placeholder:text-ink-soft/40 selection:bg-ledger-blue selection:text-paper transition-all',
                activeFont.textareaClass,
                compact ? 'p-3.5' : 'p-5 md:p-8',
                resolvedMinHeight
              )}
            />
          </div>
        )}

        {/* Live Preview pane */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div
            onClick={() => {
              if (compact && !value.trim()) setViewMode('edit');
            }}
            className={cn(
              'h-full overflow-y-auto bg-card-surface selection:bg-ledger-blue selection:text-paper transition-all',
              compact ? 'p-3.5' : 'p-5 md:p-8',
              viewMode === 'split' && 'border-l border-rule',
              resolvedMinHeight
            )}
          >
            {value.trim() ? (
              <div className={cn('journal-prose prose max-w-none text-ink font-sans', activeFont.proseClass)}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ node, ...props }) => (
                      <h1 className={cn(activeFont.h1Class, 'text-ink border-b border-rule/70 pb-2 mt-4 mb-3')} {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2 className={cn(activeFont.h2Class, 'text-ink mt-5 mb-2.5')} {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3 className={cn(activeFont.h3Class, 'text-ink mt-4 mb-2')} {...props} />
                    ),
                    p: ({ node, ...props }) => (
                      <p className={cn(activeFont.pClass, 'text-ink')} {...props} />
                    ),
                    strong: ({ node, ...props }) => <strong className="font-bold text-ink" {...props} />,
                    em: ({ node, ...props }) => <em className="italic text-ink" {...props} />,
                    ul: ({ node, ...props }) => (
                      <ul className={cn('list-disc pl-6 marker:text-ledger-blue text-ink', activeFont.listClass)} {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className={cn('list-decimal pl-6 marker:text-ledger-blue font-mono text-ink', activeFont.listClass)} {...props} />
                    ),
                    li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                    blockquote: ({ node, ...props }) => (
                      <blockquote className={cn('border-l-4 border-ledger-blue bg-paper/60 rounded-r', activeFont.quoteClass)} {...props} />
                    ),
                    code: ({ node, inline, className, children, ...props }: any) => {
                      return inline ? (
                        <code className={activeFont.codeInlineClass} {...props}>
                          {children}
                        </code>
                      ) : (
                        <pre className={activeFont.codeBlockClass}>
                          <code {...props}>{children}</code>
                        </pre>
                      );
                    },
                    hr: ({ node, ...props }) => <hr className="my-6 border-rule" {...props} />,
                    input: ({ node, ...props }) => (
                      <input type="checkbox" className="mr-2 rounded border-rule text-ledger-blue focus:ring-ledger-blue accent-ledger-blue" {...props} />
                    ),
                    a: ({ node, ...props }) => (
                      <a className="text-ledger-blue underline decoration-ledger-blue/40 hover:decoration-ledger-blue hover:text-ledger-hover transition-colors" target="_blank" rel="noopener noreferrer" {...props} />
                    ),
                    table: ({ node, ...props }) => (
                      <div className="overflow-x-auto my-4 border border-rule rounded-lg">
                        <table className="w-full text-left border-collapse text-sm font-mono" {...props} />
                      </div>
                    ),
                    th: ({ node, ...props }) => <th className="bg-paper p-3 font-bold border-b border-rule text-ink" {...props} />,
                    td: ({ node, ...props }) => <td className="p-3 border-b border-rule/60 text-ink-soft" {...props} />,
                  }}
                >
                  {value}
                </ReactMarkdown>
              </div>
            ) : (
              <div
                onClick={() => setViewMode('edit')}
                className="flex flex-col items-center justify-center h-full text-center text-ink-soft/50 py-12 cursor-pointer hover:text-ink-soft transition-colors"
              >
                <Sparkles className="w-6 h-6 mb-2 opacity-40" />
                <p className="text-sm">No entry yet. Click here or switch to Write to start journaling.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div
        className={cn(
          'flex items-center justify-between bg-paper/60 border-t border-rule text-xs text-ink-soft font-mono',
          compact ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-xs'
        )}
      >
        <div className="flex items-center gap-3">
          <span>
            <strong className="text-ink font-semibold">{wordCount}</strong> words
          </span>
          <span>
            <strong className="text-ink font-semibold">{charCount}</strong> chars
          </span>
          {!compact && (
            <span className="hidden sm:inline-flex items-center gap-1">
              <Clock className="w-3 h-3 opacity-60" />
              {readTimeMin} min read
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {lastSavedAt && (
            <div className="text-[10px] sm:text-[11px] opacity-75">
              Saved: {new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          {onSave && !compact && (
            <button
              type="button"
              onClick={onSave}
              disabled={saveStatus === 'saving'}
              className="text-[11px] font-mono text-ledger-blue hover:underline flex items-center gap-1"
            >
              <Save className="w-3 h-3" />
              <span>Save (Ctrl+S)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
