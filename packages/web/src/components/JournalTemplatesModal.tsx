import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './Modal';
import {
  Mail,
  BookOpen,
  TrendingUp,
  FileText,
  Users,
  Check,
  Sparkles,
  ArrowRight,
  ListTodo,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Search,
  Code,
  Eye,
  FolderGit2,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface JournalTemplate {
  id: string;
  title: string;
  category: 'email' | 'daily' | 'progress' | 'meeting' | 'custom';
  icon?: React.ComponentType<{ className?: string }>;
  description: string;
  content: string | ((dateStr: string) => string);
  isCustom?: boolean;
  createdAt?: string;
}

export const JOURNAL_TEMPLATES: JournalTemplate[] = [
  {
    id: 'daily-fire',
    title: 'Daily Journal: Fire',
    category: 'daily',
    icon: Sparkles,
    description: 'Full reflection: intention, energy, highlights, challenge, gratitude, and tomorrow.',
    content: (dateStr: string) => `# Daily Journal: ${dateStr}

## Morning Intention
> One sentence: what would make today feel meaningful?

## Energy Check
- **Body:** 
- **Mind:** 

## Three Highlights
**One big thing**: the work that mattered most today:
- 

**One small thing**: a quiet win that doesn't deserve a standup:
- 

**One surprising thing**: what you didn't expect:
- 

## What Challenged Me
Honest reflection, not a to-do list. What slowed you down, confused you, or drained you?
- 

## What I Learned
One thing (could be a technique, a person, a mistake, a feeling):
> 

## Gratitude (be specific)
1. 
2. 
3. 

## Tomorrow's First Move
The single next action, not a vague goal, a literal first step:
- 

## Open Notes
Stream of consciousness. No structure. No pressure. This space is yours.
`,
  },
  {
    id: 'daily-points',
    title: 'Daily Journal: Simple Points',
    category: 'daily',
    icon: ListTodo,
    description: 'Minimalist bullet points: single priority, output shipped, friction, and next step.',
    content: (dateStr: string) => `# Daily Points: ${dateStr}

## Priority
- [Single primary task to complete today]

## Shipped & Done
- [Completed deliverable, commit, or milestone]
- [Bug resolved or task closed]

## Blockers & Friction
- [What stalled or took longer than planned, and why]

## Tomorrow
- [First action item for tomorrow morning]
`,
  },
  {
    id: 'daily-detailed',
    title: 'Daily Journal: Detailed',
    category: 'daily',
    icon: BookOpen,
    description: 'Substantive log: target outcomes, time-stamped work, architectural decisions, and reality check.',
    content: (dateStr: string) => `# Daily Journal: ${dateStr}

## Target Outcome
- [Single concrete deliverable that defines today as productive]

## Log of Work
- [09:00 - 12:00] [Milestone, feature, or review completed]
- [13:30 - 16:00] [Implementation, debugging root cause, or refactor]
- [16:30 - 18:00] [Verification, deployment, or documentation]

## Decisions & Rationale
- **Decision:** [What was chosen]
- **Why:** [Constraint, benchmark, or reason behind the choice]
- **Alternative rejected:** [What was skipped and why]

## Blockers & Friction
- [Issue encountered, delay, or external dependency waiting on]

## Reality Check
- **Output:** [What actually shipped vs. what was planned]
- **Focus rating (1-5):** [Score] - [One sentence on what helped or hurt focus]

## First Move Tomorrow
- [Exact file, command, or action to start with tomorrow morning]
`,
  },
  {
    id: 'progress-update',
    title: 'Project Progress Update',
    category: 'progress',
    icon: TrendingUp,
    description: 'Sprint progress tracking: milestone status, shipped items, blockers, and tomorrow’s goals.',
    content: (dateStr: string) => `# Project Progress Update: ${dateStr}

## Milestone Status
- **Current Milestone:** [Sprint Goal / Deliverable]
- **Status:** On track / Blocked / At risk

## Shipped Today
- [Specific feature, revision, or asset completed]
- [Bug resolved or test verified]

## Blockers
- [Details on any blocker requiring resolution, or None]

## Priorities for Tomorrow
- [ ] [Priority 1: Key deliverable]
- [ ] [Priority 2: Follow-up or polish]
`,
  },
  {
    id: 'meeting-notes',
    title: 'Meeting & Debrief Notes',
    category: 'meeting',
    icon: Users,
    description: 'Capture attendees, key decisions, takeaways, and owned action items.',
    content: (dateStr: string) => `# Meeting Notes: ${dateStr}

**Topic:** [Sync / Review / Planning]  
**Attendees:** [Names]  

## Key Discussion Points
1. [Point discussed]
2. [Feedback or data point raised]

## Decisions Made
- [Decision 1 agreed upon]
- [Decision 2 agreed upon]

## Action Items
- [ ] [Action item 1] - Owner: [Name] - Due: [Date]
- [ ] [Action item 2] - Owner: [Name] - Due: [Date]
`,
  },
  {
    id: 'email-draft',
    title: 'Email / Client Update',
    category: 'email',
    icon: Mail,
    description: 'Clean professional email update with context, deliverables, and action items.',
    content: () => `# Email Update

**To:** [recipient@example.com]  
**Subject:** Update: [Deliverable Name / Sprint Milestone]  

Hi [Name],

Here is the status update on [Project Name].

## Completed Deliverables
- [Item 1]: [Brief description of what was completed or shipped]
- [Item 2]: [Asset or milestone ready for review]

## Next Steps
- [ ] [Action required from recipient, if any]
- [ ] [Upcoming milestone target date]

Best regards,  
[Your Name]
`,
  },
];

const STORAGE_KEY = 'ddt-custom-journal-templates';

function loadStoredTemplates(): JournalTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        ...item,
        isCustom: true,
        icon: FileText,
      }));
    }
  } catch (e) {
    console.warn('Failed to parse custom journal templates', e);
  }
  return [];
}

