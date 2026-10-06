import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-rule bg-card px-3 py-1.5 text-xs text-ink shadow-xs transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-ink-soft/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ledger-blue disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
