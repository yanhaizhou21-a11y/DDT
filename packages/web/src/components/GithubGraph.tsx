import * as React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export type GithubGraphVariant = 'github' | 'graphite' | 'ocean' | 'violet';
export type GithubGraphAnimation = 'none' | 'wave' | 'scan' | 'cascade';
export type GithubGraphAmbientEffect = 'none' | 'tide' | 'drift' | 'twinkle';

export type GithubContribution = {
  date: string;
  count: number;
  level?: number;
};

export type GithubContributionCell = GithubContribution & {
  level: number;
};

export type GithubContributionWeek = GithubContributionCell[];

export interface GithubGraphProps {
  account?: string;
  projectId?: string;
  months?: number;
  variant?: GithubGraphVariant;
  animation?: GithubGraphAnimation;
  cellSize?: number;
  cellGap?: number;
  cellRadius?: number;
  showLegend?: boolean;
  showAccount?: boolean;
  ambientEffect?: GithubGraphAmbientEffect;
  data?: GithubContribution[];
  unit?: string;
  unitPlural?: string;
  metricLabel?: string;
  className?: string;
}

const VARIANTS: Record<GithubGraphVariant, [string, string, string, string, string]> = {
  github: ['rgba(221,215,199,0.25)', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
  graphite: ['rgba(221,215,199,0.25)', '#cccccc', '#969696', '#5f5f5f', '#171717'],
  ocean: ['rgba(221,215,199,0.25)', '#b4e2ff', '#62bdf5', '#2585d8', '#124e93'],
  violet: ['rgba(221,215,199,0.25)', '#dcc5ff', '#b486ff', '#8355df', '#52269c'],
};

function dateFromISO(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function GithubGraph({
  account = '',
  projectId,
  months = 6,
  variant = 'github',
  animation = 'wave',
  cellSize = 12,
  cellGap = 3,
  cellRadius = 2,
  showLegend = true,
  showAccount = true,
  ambientEffect = 'twinkle',
  data,
  unit = 'commit',
  unitPlural = 'commits',
  metricLabel = 'in the last year',
  className,
}: GithubGraphProps) {
  const [hoveredCell, setHoveredCell] = React.useState<GithubContributionCell | null>(null);
  const [tooltipPos, setTooltipPos] = React.useState<{ x: number; y: number } | null>(null);
  const [fetchedData, setFetchedData] = React.useState<GithubContribution[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [totalCommits, setTotalCommits] = React.useState(0);

  React.useEffect(() => {
    if (data && data.length > 0) {
      setFetchedData(data);
      const total = data.reduce((acc, curr) => acc + curr.count, 0);
      setTotalCommits(total);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const endpoint = projectId ? `/api/projects/${projectId}` : '/api/github/contributions';

    fetch(endpoint)
      .then((res) => (res.ok ? res.json() : null))
      .then((resData) => {
        if (!isMounted) return;
        if (!resData) return;

        if (projectId && resData.activity) {
          setFetchedData(resData.activity);
          setTotalCommits(resData.totalActivity || 0);
        } else if (resData.weeks) {
          const list: GithubContribution[] = [];
          for (const w of resData.weeks) {
            for (const d of w.contributionDays || []) {
              const count = d.contributionCount || 0;
              const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 9 ? 3 : 4;
              list.push({ date: d.date, count, level });
            }
          }
          setFetchedData(list);
          setTotalCommits(resData.totalContributions || 0);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [data, projectId]);

  const palette = VARIANTS[variant] || VARIANTS.github;

  // Build grid data for recent `months`
  const weeks: GithubContributionWeek[] = React.useMemo(() => {
    const rawMap: Record<string, GithubContribution> = {};
    if (fetchedData) {
      fetchedData.forEach((c) => {
        rawMap[c.date] = c;
      });
    }

    const today = new Date();
    const daysToShow = Math.max(14, months * 30);
    const startDate = addDays(today, -daysToShow);
    // Align startDate to Sunday
    const startSunday = addDays(startDate, -startDate.getUTCDay());

    const resultWeeks: GithubContributionWeek[] = [];
    let currentDay = new Date(startSunday);

    while (currentDay <= today || currentDay.getUTCDay() !== 0) {
      const week: GithubContributionCell[] = [];
      for (let i = 0; i < 7; i++) {
        const dStr = isoDate(currentDay);
        const match = rawMap[dStr];
        const count = match?.count || 0;
        const level = match?.level !== undefined ? match.level : count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 9 ? 3 : 4;
        week.push({ date: dStr, count, level });
        currentDay = addDays(currentDay, 1);
      }
      resultWeeks.push(week);
      if (currentDay > today && currentDay.getUTCDay() === 0) break;
    }

    return resultWeeks;
  }, [fetchedData, months]);

  return (
    <div className={cn('relative flex flex-col gap-3 font-sans', className)}>
      {(showAccount || totalCommits > 0) && (
        <div className="flex items-center justify-between text-xs text-ink-soft">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-ink">
              {totalCommits.toLocaleString()} {totalCommits === 1 ? unit : unitPlural}
            </span>
            <span className="text-ink-soft opacity-75">{metricLabel}</span>
          </div>
          {account && <span className="font-mono text-[11px] opacity-75">@{account}</span>}
        </div>
      )}

      {/* Grid container */}
      <div className="overflow-x-auto pb-1 scrollbar-none">
        <div
          className="inline-flex gap-[3px] p-2 rounded-lg bg-card/60 border border-rule/50 backdrop-blur-xs"
          style={{ gap: `${cellGap}px` }}
        >
          {weeks.map((week, wIndex) => (
            <div key={`w-${wIndex}`} className="flex flex-col gap-[3px]" style={{ gap: `${cellGap}px` }}>
              {week.map((cell, cIndex) => {
                const cellColor = palette[cell.level] || palette[0];
                const animDelay = animation === 'wave' ? (wIndex * 0.015 + cIndex * 0.01) : 0;

                return (
                  <motion.div
                    key={cell.date}
                    initial={animation !== 'none' ? { opacity: 0, scale: 0.6 } : undefined}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: animDelay, duration: 0.2 }}
                    whileHover={{ scale: 1.35, zIndex: 20 }}
                    onMouseEnter={(e) => {
                      setHoveredCell(cell);
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
                    }}
                    onMouseLeave={() => {
                      setHoveredCell(null);
                      setTooltipPos(null);
                    }}
                    style={{
                      width: `${cellSize}px`,
                      height: `${cellSize}px`,
                      borderRadius: `${cellRadius}px`,
                      backgroundColor: cellColor,
                    }}
                    className={cn(
                      'cursor-pointer transition-colors duration-150',
                      ambientEffect === 'twinkle' && cell.level > 1 && 'hover:brightness-125'
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Floating Tooltip */}
      {hoveredCell && tooltipPos && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full px-2.5 py-1 text-[11px] font-medium rounded-md bg-ink text-paper shadow-lg border border-rule"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <span className="font-semibold text-emerald-400">
            {hoveredCell.count} {hoveredCell.count === 1 ? unit : unitPlural}
          </span>{' '}
          on {hoveredCell.date}
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center justify-end gap-1.5 text-[10px] text-ink-soft font-mono pt-1">
          <span>Less</span>
          {palette.map((color, idx) => (
            <span
              key={`legend-${idx}`}
              className="inline-block w-2.5 h-2.5 rounded-xs"
              style={{ backgroundColor: color }}
            />
          ))}
          <span>More</span>
        </div>
      )}
    </div>
  );
}