function saveStoredTemplates(templates: JournalTemplate[]) {
  try {
    const dataToSave = templates.map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
      description: t.description,
      content: typeof t.content === 'string' ? t.content : t.content('{date}'),
      isCustom: true,
      createdAt: t.createdAt || new Date().toISOString(),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (e) {
    console.warn('Failed to save custom templates to localStorage', e);
  }
}

export function resolveTemplateMarkdown(template: JournalTemplate, dateStr: string): string {
  if (typeof template.content === 'function') {
    return template.content(dateStr);
  }
  return template.content
    .replace(/\{date\}/g, dateStr)
    .replace(/\$\{date\}/g, dateStr);
}

interface JournalTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateContent: string, mode: 'replace' | 'append') => void;
  hasExistingContent: boolean;
  selectedDate: string;
}

export const JournalTemplatesModal: React.FC<JournalTemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  hasExistingContent,
  selectedDate,
}) => {
  const [customTemplates, setCustomTemplates] = useState<JournalTemplate[]>(loadStoredTemplates);
  const [selectedId, setSelectedId] = useState<string>('daily-points');
  const [insertMode, setInsertMode] = useState<'replace' | 'append'>('append');

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Editor states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<'daily' | 'progress' | 'meeting' | 'email' | 'custom'>('custom');
  const [formDesc, setFormDesc] = useState('');
  const [formContent, setFormContent] = useState('');
  const [editorPreview, setEditorPreview] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sync stored templates if modal opens
  useEffect(() => {
    if (isOpen) {
      setCustomTemplates(loadStoredTemplates());
      setIsEditorOpen(false);
      setEditingTemplateId(null);
      setFormError(null);
    }
  }, [isOpen]);

  const allTemplates = useMemo(() => {
    return [...customTemplates, ...JOURNAL_TEMPLATES];
  }, [customTemplates]);

  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((t) => {
      // Category filter
      if (activeCategory === 'custom' && !t.isCustom) return false;
      if (activeCategory !== 'all' && activeCategory !== 'custom' && t.category !== activeCategory) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const body = typeof t.content === 'string' ? t.content.toLowerCase() : '';
        return (
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          body.includes(q)
        );
      }
      return true;
    });
  }, [allTemplates, activeCategory, searchQuery]);

  const selectedTemplate =
    allTemplates.find((t) => t.id === selectedId) || allTemplates[0] || JOURNAL_TEMPLATES[0];

  const handleApply = () => {
    if (!selectedTemplate) return;
    const generated = resolveTemplateMarkdown(selectedTemplate, selectedDate);
    onSelectTemplate(generated, hasExistingContent ? insertMode : 'replace');
    onClose();
  };

  const handleOpenCreateForm = () => {
    setEditingTemplateId(null);
    setFormTitle('');
    setFormCategory('custom');
    setFormDesc('');
    setFormContent(`# New Template: {date}\n\n## Goals\n- \n\n## Action Items\n- [ ] \n`);
    setFormError(null);
    setIsEditorOpen(true);
  };

  const handleOpenEditForm = (tmpl: JournalTemplate) => {
    setEditingTemplateId(tmpl.id);
    setFormTitle(tmpl.title);
    setFormCategory(tmpl.category);
    setFormDesc(tmpl.description);
    setFormContent(typeof tmpl.content === 'string' ? tmpl.content : tmpl.content('{date}'));
    setFormError(null);
    setIsEditorOpen(true);
  };

  const handleCloneTemplate = (tmpl: JournalTemplate) => {
    setEditingTemplateId(null);
    setFormTitle(`${tmpl.title} (Custom)`);
    setFormCategory(tmpl.category);
    setFormDesc(tmpl.description);
    setFormContent(typeof tmpl.content === 'string' ? tmpl.content : tmpl.content('{date}'));
    setFormError(null);
    setIsEditorOpen(true);
  };

  const handleDeleteCustomTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this custom template?')) return;
    const next = customTemplates.filter((t) => t.id !== id);
    setCustomTemplates(next);
    saveStoredTemplates(next);
    if (selectedId === id) {
      setSelectedId('daily-points');
    }
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Please provide a template title');
      return;
    }
    if (!formContent.trim()) {
      setFormError('Please provide template markdown content');
      return;
    }

    if (editingTemplateId) {
      // Update existing custom template
      const updated = customTemplates.map((t) => {
        if (t.id === editingTemplateId) {
          return {
            ...t,
            title: formTitle.trim(),
            category: formCategory,
            description: formDesc.trim() || 'Custom user template',
            content: formContent,
          };
        }
        return t;
      });
      setCustomTemplates(updated);
      saveStoredTemplates(updated);
      setSelectedId(editingTemplateId);
    } else {
      // Create new custom template
      const newId = `custom-${Date.now()}`;
      const newTmpl: JournalTemplate = {
        id: newId,
        title: formTitle.trim(),
        category: formCategory,
        description: formDesc.trim() || 'Custom user template',
        content: formContent,
        isCustom: true,
        createdAt: new Date().toISOString(),
        icon: FileText,
      };
      const updated = [newTmpl, ...customTemplates];
      setCustomTemplates(updated);
      saveStoredTemplates(updated);
      setSelectedId(newId);
    }

    setIsEditorOpen(false);
    setEditingTemplateId(null);
    setFormError(null);
  };

  const insertHelperTag = (tag: string) => {
    setFormContent((prev) => `${prev}${tag}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Journal Templates" maxWidth="max-w-4xl">
      <div className="space-y-4">
        {/* Top Control Bar: Search, Category Pills & Create Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rule/70">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={cn(
                'px-2.5 py-1 text-xs font-mono rounded transition-colors',
                activeCategory === 'all'
                  ? 'bg-ledger-blue text-paper font-semibold shadow-xs'
                  : 'bg-paper text-ink-soft hover:text-ink border border-rule'
              )}
            >
              All ({allTemplates.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('custom')}
              className={cn(
                'px-2.5 py-1 text-xs font-mono rounded transition-colors flex items-center gap-1',
                activeCategory === 'custom'
                  ? 'bg-ledger-blue text-paper font-semibold shadow-xs'
                  : 'bg-paper text-ink-soft hover:text-ink border border-rule'
              )}
            >
              <Sparkles className="w-3 h-3 text-gold" />
              My Custom ({customTemplates.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('daily')}
              className={cn(
                'px-2.5 py-1 text-xs font-mono rounded transition-colors',
                activeCategory === 'daily'
                  ? 'bg-ledger-blue text-paper font-semibold shadow-xs'
                  : 'bg-paper text-ink-soft hover:text-ink border border-rule'
              )}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('progress')}
              className={cn(
                'px-2.5 py-1 text-xs font-mono rounded transition-colors',
                activeCategory === 'progress'
                  ? 'bg-ledger-blue text-paper font-semibold shadow-xs'
                  : 'bg-paper text-ink-soft hover:text-ink border border-rule'
              )}
            >
              Progress
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('meeting')}
              className={cn(
                'px-2.5 py-1 text-xs font-mono rounded transition-colors',
                activeCategory === 'meeting'
                  ? 'bg-ledger-blue text-paper font-semibold shadow-xs'
                  : 'bg-paper text-ink-soft hover:text-ink border border-rule'
              )}
            >
              Meeting
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('email')}
              className={cn(
                'px-2.5 py-1 text-xs font-mono rounded transition-colors',
                activeCategory === 'email'
                  ? 'bg-ledger-blue text-paper font-semibold shadow-xs'
                  : 'bg-paper text-ink-soft hover:text-ink border border-rule'
              )}
            >
              Email
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft/60" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 bg-paper border border-rule rounded text-xs font-mono text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-1 focus:ring-ledger-blue"
              />
            </div>

            <button
              type="button"
              onClick={handleOpenCreateForm}
              className="flex items-center gap-1.5 px-3 py-1 bg-ledger-blue text-paper rounded text-xs font-semibold hover:bg-ledger-hover transition-colors shadow-subtle shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Template</span>
            </button>
          </div>
        </div>

        {/* Main Body: Template List + (Preview OR Editor) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Left Column: Template Cards List (5 cols) */}
          <div className="md:col-span-5 space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {filteredTemplates.map((tmpl) => {
              const Icon = tmpl.icon || FileText;
              const isSelected = tmpl.id === selectedId && !isEditorOpen;

              return (
                <div
                  key={tmpl.id}
                  onClick={() => {
                    setSelectedId(tmpl.id);
                    setIsEditorOpen(false);
                  }}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-all cursor-pointer flex items-start justify-between gap-2.5 group',
                    isSelected
                      ? 'bg-paper border-ledger-blue shadow-subtle ring-1 ring-ledger-blue'
                      : 'bg-card border-rule/70 hover:border-ink-soft/60'
                  )}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div
                      className={cn(
                        'p-1.5 rounded-md shrink-0 mt-0.5',
                        isSelected ? 'bg-ledger-blue text-paper' : 'bg-paper text-ink-soft'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-ink leading-snug truncate">
                          {tmpl.title}
                        </span>
                        {tmpl.isCustom && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                            Custom
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-ink-soft line-clamp-1 mt-0.5">
                        {tmpl.description}
                      </div>
                    </div>
                  </div>

                  {/* Card quick actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                    {tmpl.isCustom ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditForm(tmpl);
                          }}
                          className="p-1 rounded hover:bg-paper text-ink-soft hover:text-ledger-blue transition-colors"
                          title="Edit this custom template"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCustomTemplate(tmpl.id, e)}
                          className="p-1 rounded hover:bg-paper text-ink-soft hover:text-stamp-red transition-colors"
                          title="Delete custom template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloneTemplate(tmpl);
                        }}
                        className="p-1 rounded hover:bg-paper text-ink-soft hover:text-ledger-blue transition-colors"
                        title="Duplicate and customize this template"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredTemplates.length === 0 && (
              <div className="p-8 text-center bg-card rounded-lg border border-rule/60 text-xs font-mono text-ink-soft">
                <FileText className="w-6 h-6 mx-auto mb-2 opacity-40" />
                No templates found matching your search.
              </div>
            )}
          </div>

          {/* Right Column: Template Preview OR Template Editor (7 cols) */}
          <div className="md:col-span-7 bg-paper/60 border border-rule rounded-lg p-4 flex flex-col justify-between min-h-[460px]">
            {isEditorOpen ? (
              /* TEMPLATE EDITOR FORM */
              <form onSubmit={handleSaveTemplate} className="space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-rule/70">
                    <span className="text-xs font-mono font-bold text-ink flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-ledger-blue" />
                      {editingTemplateId ? 'Edit Custom Template' : 'Create Custom Template'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditorOpen(false)}
                      className="text-xs font-mono text-ink-soft hover:text-ink"
                    >
                      Back to Preview
                    </button>
                  </div>

                  {formError && (
                    <div className="p-2 rounded bg-stamp-light text-stamp-red text-xs font-mono flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {formError}
                    </div>
                  )}

                  {/* Title & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-ink-soft uppercase tracking-wider mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="e.g. Weekly Retrospective"
                        className="w-full px-2.5 py-1.5 bg-paper border border-rule rounded text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-ledger-blue"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-ink-soft uppercase tracking-wider mb-1">
                        Category
                      </label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-paper border border-rule rounded text-xs font-mono text-ink focus:outline-none focus:ring-1 focus:ring-ledger-blue"
                      >
                        <option value="custom">Custom</option>
                        <option value="daily">Daily Reflection</option>
                        <option value="progress">Progress / Sprint</option>
                        <option value="meeting">Meeting / Sync</option>
                        <option value="email">Email Update</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[11px] font-mono text-ink-soft uppercase tracking-wider mb-1">
                      Short Description
                    </label>
                    <input
                      type="text"
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      placeholder="Brief summary of this template..."
                      className="w-full px-2.5 py-1.5 bg-paper border border-rule rounded text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ledger-blue"
                    />
                  </div>

                  {/* Markdown Helper Chips */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-mono text-ink-soft uppercase tracking-wider">
                        Template Markdown Body *
                      </label>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-ink-soft">
                        <button
                          type="button"
                          onClick={() => setEditorPreview(!editorPreview)}
                          className="hover:text-ledger-blue flex items-center gap-1"
                        >
                          {editorPreview ? <Code className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {editorPreview ? 'Edit Code' : 'Preview Result'}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <span className="text-[10px] font-mono text-ink-soft">Insert:</span>
                      <button
                        type="button"
                        onClick={() => insertHelperTag('{date}')}
                        className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-card border border-rule hover:border-ledger-blue text-ledger-blue"
                        title="Inserts active date placeholder"
                      >
                        {'{date}'}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHelperTag('\n# Heading\n')}
                        className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-card border border-rule hover:border-ink text-ink-soft"
                      >
                        # Heading
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHelperTag('\n## Section\n')}
                        className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-card border border-rule hover:border-ink text-ink-soft"
                      >
                        ## Section
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHelperTag('\n- [ ] Task item\n')}
                        className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-card border border-rule hover:border-ink text-ink-soft"
                      >
                        - [ ] Task
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHelperTag('\n> Quote note\n')}
                        className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-card border border-rule hover:border-ink text-ink-soft"
                      >
                        &gt; Quote
                      </button>
                    </div>

                    {editorPreview ? (
                      <pre className="text-[11px] font-mono text-ink/80 h-44 overflow-y-auto whitespace-pre-wrap leading-relaxed p-2.5 bg-card rounded border border-rule/60">
                        {formContent.replace(/\{date\}/g, selectedDate)}
                      </pre>
                    ) : (
                      <textarea
                        value={formContent}
                        onChange={(e) => setFormContent(e.target.value)}
                        rows={7}
                        placeholder="Write your template in Markdown... Use {date} to interpolate the entry date automatically."
                        className="w-full px-2.5 py-2 bg-card border border-rule rounded text-xs font-mono text-ink leading-relaxed focus:outline-none focus:ring-1 focus:ring-ledger-blue resize-none h-44"
                      />
                    )}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-rule/60">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-3 py-1.5 bg-card border border-rule text-ink-soft hover:text-ink text-xs font-mono rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-ledger-blue text-paper text-xs font-semibold rounded hover:bg-ledger-hover shadow-subtle transition-all"
                  >
                    {editingTemplateId ? 'Save Changes' : 'Create Template'}
                  </button>
                </div>
              </form>
            ) : (
              /* TEMPLATE PREVIEW & APPLY VIEW */
              <div className="space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-rule/70">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-sm text-ink">
                          {selectedTemplate.title}
                        </span>
                        {selectedTemplate.isCustom && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-soft font-mono mt-0.5">
                        {selectedTemplate.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {selectedTemplate.isCustom ? (
                        <button
                          type="button"
                          onClick={() => handleOpenEditForm(selectedTemplate)}
                          className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded bg-card border border-rule hover:border-ledger-blue text-ledger-blue transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCloneTemplate(selectedTemplate)}
                          className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded bg-card border border-rule hover:border-ledger-blue text-ledger-blue transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Customize</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rendered Preview Box */}
                  <pre className="text-[11px] font-mono text-ink/85 h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed p-3 bg-card rounded border border-rule/60 select-all">
                    {resolveTemplateMarkdown(selectedTemplate, selectedDate)}
                  </pre>
                </div>

                {/* Existing Content Choice */}
                {hasExistingContent && (
                  <div className="pt-2 border-t border-rule/60 mt-1">
                    <span className="text-[11px] font-mono text-ink-soft block mb-1">
                      Today has existing notes. Select insertion behavior:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setInsertMode('append')}
                        className={cn(
                          'flex-1 py-1 px-2 text-xs font-mono rounded border text-center transition-all',
                          insertMode === 'append'
                            ? 'bg-card border-ledger-blue text-ledger-blue font-bold shadow-xs'
                            : 'bg-paper text-ink-soft border-rule hover:text-ink'
                        )}
                      >
                        Append to Bottom
                      </button>
                      <button
                        type="button"
                        onClick={() => setInsertMode('replace')}
                        className={cn(
                          'flex-1 py-1 px-2 text-xs font-mono rounded border text-center transition-all',
                          insertMode === 'replace'
                            ? 'bg-card border-stamp-red/70 text-stamp-red font-bold shadow-xs'
                            : 'bg-paper text-ink-soft border-rule hover:text-ink'
                        )}
                      >
                        Replace Entire Entry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        {!isEditorOpen && (
          <div className="flex items-center justify-between pt-3 border-t border-rule/70">
            <span className="text-[11px] font-mono text-ink-soft">
              Active Date: <strong className="text-ink">{selectedDate}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 bg-card border border-rule text-ink-soft hover:text-ink text-xs font-mono rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-ledger-blue text-paper text-xs font-semibold rounded hover:bg-ledger-hover shadow-subtle transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                <span>Apply Template</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
