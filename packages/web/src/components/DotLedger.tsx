import React, { useState } from 'react';

interface DotLedgerProps {
  data: { date: string; value: number }[];
  label?: string;
  unit?: string;
  maxLevels?: number;
  className?: string;
}

export const DotLedger: React.FC<DotLedgerProps> = ({
  data,
  label = 'Activity',
  unit = 'entries',
  className = '',
}) => {
  const [hoveredDay, setHoveredDay] = useState<{ date: string; value: number; x: number; y: number } | null>(null);

  // Determine max value to normalize shade
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const getIntensityClass = (value: number) => {
    if (value <= 0) return 'bg-rule/40';
    const ratio = value / maxValue;
    if (ratio < 0.3) return 'bg-ledger-blue/30';
    if (ratio < 0.6) return 'bg-ledger-blue/60';
    if (ratio < 0.85) return 'bg-ledger-blue/85';
    return 'bg-ledger-blue';
  };

  return (
    <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-1">
        {data.map((day) => {
          return (
            <div
              key={day.date}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredDay({
                  date: day.date,
                  value: day.value,
                  x: rect.left + rect.width / 2,
                  y: rect.top - 8,
                });
              }}
              onMouseLeave={() => setHoveredDay(null)}
              className={`w-3 h-3 rounded-[2px] cursor-pointer transition-colors duration-150 ${getIntensityClass(
                day.value
              )} hover:ring-1 hover:ring-ink`}
            />
          );
        })}
      </div>

      {hoveredDay && (
        <div
          className="fixed z-50 transform -translate-x-1/2 -translate-y-full px-2.5 py-1 bg-card border border-rule text-ink text-xs font-mono rounded-[3px] pointer-events-none whitespace-nowrap"
          style={{ left: hoveredDay.x, top: hoveredDay.y }}
        >
          <span className="font-semibold">{hoveredDay.value}</span> {unit} on {hoveredDay.date}
        </div>
      )}
    </div>
  );
};
