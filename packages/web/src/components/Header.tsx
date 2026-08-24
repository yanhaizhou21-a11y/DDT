import React from 'react';
import { DotLedger } from './DotLedger';

interface HeaderProps {
  title: string;
  subtitle?: string;
  dotLedgerData?: { date: string; value: number }[];
  dotLedgerUnit?: string;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  dotLedgerData,
  dotLedgerUnit,
  children,
}) => {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-rule gap-4">
      <div>
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="font-serif text-2xl sm:text-3xl text-ink font-semibold tracking-tight">
            {title}
          </h1>
          {dotLedgerData && dotLedgerData.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-rule">
              <span className="text-[11px] font-mono uppercase text-ink-soft">30d</span>
              <DotLedger data={dotLedgerData} unit={dotLedgerUnit} />
            </div>
          )}
        </div>
        {subtitle && <p className="text-sm text-ink-soft mt-1">{subtitle}</p>}
      </div>

      {children && <div className="flex items-center gap-2.5">{children}</div>}
    </header>
  );
};
