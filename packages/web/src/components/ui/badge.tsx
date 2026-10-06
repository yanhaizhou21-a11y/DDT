import * as React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'neo'
    | 'swiss'
    | 'terminal';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantStyles = {
    default:
      'border-transparent bg-ledger-blue text-paper shadow-xs hover:bg-ledger-hover',
    secondary:
      'border-rule bg-paper text-ink hover:bg-paper-tint',
    destructive:
      'border-transparent bg-stamp-red text-white shadow-xs hover:opacity-90',
    outline:
      'text-ink border-rule',
    neo:
      'bg-neo-secondary text-black font-extrabold uppercase border-2 border-black shadow-[2px_2px_0px_0px_#000]',
    swiss:
      'bg-black text-white font-bold uppercase tracking-widest border border-black rounded-none',
    terminal:
      'font-mono bg-card text-ink border border-ink/40 tracking-wider',
  }[variant];

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ledger-blue select-none',
        variantStyles,
        className
      )}
      {...props}
    />
  );
}

export { Badge };
