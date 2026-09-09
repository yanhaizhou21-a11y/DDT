import React, { useState } from 'react';
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
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface JournalTemplate {
  id: string;
  title: string;
  category: 'email' | 'daily' | 'progress' | 'meeting';
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  content: (dateStr: string) => string;
}

export const JOURNAL_TEMPLATES: JournalTemplate[] = [
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
  const [selectedId, setSelectedId] = useState<string>('daily-points');
  const [insertMode, setInsertMode] = useState<'replace' | 'append'>('append');

  const selectedTemplate = JOURNAL_TEMPLATES.find((t) => t.id === selectedId) || JOURNAL_TEMPLATES[0];

  const handleApply = () => {
    const generated = selectedTemplate.content(selectedDate);
    onSelectTemplate(generated, hasExistingContent ? insertMode : 'replace');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Journal Templates" maxWidth="max-w-2xl">
      <div className="space-y-4">
        <p className="text-xs text-ink-soft">
          Select a structured template for daily journaling, client emails, or project progress updates.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Template Cards List (5 cols) */}
          <div className="md:col-span-5 space-y-2">
            {JOURNAL_TEMPLATES.map((tmpl) => {
              const Icon = tmpl.icon;
              const isSelected = tmpl.id === selectedId;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setSelectedId(tmpl.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-all flex items-start gap-2.5',
                    isSelected
                      ? 'bg-paper border-ledger-blue shadow-subtle ring-1 ring-ledger-blue'
                      : 'bg-card border-rule/70 hover:border-ink-soft/60'
                  )}
                >
                  <div
                    className={cn(
                      'p-1.5 rounded-md shrink-0 mt-0.5',
                      isSelected ? 'bg-ledger-blue text-paper' : 'bg-paper text-ink-soft'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-ink leading-snug">{tmpl.title}</div>
                    <div className="text-[10px] text-ink-soft line-clamp-1 mt-0.5">{tmpl.description}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Template Preview Pane (7 cols) */}
          <div className="md:col-span-7 flex flex-col justify-between p-3.5 bg-paper/60 border border-rule rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-rule/70 text-xs font-mono text-ink-soft">
                <span>Preview: {selectedTemplate.title}</span>
                <span className="text-[10px] uppercase font-bold text-ledger-blue">Markdown</span>
              </div>
              <pre className="text-[11px] font-mono text-ink/80 max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed p-2 bg-card rounded border border-rule/60 select-all">
                {selectedTemplate.content(selectedDate)}
              </pre>
            </div>

            {/* Existing Content Choice */}
            {hasExistingContent && (
              <div className="pt-3 border-t border-rule/60 mt-3">
                <span className="text-[11px] font-mono text-ink-soft block mb-1.5">
                  This day already has written content. Choose how to insert:
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
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-rule/70">
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
    </Modal>
  );
};
