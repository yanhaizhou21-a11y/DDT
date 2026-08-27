import * as React from 'react';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X, AlertCircle, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

// ─── Compound AlertDialog Context ──────────────────────────────────────────

interface AlertDialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null);

function useAlertDialogContext() {
  const ctx = useContext(AlertDialogContext);
  if (!ctx) {
    throw new Error('AlertDialog components must be rendered inside <AlertDialog>');
  }
  return ctx;
}

// ─── Root AlertDialog ──────────────────────────────────────────────────────

export interface AlertDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AlertDialog({
  children,
  open: controlledOpen,
  onOpenChange,
}: AlertDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange]
  );

  return (
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

// ─── AlertDialogTrigger ───────────────────────────────────────────────────

export interface AlertDialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function AlertDialogTrigger({
  children,
  className,
  onClick,
  ...props
}: AlertDialogTriggerProps) {
  const { setOpen } = useAlertDialogContext();

  return (
    <button
      type="button"
      onClick={(e) => {
        onClick?.(e);
        setOpen(true);
      }}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

// ─── AlertDialogContent ───────────────────────────────────────────────────

export interface AlertDialogContentProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'danger' | 'warning' | 'info';
  icon?: React.ReactNode;
}

export function AlertDialogContent({
  children,
  className,
  variant = 'danger',
  icon,
}: AlertDialogContentProps) {
  const { open, setOpen } = useAlertDialogContext();
  const contentRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement as HTMLElement | null;
      const timer = setTimeout(() => {
        if (contentRef.current) {
          const focusable = contentRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) {
            focusable[0].focus();
          } else {
            contentRef.current.focus();
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    } else if (prevFocusRef.current) {
      prevFocusRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }

      if (e.key === 'Tab' && contentRef.current) {
        const focusables = contentRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, setOpen]);

  const defaultIcon =
    variant === 'danger' ? (
      <Trash2 className="w-5 h-5 text-stamp-red" />
    ) : variant === 'warning' ? (
      <AlertTriangle className="w-5 h-5 text-gold" />
    ) : (
      <HelpCircle className="w-5 h-5 text-ledger-blue" />
    );

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            key="alert-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-ink/40 backdrop-blur-[4px]"
            aria-hidden="true"
          />

          {/* Dialog Card */}
          <motion.div
            ref={contentRef}
            key="alert-dialog"
            role="alertdialog"
            aria-modal="true"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className={cn(
              'relative z-10 w-full max-w-md bg-paper border border-rule/90 rounded-xl p-1.5 shadow-2xl overflow-hidden focus:outline-hidden',
              className
            )}
          >
            <div className="bg-card border border-rule/70 rounded-lg p-5 sm:p-6 space-y-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-xs',
                    variant === 'danger' && 'bg-stamp-light/60 border-stamp-red/30 text-stamp-red',
                    variant === 'warning' && 'bg-gold-light/60 border-gold/30 text-gold',
                    variant === 'info' && 'bg-ledger-light/60 border-ledger-blue/30 text-ledger-blue'
                  )}
                >
                  {icon || defaultIcon}
                </div>

                <div className="flex-1 min-w-0">{children}</div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────

export function AlertDialogHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('space-y-1.5', className)}>{children}</div>;
}

export function AlertDialogTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn('font-serif text-base sm:text-lg font-bold text-ink tracking-tight', className)}>
      {children}
    </h3>
  );
}

export function AlertDialogDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn('text-xs sm:text-sm text-ink-soft leading-relaxed font-sans', className)}>
      {children}
    </p>
  );
}

export function AlertDialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-end gap-2.5 pt-4 mt-4 border-t border-rule/60', className)}>
      {children}
    </div>
  );
}

export interface AlertDialogActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'danger' | 'primary';
}

export function AlertDialogAction({
  children,
  className,
  onClick,
  variant = 'danger',
  ...props
}: AlertDialogActionProps) {
  const { setOpen } = useAlertDialogContext();

  return (
    <button
      type="button"
      onClick={(e) => {
        onClick?.(e);
        setOpen(false);
      }}
      className={cn(
        'px-4 py-2 text-xs font-semibold rounded-lg transition-all shadow-subtle active:scale-95 flex items-center justify-center gap-1.5',
        variant === 'danger'
          ? 'bg-stamp-red text-paper hover:bg-stamp-red/90 focus-visible:ring-2 focus-visible:ring-stamp-red/40'
          : 'bg-ledger-blue text-paper hover:bg-ledger-hover focus-visible:ring-2 focus-visible:ring-ledger-blue/40',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function AlertDialogCancel({
  children = 'Cancel',
  className,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = useAlertDialogContext();

  return (
    <button
      type="button"
      onClick={(e) => {
        onClick?.(e);
        setOpen(false);
      }}
      className={cn(
        'px-3.5 py-2 text-xs font-medium text-ink-soft hover:text-ink hover:bg-paper rounded-lg transition-colors border border-rule',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ─── Simple Reusable ConfirmDialog Component ───────────────────────────────

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent variant={variant}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={loading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={variant === 'danger' ? 'danger' : 'primary'}
            disabled={loading}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {loading ? 'Processing...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
