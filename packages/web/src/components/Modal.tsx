import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/35 backdrop-blur-[3px] transition-opacity animate-[fadeIn_150ms_ease-out]"
        onClick={onClose}
      />

      {/* Modal Dialog with nested bezel architecture */}
      <div
        className={`relative z-10 w-full ${maxWidth} bg-paper border border-rule/80 rounded-[8px] p-1 shadow-xl animate-[modalScaleIn_200ms_cubic-bezier(0.22,1,0.36,1)] overflow-hidden`}
      >
        <div className="bg-card border border-rule/60 rounded-[6px] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-rule/70 bg-paper/60">
            <h3 className="font-serif text-lg font-semibold text-ink tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-[4px] text-ink-soft hover:text-ink hover:bg-paper active:scale-95 transition-all"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 max-h-[80vh] overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
};
