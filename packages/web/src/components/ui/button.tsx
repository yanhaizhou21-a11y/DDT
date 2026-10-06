import * as React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
    | 'neo'
    | 'swiss'
    | 'terminal';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center whitespace-nowrap text-xs font-medium transition-all duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ledger-blue disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer';

    const variantStyles = {
      default:
        'bg-ledger-blue text-paper hover:bg-ledger-hover shadow-subtle active:scale-[0.98]',
      destructive:
        'bg-stamp-red text-white hover:opacity-90 shadow-subtle active:scale-[0.98]',
      outline:
        'border border-rule bg-card hover:bg-paper hover:border-ink-soft text-ink shadow-subtle active:scale-[0.98]',
      secondary:
        'bg-paper text-ink hover:bg-paper-tint border border-rule/60 active:scale-[0.98]',
      ghost:
        'text-ink hover:bg-paper/80 hover:text-ink active:scale-[0.98]',
      link:
        'text-ledger-blue underline-offset-4 hover:underline p-0 h-auto',
      neo:
        'bg-neo-accent text-black font-bold uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:bg-neo-secondary',
      swiss:
        'bg-black text-white font-bold uppercase tracking-widest border-2 border-black rounded-none hover:bg-swiss-accent hover:border-swiss-accent',
      terminal:
        'font-mono text-ink bg-card border border-rule hover:border-ink hover:text-ink hover:shadow-[0_0_8px_rgba(51,255,0,0.3)] uppercase tracking-wider',
    }[variant];

    const sizeStyles = {
      default: 'h-8 px-3 py-1.5 rounded-md',
      sm: 'h-7 px-2.5 text-[11px] rounded-md',
      lg: 'h-10 px-5 text-sm rounded-lg',
      icon: 'h-8 w-8 rounded-md p-0',
    }[size];

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles, sizeStyles, className)}
        {...props}
      >
        {variant === 'terminal' && typeof children === 'string' ? (
          <span>{`[ ${children} ]`}</span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
