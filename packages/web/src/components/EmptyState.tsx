import React from 'react';

interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryText?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  actionLabel,
  onAction,
  secondaryText,
  icon: Icon,
}) => {
  return (
    <div className="ledger-card p-8 sm:p-12 text-center flex flex-col items-center justify-center my-4">
      {Icon && (
        <div className="w-10 h-10 rounded-full bg-paper flex items-center justify-center text-ink-soft mb-3 border border-rule">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <p className="text-base text-ink font-medium">{message}</p>
      {secondaryText && <p className="text-xs text-ink-soft mt-1 max-w-sm">{secondaryText}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-ledger-blue text-paper text-xs font-medium rounded hover:bg-ledger-hover transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
