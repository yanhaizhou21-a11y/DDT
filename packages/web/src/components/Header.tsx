import React, { useEffect, useState } from 'react';
import { DotLedger } from './DotLedger';
import { getDataMode, type DataMode } from '../api';
import { Smartphone, Server } from 'lucide-react';

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
  const [dataMode, setDataModeState] = useState<DataMode>(() => getDataMode());

  useEffect(() => {
    const handleModeChange = () => {
      setDataModeState(getDataMode());
    };
    window.addEventListener('ddt_data_mode_changed', handleModeChange);
    return () => {
      window.removeEventListener('ddt_data_mode_changed', handleModeChange);
    };
  }, []);

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-rule gap-4">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-serif text-2xl sm:text-3xl text-ink font-semibold tracking-tight">
            {title}
          </h1>

          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${
              dataMode === 'offline'
                ? 'bg-amber-500/10 text-amber-600 border-amber-500/25'
                : 'bg-ledger-blue/10 text-ledger-blue border-ledger-blue/25'
            }`}
            title={dataMode === 'offline' ? 'Mode Offline: Data tersimpan di HP (IndexedDB)' : 'Mode Remote: Terhubung ke backend laptop'}
          >
            {dataMode === 'offline' ? (
              <>
                <Smartphone className="w-2.5 h-2.5" />
                <span>Offline HP</span>
              </>
            ) : (
              <>
                <Server className="w-2.5 h-2.5" />
                <span>Remote PC</span>
              </>
            )}
          </span>

          {dotLedgerData && dotLedgerData.length > 0 && (
            <>
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-rule">
                <span className="text-[11px] font-mono uppercase text-ink-soft">30d</span>
                <DotLedger data={dotLedgerData} unit={dotLedgerUnit} />
              </div>
              <div className="flex sm:hidden items-center gap-1.5 pt-1">
                <span className="text-[10px] font-mono uppercase text-ink-soft">14d</span>
                <DotLedger data={dotLedgerData.slice(-14)} unit={dotLedgerUnit} />
              </div>
            </>
          )}
        </div>
        {subtitle && <p className="text-sm text-ink-soft mt-1">{subtitle}</p>}
      </div>

      {children && <div className="flex items-center gap-2.5">{children}</div>}
    </header>
  );
};
