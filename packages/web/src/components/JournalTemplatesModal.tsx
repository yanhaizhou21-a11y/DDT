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
    id: 'daily-journal',
    title: 'Daily Journal & Reflection',
    category: 'daily',
    icon: BookOpen,
    description: 'Structured morning intentions, daily wins, lessons learned, and gratitude.',
    content: (dateStr: string) => `# Daily Journal — ${dateStr}

### 🌅 Morning Intentions
- **Primary Focus:** [What is the single most important task today?]
- **Mindset:** [Calm, deliberate execution]

### ⚡ Daily Highlights & Output
- [Key feature shipped, asset exported, or task completed]
- [Positive moment or breakthrough]

### 💡 Reflections & Adjustments
- [What was difficult or took longer than planned?]
- [Adjustment for tomorrow]

### 🙏 Daily Gratitude
- [Something appreciated today]
`,
  },
  {
    id: 'email-draft',
    title: 'Email / Client Update',
    category: 'email',
    icon: Mail,
    description: 'Clean professional email update with context, deliverables, and action items.',
    content: () => `# Email Draft

**To:** [client-or-team@example.com]  
**Subject:** Project Update: [Deliverable Name / Sprint Milestone]  

Hi [Name],

I hope you are having a productive week.

### 📌 Summary
Here is a quick status update on where things stand with **[Project Name]**.

### 🔍 Completed Deliverables
- **[Item 1]:** [Brief description of what was completed or shipped]
- **[Item 2]:** [Asset or milestone ready for review]

### 🎯 Next Steps & Feedback
- [ ] [Action required from recipient, if any]
- [ ] [Upcoming milestone target date]

Please let me know if you have any feedback or questions.

Best regards,  
[Your Name]
`,
  },
  {
    id: 'progress-update',
    title: 'Project Progress Update',
    category: 'progress',
    icon: TrendingUp,
    description: 'Sprint progress tracking: milestone status, shipped items, blockers, and tomorrow’s goals.',
    content: () => `# Project Progress Update

### 🎯 Milestone & Sprint Status
- **Current Milestone:** [Sprint Goal / Deliverable]
- **Progress:** On Track 🟢

### ✅ Shipped Today
- [Specific feature, design revision, cut, or level built]
- [Bug resolved or asset exported]

### 🚧 Blockers & Impediments
- None currently / [Details on any blocker requiring resolution]

### 🔜 Priorities for Tomorrow
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
    content: (dateStr: string) => `# Meeting Notes — ${dateStr}

**Topic:** [Sync / Client Review / Planning]  
**Attendees:** [Names]  

### 📝 Key Discussion Points
1. [Key point discussed]
2. [Point or feedback raised]

### 💡 Decisions Made
- [Decision 1 agreed upon]
- [Decision 2 agreed upon]

### ⚡ Action Items
- [ ] [Action item 1] — **Owner:** [Name] — **Due:** [Date]
- [ ] [Action item 2] — **Owner:** [Name] — **Due:** [Date]
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
  const [selectedId, setSelectedId] = useState<string>('daily-journal');
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
