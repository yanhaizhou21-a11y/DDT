import React, { useState } from 'react';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '../ui/chart';
import { BarChart3, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DailyVelocityData {
  dayName: string; // Mon, Tue, etc.
  date: string; // YYYY-MM-DD
  commits: number;
  gameHours: number;
  foodCount: number;
}

export interface DashboardVelocityBarChartProps {
  data: DailyVelocityData[];
  className?: string;
  title?: string;
  subtitle?: string;
  description?: string;
}

const barConfig: ChartConfig = {
  commits: {
    label: 'Commits',
    color: 'var(--ledger-blue)',
  },
  gameHours: {
    label: 'Game (hrs)',
    color: 'var(--gold)',
  },
  foodCount: {
    label: 'Meals',
    color: '#10B981',
  },
};

export const DashboardVelocityBarChart: React.FC<DashboardVelocityBarChartProps> = ({
  data,
  className,
  title = 'Weekly Velocity Comparison',
  subtitle,
  description,
}) => {
  const displaySubtitle = description || subtitle || 'Daily volume across coding, gaming & nutrition';
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxVal = React.useMemo(() => {
    let max = 4;
    data.forEach((d) => {
      max = Math.max(max, d.commits, d.gameHours, d.foodCount);
    });
    return Math.ceil(max * 1.2);
  }, [data]);

  const activeDay = hoveredIdx !== null && data[hoverIdxSafe(hoveredIdx, data.length)]
    ? data[hoverIdxSafe(hoveredIdx, data.length)]
    : null;

  function hoverIdxSafe(idx: number, len: number) {
    return Math.max(0, Math.min(idx, len - 1));
  }

  return (
    <div className={cn('ledger-card p-5 space-y-4 font-sans select-none flex flex-col justify-between', className)}>
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-rule/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-paper flex items-center justify-center text-ledger-blue border border-rule/60">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-ink">{title}</h3>
              <p className="text-[11px] text-ink-soft font-mono">{displaySubtitle}</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-paper border border-rule text-ink-soft">
            7 Days
          </span>
        </div>

        {/* Bar Chart Container */}
        <div className="relative pt-6 pb-2">
          <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-40 border-b border-rule/80 px-2">
            {data.map((day, idx) => {
              const isHovered = hoveredIdx === idx;
              const commitHeight = Math.max(4, Math.round((day.commits / maxVal) * 100));
              const gameHeight = Math.max(4, Math.round((day.gameHours / maxVal) * 100));
              const foodHeight = Math.max(4, Math.round((day.foodCount / maxVal) * 100));

              return (
                <div
                  key={day.date}
                  className="flex flex-col items-center h-full justify-end cursor-pointer group"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Bars Group */}
                  <div className="w-full flex items-end justify-center gap-1 h-32 relative">
                    {/* Commits Bar */}
                    <div
                      className={cn(
                        'w-2 sm:w-2.5 rounded-t-xs transition-all duration-150',
                        isHovered ? 'brightness-110 scale-y-105' : 'opacity-90'
                      )}
                      style={{
                        height: `${commitHeight}%`,
                        backgroundColor: 'var(--ledger-blue)',
                      }}
                      title={`${day.commits} commits`}
                    />

                    {/* Game Bar */}
                    <div
                      className={cn(
                        'w-2 sm:w-2.5 rounded-t-xs transition-all duration-150',
                        isHovered ? 'brightness-110 scale-y-105' : 'opacity-90'
                      )}
                      style={{
                        height: `${gameHeight}%`,
                        backgroundColor: 'var(--gold)',
                      }}
                      title={`${day.gameHours}h games`}
                    />

                    {/* Food Bar */}
                    <div
                      className={cn(
                        'w-2 sm:w-2.5 rounded-t-xs transition-all duration-150',
                        isHovered ? 'brightness-110 scale-y-105' : 'opacity-90'
                      )}
                      style={{
                        height: `${foodHeight}%`,
                        backgroundColor: '#10B981',
                      }}
                      title={`${day.foodCount} meals`}
                    />
                  </div>

                  {/* Day Label */}
                  <span
                    className={cn(
                      'text-[10px] font-mono mt-2 transition-colors',
                      isHovered ? 'font-bold text-ink' : 'text-ink-soft'
                    )}
                  >
                    {day.dayName}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Tooltip Overlay */}
          {activeDay && hoveredIdx !== null && (
            <div
              className="absolute top-0 z-20 pointer-events-none transition-all duration-75"
              style={{
                left: `${(hoveredIdx / 7) * 100 + 4}%`,
                transform: hoveredIdx > 4 ? 'translateX(-85%)' : 'translateX(0%)',
              }}
            >
              <div className="bg-card border border-rule rounded-lg p-2 shadow-lg text-[11px] font-sans min-w-[120px]">
                <div className="font-mono font-bold text-ink pb-1 border-b border-rule/60 mb-1">
                  {activeDay.dayName} ({activeDay.date})
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-ink-soft">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--ledger-blue)]" />
                      Commits:
                    </span>
                    <span className="font-mono font-semibold text-ink">{activeDay.commits}</span>
                  </div>
                  <div className="flex items-center justify-between text-ink-soft">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]" />
                      Gaming:
                    </span>
                    <span className="font-mono font-semibold text-ink">{activeDay.gameHours}h</span>
                  </div>
                  <div className="flex items-center justify-between text-ink-soft">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Meals:
                    </span>
                    <span className="font-mono font-semibold text-ink">{activeDay.foodCount}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend Footer */}
      <div className="pt-2 border-t border-rule/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4 text-[11px] font-mono text-ink-soft">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-xs bg-[var(--ledger-blue)]" />
            <span>Commits</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-xs bg-[var(--gold)]" />
            <span>Games (hrs)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-xs bg-emerald-500" />
            <span>Meals</span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-ink-soft hidden sm:inline">
          Avg: {((data.reduce((acc, d) => acc + d.commits + d.foodCount, 0)) / 7).toFixed(1)} acts/day
        </span>
      </div>
    </div>
  );
};
