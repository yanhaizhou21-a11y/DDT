import React from 'react';
import { cn } from '../../lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface DashboardKpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  description?: string;
  changeLabel?: string;
  trend?: {
    value: number; // percentage, e.g. +14 or -5
    label?: string;
  };
  sparkline?: number[];
  icon: React.ElementType;
  color?: string;
  accentColor?: string;
  sparklineColor?: string;
  className?: string;
  onClick?: () => void;
}

export const DashboardKpiCard: React.FC<DashboardKpiCardProps> = ({
  title,
  value,
  unit,
  description,
  changeLabel,
  trend,
  sparkline = [],
  icon: Icon,
  color,
  accentColor,
  sparklineColor,
  className,
  onClick,
}) => {
  const activeColor = color || accentColor || 'var(--ledger-blue)';
  const activeSparkColor = sparklineColor || activeColor;
  // Sparkline coordinates
  const sparklineSvg = React.useMemo(() => {
    if (!sparkline || sparkline.length < 2) return null;
    const min = Math.min(...sparkline);
    const max = Math.max(...sparkline, min + 1);
    const width = 100;
    const height = 30;

    const points = sparkline.map((val, idx) => {
      const x = (idx / (sparkline.length - 1)) * width;
      const y = height - ((val - min) / (max - min)) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return points.join(' ');
  }, [sparkline]);

  const isPositive = trend ? trend.value > 0 : null;
  const isNeutral = trend ? trend.value === 0 : null;

  return (
    <div
      onClick={onClick}
      className={cn(
        'ledger-card p-4 flex flex-col justify-between transition-all duration-200 group',
        onClick && 'cursor-pointer hover:border-ink-soft',
        className
      )}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-md border border-rule flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
            style={{
              backgroundColor: 'var(--paper)',
              color: activeColor,
            }}
          >
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-mono font-medium text-ink-soft truncate uppercase tracking-wider">
            {title}
          </span>
        </div>

        {trend && (
          <div
            className={cn(
              'flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold shrink-0 border',
              isPositive
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : isNeutral
                ? 'bg-rule/30 text-ink-soft border-rule'
                : 'bg-stamp-red/10 text-stamp-red border-stamp-red/30'
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-2.5 h-2.5" />
            ) : isNeutral ? (
              <Minus className="w-2.5 h-2.5" />
            ) : (
              <TrendingDown className="w-2.5 h-2.5" />
            )}
            <span>
              {isPositive ? `+${trend.value}%` : `${trend.value}%`}
            </span>
          </div>
        )}
      </div>

      {/* Main Metric Value & Sparkline */}
      <div className="flex items-end justify-between gap-3 pt-1">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-2xl lg:text-3xl font-bold text-ink tracking-tight">
              {value}
            </span>
            {unit && (
              <span className="font-mono text-xs text-ink-soft font-medium">{unit}</span>
            )}
          </div>
          {(changeLabel || description) && (
            <p className="text-[11px] text-ink-soft font-mono truncate mt-0.5">
              {changeLabel || description}
            </p>
          )}
        </div>

        {sparklineSvg && (
          <div className="w-24 h-8 shrink-0 pb-1">
            <svg
              viewBox="0 0 100 30"
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <polyline
                fill="none"
                stroke={activeSparkColor}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={sparklineSvg}
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
