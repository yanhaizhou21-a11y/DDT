import React, { useState, useMemo } from 'react';
import { ChartContainer, ChartTooltipContent, ChartLegendContent, type ChartConfig } from '../ui/chart';
import { GitCommit, Gamepad2, Utensils, BookOpen, Calendar, Filter } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DailyActivityPoint {
  date: string;
  label: string;
  commits: number;
  gameHours: number;
  foodCount: number;
  journalWritten: number;
}

export interface DashboardActivityAreaChartProps {
  data: DailyActivityPoint[];
  className?: string;
  title?: string;
  subtitle?: string;
}

const chartConfig: ChartConfig = {
  commits: {
    label: 'GitHub Commits',
    color: 'var(--ledger-blue)',
    icon: GitCommit,
  },
  gameHours: {
    label: 'Gaming Hours',
    color: 'var(--gold)',
    icon: Gamepad2,
  },
  foodCount: {
    label: 'Meals Logged',
    color: '#10B981', // emerald
    icon: Utensils,
  },
  journalWritten: {
    label: 'Journal Written',
    color: 'var(--stamp-red)',
    icon: BookOpen,
  },
};

export const DashboardActivityAreaChart: React.FC<DashboardActivityAreaChartProps> = ({
  data,
  className,
  title = 'Activity & Productivity Streams',
  subtitle = 'Multi-dimensional output timeline across dev, gaming, meals & journaling',
}) => {
  const [range, setRange] = useState<'7d' | '14d' | '30d'>('14d');
  const [activeStreams, setActiveStreams] = useState<Record<string, boolean>>({
    commits: true,
    gameHours: true,
    foodCount: true,
    journalWritten: true,
  });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Filter data according to range
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const count = range === '7d' ? 7 : range === '14d' ? 14 : 30;
    return data.slice(-count);
  }, [data, range]);

  const toggleStream = (streamKey: string) => {
    setActiveStreams((prev) => ({
      ...prev,
      [streamKey]: !prev[streamKey],
    }));
  };

  // Dimensions
  const height = 240;
  const padding = { top: 20, right: 24, bottom: 35, left: 32 };
  const svgWidth = 640; // coordinate space
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Max calculation
  const maxVal = useMemo(() => {
    let max = 4;
    filteredData.forEach((d) => {
      if (activeStreams.commits) max = Math.max(max, d.commits);
      if (activeStreams.gameHours) max = Math.max(max, d.gameHours);
      if (activeStreams.foodCount) max = Math.max(max, d.foodCount);
      if (activeStreams.journalWritten) max = Math.max(max, d.journalWritten);
    });
    return Math.ceil(max * 1.15);
  }, [filteredData, activeStreams]);

  // Compute coordinate points
  const points = useMemo(() => {
    const len = filteredData.length;
    if (len === 0) return { commits: [], gameHours: [], foodCount: [], journalWritten: [] };

    const getX = (idx: number) => padding.left + (idx / Math.max(1, len - 1)) * chartWidth;
    const getY = (val: number) => padding.top + chartHeight - (val / maxVal) * chartHeight;

    return {
      commits: filteredData.map((d, i) => ({ x: getX(i), y: getY(d.commits), val: d.commits })),
      gameHours: filteredData.map((d, i) => ({ x: getX(i), y: getY(d.gameHours), val: d.gameHours })),
      foodCount: filteredData.map((d, i) => ({ x: getX(i), y: getY(d.foodCount), val: d.foodCount })),
      journalWritten: filteredData.map((d, i) => ({ x: getX(i), y: getY(d.journalWritten), val: d.journalWritten })),
    };
  }, [filteredData, maxVal, chartWidth, chartHeight]);

  // Generate smooth SVG path
  const makePath = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const makeAreaPath = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return '';
    const linePath = makePath(pts);
    const bottomY = padding.top + chartHeight;
    const firstX = pts[0].x;
    const lastX = pts[pts.length - 1].x;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  const activeHoverData = hoverIndex !== null && filteredData[hoverIndex] ? filteredData[hoverIndex] : null;

  return (
    <div className={cn('ledger-card p-5 space-y-4 font-sans select-none', className)}>
      {/* Card Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rule/70">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-mono text-ink-soft uppercase tracking-wider font-semibold">
              Live Output Streams
            </span>
            <span className="text-xs px-1.5 py-0.2 rounded font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Synced
            </span>
          </div>
          <h2 className="font-serif text-lg font-bold text-ink">{title}</h2>
          <p className="text-xs text-ink-soft font-mono mt-0.5">{subtitle}</p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-paper/80 border border-rule rounded-lg shrink-0">
          {(['7d', '14d', '30d'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                'px-2.5 py-1 text-xs font-mono font-semibold rounded-md transition-all',
                range === r
                  ? 'bg-card text-ink shadow-xs border border-rule/80'
                  : 'text-ink-soft hover:text-ink'
              )}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Stream Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <span className="text-[11px] font-mono text-ink-soft flex items-center gap-1 mr-1">
          <Filter className="w-3 h-3" /> Toggle Streams:
        </span>
        {Object.entries(chartConfig).map(([key, cfg]) => {
          const isActive = activeStreams[key];
          const Icon = cfg.icon;

          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleStream(key)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium border transition-all duration-150',
                isActive
                  ? 'bg-paper text-ink border-rule shadow-2xs'
                  : 'bg-card/40 text-ink-soft/50 border-rule/50 line-through opacity-60 hover:opacity-80'
              )}
            >
              {Icon && <Icon className="w-3 h-3" style={{ color: cfg.color }} />}
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: cfg.color }}
              />
              <span>{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main SVG Area Chart */}
      <ChartContainer config={chartConfig} className="relative w-full aspect-auto">
        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${svgWidth} ${height}`}
            className="w-full h-auto overflow-visible"
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              <linearGradient id="commits-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--ledger-blue)" stopOpacity="0.32" />
                <stop offset="100%" stopColor="var(--ledger-blue)" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="game-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="food-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="journal-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--stamp-red)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--stamp-red)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const y = padding.top + chartHeight * (1 - pct);
              const labelVal = Math.round(maxVal * pct);
              return (
                <g key={pct}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={svgWidth - padding.right}
                    y2={y}
                    stroke="var(--rule)"
                    strokeDasharray={pct === 0 ? undefined : '3 3'}
                    strokeWidth={pct === 0 ? '1.5' : '1'}
                    opacity={pct === 0 ? 0.9 : 0.45}
                  />
                  <text
                    x={padding.left - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[9px] font-mono fill-ink-soft select-none"
                  >
                    {labelVal}
                  </text>
                </g>
              );
            })}

            {/* Area Fills */}
            {activeStreams.foodCount && points.foodCount.length > 1 && (
              <path
                d={makeAreaPath(points.foodCount)}
                fill="url(#food-grad)"
              />
            )}
            {activeStreams.gameHours && points.gameHours.length > 1 && (
              <path
                d={makeAreaPath(points.gameHours)}
                fill="url(#game-grad)"
              />
            )}
            {activeStreams.commits && points.commits.length > 1 && (
              <path
                d={makeAreaPath(points.commits)}
                fill="url(#commits-grad)"
              />
            )}
            {activeStreams.journalWritten && points.journalWritten.length > 1 && (
              <path
                d={makeAreaPath(points.journalWritten)}
                fill="url(#journal-grad)"
              />
            )}

            {/* Stroke Lines */}
            {activeStreams.foodCount && points.foodCount.length > 1 && (
              <path
                d={makePath(points.foodCount)}
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
            {activeStreams.gameHours && points.gameHours.length > 1 && (
              <path
                d={makePath(points.gameHours)}
                fill="none"
                stroke="var(--gold)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}
            {activeStreams.journalWritten && points.journalWritten.length > 1 && (
              <path
                d={makePath(points.journalWritten)}
                fill="none"
                stroke="var(--stamp-red)"
                strokeWidth="2"
                strokeDasharray="4 3"
                strokeLinecap="round"
              />
            )}
            {activeStreams.commits && points.commits.length > 1 && (
              <path
                d={makePath(points.commits)}
                fill="none"
                stroke="var(--ledger-blue)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}

            {/* Hover Guide and Points */}
            {hoverIndex !== null && points.commits[hoverIndex] && (
              <g>
                <line
                  x1={points.commits[hoverIndex].x}
                  y1={padding.top}
                  x2={points.commits[hoverIndex].x}
                  y2={padding.top + chartHeight}
                  stroke="var(--ink)"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                  opacity="0.6"
                />
                {activeStreams.commits && (
                  <circle
                    cx={points.commits[hoverIndex].x}
                    cy={points.commits[hoverIndex].y}
                    r="4.5"
                    fill="var(--ledger-blue)"
                    stroke="var(--card)"
                    strokeWidth="2"
                  />
                )}
                {activeStreams.gameHours && (
                  <circle
                    cx={points.gameHours[hoverIndex].x}
                    cy={points.gameHours[hoverIndex].y}
                    r="4.5"
                    fill="var(--gold)"
                    stroke="var(--card)"
                    strokeWidth="2"
                  />
                )}
                {activeStreams.foodCount && (
                  <circle
                    cx={points.foodCount[hoverIndex].x}
                    cy={points.foodCount[hoverIndex].y}
                    r="4.5"
                    fill="#10B981"
                    stroke="var(--card)"
                    strokeWidth="2"
                  />
                )}
              </g>
            )}

            {/* X Axis Labels & Interactive Hover Slices */}
            {filteredData.map((d, i) => {
              const x = padding.left + (i / Math.max(1, filteredData.length - 1)) * chartWidth;
              const colWidth = chartWidth / Math.max(1, filteredData.length);
              const showLabel =
                filteredData.length <= 10 ||
                i % Math.ceil(filteredData.length / 7) === 0 ||
                i === filteredData.length - 1;

              return (
                <g key={d.date}>
                  {/* Invisible hover trigger rectangle */}
                  <rect
                    x={x - colWidth / 2}
                    y={padding.top}
                    width={colWidth}
                    height={chartHeight + padding.bottom}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverIndex(i)}
                  />
                  {showLabel && (
                    <text
                      x={x}
                      y={height - 12}
                      textAnchor="middle"
                      className="text-[9px] font-mono fill-ink-soft select-none"
                    >
                      {d.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Interactive Tooltip Popover Overlay */}
          {activeHoverData && hoverIndex !== null && points.commits[hoverIndex] && (
            <div
              className="absolute pointer-events-none transition-all duration-75 z-20"
              style={{
                left: `${(points.commits[hoverIndex].x / svgWidth) * 100}%`,
                top: '12px',
                transform:
                  points.commits[hoverIndex].x > svgWidth * 0.7
                    ? 'translateX(-105%)'
                    : 'translateX(10px)',
              }}
            >
              <ChartTooltipContent
                active={true}
                label={activeHoverData.date}
                payload={[
                  ...(activeStreams.commits
                    ? [{ name: 'commits', value: `${activeHoverData.commits} commits`, color: 'var(--ledger-blue)' }]
                    : []),
                  ...(activeStreams.gameHours
                    ? [{ name: 'gameHours', value: `${activeHoverData.gameHours} hrs`, color: 'var(--gold)' }]
                    : []),
                  ...(activeStreams.foodCount
                    ? [{ name: 'foodCount', value: `${activeHoverData.foodCount} meals`, color: '#10B981' }]
                    : []),
                  ...(activeStreams.journalWritten
                    ? [{ name: 'journalWritten', value: activeHoverData.journalWritten ? 'Written' : 'None', color: 'var(--stamp-red)' }]
                    : []),
                ]}
              />
            </div>
          )}
        </div>
      </ChartContainer>
    </div>
  );
};
