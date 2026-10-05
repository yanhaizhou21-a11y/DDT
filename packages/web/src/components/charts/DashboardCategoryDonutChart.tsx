import React, { useState } from 'react';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '../ui/chart';
import { Code2, Gamepad2, Utensils, BookOpen, PieChart } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CategorySegment {
  key: string;
  label: string;
  value: number;
  unit: string;
  color: string;
  icon: React.ElementType;
}

export interface DashboardCategoryDonutChartProps {
  segments: CategorySegment[];
  className?: string;
  title?: string;
  subtitle?: string;
}

export const DashboardCategoryDonutChart: React.FC<DashboardCategoryDonutChartProps> = ({
  segments,
  className,
  title = 'Balance & Output Ratio',
  subtitle = 'Category distribution across work, play & daily habits',
}) => {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const totalValue = React.useMemo(() => {
    return segments.reduce((acc, s) => acc + s.value, 0);
  }, [segments]);

  // Construct chart config
  const chartConfig: ChartConfig = React.useMemo(() => {
    const cfg: ChartConfig = {};
    segments.forEach((s) => {
      cfg[s.key] = {
        label: s.label,
        color: s.color,
        icon: s.icon,
      };
    });
    return cfg;
  }, [segments]);

  // Generate SVG donut arcs
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeAngle = 0;
  const arcData = segments.map((seg) => {
    const fraction = totalValue > 0 ? seg.value / totalValue : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativeAngle;
    cumulativeAngle += fraction * circumference;
    const percentage = Math.round(fraction * 100);

    return {
      ...seg,
      percentage,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeSegment = hoveredKey ? segments.find((s) => s.key === hoveredKey) : null;

  return (
    <div className={cn('ledger-card p-5 space-y-4 font-sans select-none flex flex-col justify-between', className)}>
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-rule/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-paper flex items-center justify-center text-ledger-blue border border-rule/60">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-ink">{title}</h3>
              <p className="text-[11px] text-ink-soft font-mono">{subtitle}</p>
            </div>
          </div>
        </div>

        {/* Donut & Stats Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
          {/* Donut Visual */}
          <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="transform -rotate-90"
            >
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="var(--rule)"
                strokeWidth={strokeWidth}
                opacity="0.3"
              />
              {arcData.map((arc) => {
                const isHovered = hoveredKey === arc.key;
                return (
                  <circle
                    key={arc.key}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={arc.strokeDasharray}
                    strokeDashoffset={arc.strokeDashoffset}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredKey(arc.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                  />
                );
              })}
            </svg>

            {/* Center Summary Counter */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4">
              {activeSegment ? (
                <>
                  <span className="text-[11px] font-mono text-ink-soft uppercase truncate max-w-[80px]">
                    {activeSegment.label}
                  </span>
                  <span className="font-mono text-xl font-bold text-ink">
                    {activeSegment.value}
                  </span>
                  <span className="text-[10px] font-mono text-ink-soft">
                    {activeSegment.unit}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-mono text-ink-soft uppercase tracking-wider">
                    Total Logs
                  </span>
                  <span className="font-mono text-2xl font-bold text-ink">
                    {totalValue}
                  </span>
                  <span className="text-[10px] font-mono text-ink-soft">
                    units
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Breakdown List */}
          <div className="flex-1 w-full space-y-2">
            {arcData.map((arc) => {
              const Icon = arc.icon;
              const isHovered = hoveredKey === arc.key;

              return (
                <div
                  key={arc.key}
                  onMouseEnter={() => setHoveredKey(arc.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  className={cn(
                    'p-2 rounded-lg border transition-all duration-150 cursor-pointer flex items-center justify-between text-xs',
                    isHovered
                      ? 'bg-paper border-ink-soft shadow-xs'
                      : 'bg-paper/40 border-rule/60 hover:bg-paper/70'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: arc.color }}
                    />
                    <Icon className="w-3.5 h-3.5 text-ink-soft shrink-0" />
                    <span className="font-medium text-ink truncate">{arc.label}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-mono">
                    <span className="font-semibold text-ink">
                      {arc.value} {arc.unit}
                    </span>
                    <span className="text-[10px] text-ink-soft px-1.5 py-0.5 rounded bg-card border border-rule">
                      {arc.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-rule/60 flex items-center justify-between text-[11px] font-mono text-ink-soft">
        <span>Balanced output matrix</span>
        <span>Ratio index: {totalValue > 0 ? '1.0' : '0.0'}</span>
      </div>
    </div>
  );
};
