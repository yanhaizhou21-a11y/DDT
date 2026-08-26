import React from 'react';

export interface EmptyStateProps {
  title?: string;
  message?: string;
  description?: string;
  secondaryText?: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  description,
  secondaryText,
  actionLabel,
  onAction,
  action,
  icon: Icon,
}) => {
  const heading = title || message || 'No records found';
  const subtext = description || secondaryText;

  return (
    <div className="ledger-card p-8 sm:p-12 text-center flex flex-col items-center justify-center my-4">
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-paper flex items-center justify-center text-ink-soft mb-3.5 border border-rule/70 shadow-xs">
          <Icon className="w-6 h-6 stroke-[1.5]" />
        </div>
      )}
      <p className="font-serif text-base text-ink font-bold">{heading}</p>
      {subtext && <p className="text-xs text-ink-soft mt-1.5 max-w-sm font-sans leading-relaxed">{subtext}</p>}
      {action ? (
        <div className="mt-4">{action}</div>
      ) : actionLabel && onAction ? (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-ledger-blue text-paper text-xs font-semibold rounded-lg hover:bg-ledger-hover transition-colors shadow-subtle"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
};

