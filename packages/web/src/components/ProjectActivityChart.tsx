import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { ProjectDomainType } from '../types';
import { cn } from '../lib/utils';
import { Calendar, TrendingUp, BarChart2, Sparkles } from 'lucide-react';

export interface ProjectActivityChartProps {
  domainType: ProjectDomainType;
  activity: { date: string; count: number; level: number }[];
  isRepoLinked: boolean;
  unit?: string;
  unitPlural?: string;
  className?: string;
}

export const ProjectActivityChart: React.FC<ProjectActivityChartProps> = ({
  domainType,
  activity,
  isRepoLinked,
  unit = 'item',
  unitPlural = 'items',
  className,
}) => {
  const [timeRange, setTimeRange] = useState<'30days' | '12months'>('30days');
  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  // Determine chart style:
  // Prompt specification: "for the game dev, and software development using the second [patterned background timeline chart] as the charts, while the rest like photograph, design graphic using the first [bar chart / BarSquares]."
  const chartStyle: 'bar_squares' | 'pattern_timeline' =
    domainType === 'software' || domainType === 'game_dev'
      ? 'pattern_timeline'
      : 'bar_squares';

  // Process data based on selected range
  const chartData = useMemo(() => {
    if (!activity || activity.length === 0) return [];

    if (timeRange === '30days') {
      // Last 30 days
      return activity.slice(-30);
    } else {
      // Aggregate into 12 monthly buckets
      const monthlyMap: Record<string, { label: string; count: number }> = {};

      activity.forEach((d) => {
        const monthKey = d.date.slice(0, 7); // YYYY-MM
        const dateObj = new Date(d.date + 'T00:00:00');
        const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'short' });

        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { label: monthLabel, count: 0 };
        }
        monthlyMap[monthKey].count += d.count;
      });

      return Object.entries(monthlyMap).map(([key, val]) => ({
        date: key,
        label: val.label,
        count: val.count,
        level: val.count > 0 ? Math.min(4, Math.ceil(val.count / 5)) : 0,
      }));
    }
  }, [activity, timeRange]);

  const maxCount = useMemo(() => {
    return Math.max(...chartData.map((d) => d.count), 4);
  }, [chartData]);

  // Overall metrics
  const totalVolume = useMemo(() => {
    return chartData.reduce((acc, d) => acc + d.count, 0);
  }, [chartData]);

  const activeDays = useMemo(() => {
    return chartData.filter((d) => d.count > 0).length;
  }, [chartData]);

  // Chart dimensions
  const height = 220;
  const padding = { top: 25, right: 20, bottom: 40, left: 35 };

  return (
    <div className={cn('space-y-4 font-sans select-none', className)}>
      {/* Sub-header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-ink-soft text-[11px] uppercase tracking-wider">
            {chartStyle === 'pattern_timeline'
              ? 'Patterned Timeline Chart'
              : 'Output Bar Graph'}
          </span>
          <span className="text-rule">•</span>
          <span className="font-medium text-ink">
            {totalVolume.toLocaleString()} {totalVolume === 1 ? unit : unitPlural} logged in range
          </span>
        </div>

        {/* 30 Days / 12 Months segmented button */}
        <div className="flex items-center p-0.5 rounded-lg bg-paper border border-rule/70">
          <button
            type="button"
            onClick={() => setTimeRange('30days')}
            className={cn(
              'px-2.5 py-1 text-[11px] font-mono rounded transition-all',
              timeRange === '30days'
                ? 'bg-card text-ink font-bold shadow-xs border border-rule/80'
                : 'text-ink-soft hover:text-ink'
            )}
          >
            30 Days
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('12months')}
            className={cn(
              'px-2.5 py-1 text-[11px] font-mono rounded transition-all',
              timeRange === '12months'
                ? 'bg-card text-ink font-bold shadow-xs border border-rule/80'
                : 'text-ink-soft hover:text-ink'
            )}
          >
            12 Months
          </button>
        </div>
      </div>

      {/* Main SVG Plot Area */}
      <div className="relative w-full rounded-lg bg-card/80 border border-rule/70 p-2 sm:p-4 overflow-hidden">
        <svg
          viewBox={`0 0 700 ${height}`}
          className="w-full h-auto overflow-visible"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            {/* Pattern 1: Diagonal hatch lines per background utility */}
            <pattern
              id="chart-diagonal-pattern"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="10"
                stroke="var(--rule)"
                strokeWidth="1"
                strokeOpacity="0.45"
              />
            </pattern>

            {/* Pattern 2: Subtle dot grid */}
            <pattern
              id="chart-dots-pattern"
              width="14"
              height="14"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1" fill="var(--ink-soft)" fillOpacity="0.25" />
            </pattern>

            {/* Area Gradient for Timeline */}
            <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ledger-blue)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--ledger-blue)" stopOpacity="0.0" />
            </linearGradient>

            {/* Bar Accent Gradient */}
            <linearGradient id="chart-bar-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ledger-blue)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="var(--ledger-blue)" stopOpacity="0.65" />
            </linearGradient>
          </defs>

          {/* Background Textured Fill (Diagonal pattern) */}
          {chartStyle === 'pattern_timeline' && (
            <rect
              x={padding.left}
              y={padding.top}
              width={700 - padding.left - padding.right}
              height={height - padding.top - padding.bottom}
              fill="url(#chart-diagonal-pattern)"
              rx="4"
              className="opacity-70"
            />
          )}

          {/* Reference Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = height - padding.bottom - ratio * (height - padding.top - padding.bottom);
            const val = Math.round(ratio * maxCount);
            return (
              <g key={`grid-${idx}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={700 - padding.right}
                  y2={y}
                  stroke="var(--rule)"
                  strokeDasharray={ratio === 0 ? undefined : '3 3'}
                  strokeOpacity={ratio === 0 ? 0.9 : 0.5}
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="font-mono text-[9px] fill-ink-soft opacity-70"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* ─── RENDERING OPTION 1: BAR SQUARES (Graphic Design & Video/Photo) ─── */}
          {chartStyle === 'bar_squares' && (
            <g>
              {chartData.map((d, i) => {
                const totalBars = chartData.length;
                const plotWidth = 700 - padding.left - padding.right;
                const slotWidth = plotWidth / totalBars;
                const barWidth = Math.max(4, Math.min(slotWidth * 0.65, 20));
                const x = padding.left + i * slotWidth + (slotWidth - barWidth) / 2;

                const availableHeight = height - padding.top - padding.bottom;
                const barHeight = d.count > 0 ? (d.count / maxCount) * availableHeight : 2;
                const y = height - padding.bottom - barHeight;

                // Discrete square stacked cells
                const squareCount = Math.min(d.count, 6);
                const squareGap = 2;
                const squareSize = Math.max(3, (barHeight - (squareCount - 1) * squareGap) / (squareCount || 1));

                return (
                  <g
                    key={`bar-${d.date}-${i}`}
                    className="cursor-pointer group"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredPoint({
                        date: d.date,
                        count: d.count,
                        x: x + barWidth / 2,
                        y,
                      });
                    }}
                  >
                    {/* Hover highlight column */}
                    <rect
                      x={padding.left + i * slotWidth}
                      y={padding.top}
                      width={slotWidth}
                      height={availableHeight}
                      fill="var(--ledger-blue)"
                      fillOpacity="0"
                      className="group-hover:fill-opacity-5 transition-all"
                    />

                    {/* Bar squares or continuous rounded bar */}
                    {d.count === 0 ? (
                      <rect
                        x={x}
                        y={height - padding.bottom - 2}
                        width={barWidth}
                        height={2}
                        fill="var(--rule)"
                        rx="1"
                      />
                    ) : (
                      <g>
                        {Array.from({ length: squareCount }).map((_, sqIdx) => {
                          const sqY = height - padding.bottom - (sqIdx + 1) * (squareSize + squareGap);
                          return (
                            <rect
                              key={`sq-${sqIdx}`}
                              x={x}
                              y={sqY}
                              width={barWidth}
                              height={squareSize}
                              rx="1.5"
                              fill="var(--ledger-blue)"
                              className="transition-all group-hover:brightness-125"
                              style={{
                                opacity: 0.6 + (sqIdx / squareCount) * 0.4,
                              }}
                            />
                          );
                        })}
                      </g>
                    )}

                    {/* X-axis date labels */}
                    {(timeRange === '12months' || i % Math.ceil(totalBars / 7) === 0) && (
                      <text
                        x={x + barWidth / 2}
                        y={height - padding.bottom + 16}
                        textAnchor="middle"
                        className="font-mono text-[9px] fill-ink-soft"
                      >
                        {'label' in d ? (d as any).label : d.date.slice(5)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* ─── RENDERING OPTION 2: PATTERN TIMELINE (Software & Game Dev) ─── */}
          {chartStyle === 'pattern_timeline' && (
            <g>
              {/* Build line / area path */}
              {(() => {
                const totalPoints = chartData.length;
                const plotWidth = 700 - padding.left - padding.right;
                const availableHeight = height - padding.top - padding.bottom;

                const points = chartData.map((d, i) => {
                  const x = padding.left + (i / Math.max(1, totalPoints - 1)) * plotWidth;
                  const y = height - padding.bottom - (d.count / maxCount) * availableHeight;
                  return { x, y, ...d };
                });

                // Area path
                const areaPath =
                  points.length > 0
                    ? `M ${points[0].x} ${height - padding.bottom} ` +
                      points.map((p) => `L ${p.x} ${p.y}`).join(' ') +
                      ` L ${points[points.length - 1].x} ${height - padding.bottom} Z`
                    : '';

                // Line path
                const linePath =
                  points.length > 0
                    ? `M ${points[0].x} ${points[0].y} ` +
                      points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')
                    : '';

                return (
                  <>
                    {/* Shaded gradient area */}
                    <path d={areaPath} fill="url(#chart-area-grad)" />

                    {/* Main stroke curve */}
                    <path
                      d={linePath}
                      fill="none"
                      stroke="var(--ledger-blue)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Data Points */}
                    {points.map((p, idx) => (
                      <g
                        key={`pt-${p.date}-${idx}`}
                        className="cursor-pointer"
                        onMouseEnter={() =>
                          setHoveredPoint({
                            date: p.date,
                            count: p.count,
                            x: p.x,
                            y: p.y,
                          })
                        }
                      >
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={p.count > 0 ? 3.5 : 2}
                          fill={p.count > 0 ? 'var(--ledger-blue)' : 'var(--rule)'}
                          stroke="var(--card)"
                          strokeWidth="1.5"
                          className="hover:scale-150 transition-transform"
                        />
                        {/* X-axis labels */}
                        {(timeRange === '12months' || idx % Math.ceil(totalPoints / 7) === 0) && (
                          <text
                            x={p.x}
                            y={height - padding.bottom + 16}
                            textAnchor="middle"
                            className="font-mono text-[9px] fill-ink-soft"
                          >
                            {'label' in p ? (p as any).label : p.date.slice(5)}
                          </text>
                        )}
                      </g>
                    ))}
                  </>
                );
              })()}
            </g>
          )}

          {/* Interactive Crosshair & Marker */}
          {hoveredPoint && (
            <g className="pointer-events-none">
              <line
                x1={hoveredPoint.x}
                y1={padding.top}
                x2={hoveredPoint.x}
                y2={height - padding.bottom}
                stroke="var(--ledger-blue)"
                strokeDasharray="2 2"
                strokeWidth="1"
                opacity="0.75"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="5"
                fill="var(--ledger-blue)"
                stroke="var(--card)"
                strokeWidth="2"
                className="animate-pulse"
              />
            </g>
          )}
        </svg>

        {/* Hover Tooltip Card */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none px-2.5 py-1.5 rounded bg-ink text-paper text-xs font-mono shadow-md border border-rule"
            style={{
              left: `${Math.min(85, Math.max(15, (hoveredPoint.x / 700) * 100))}%`,
              top: '10px',
            }}
          >
            <div className="font-semibold text-emerald-300">
              {hoveredPoint.count} {hoveredPoint.count === 1 ? unit : unitPlural}
            </div>
            <div className="text-[10px] text-paper/70">{hoveredPoint.date}</div>
          </div>
        )}
      </div>

      {/* Bottom Insights Strip */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <div className="p-2.5 rounded bg-paper/60 border border-rule/60 text-center">
          <span className="text-[10px] font-mono text-ink-soft block uppercase">Peak Output</span>
          <span className="font-mono text-base font-bold text-ink">{maxCount} {unitPlural}</span>
        </div>
        <div className="p-2.5 rounded bg-paper/60 border border-rule/60 text-center">
          <span className="text-[10px] font-mono text-ink-soft block uppercase">Active Days</span>
          <span className="font-mono text-base font-bold text-ledger-blue">{activeDays} days</span>
        </div>
        <div className="p-2.5 rounded bg-paper/60 border border-rule/60 text-center">
          <span className="text-[10px] font-mono text-ink-soft block uppercase">Avg / Active Day</span>
          <span className="font-mono text-base font-bold text-ink">
            {activeDays > 0 ? (totalVolume / activeDays).toFixed(1) : 0} {unitPlural}
          </span>
        </div>
      </div>
    </div>
  );
};
