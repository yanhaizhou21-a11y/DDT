import * as React from 'react';
import { cn } from '../../lib/utils';

// Format: { [key: string]: { label: string; color: string; icon?: React.ComponentType } }
export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }> | React.ComponentType<any> | React.ElementType;
    color?: string;
    theme?: Record<string, string>;
  }
>;

interface ChartContextProps {
  config: ChartConfig;
}

const ChartContext = React.createContext<ChartContextProps | null>(null);

export function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />');
  }
  return context;
}

export interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig;
  children: React.ReactNode;
}

export const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ id, className, children, config, ...props }, ref) => {
    const uniqueId = React.useId();
    const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`;

    return (
      <ChartContext.Provider value={{ config }}>
        <div
          data-chart={chartId}
          ref={ref}
          className={cn(
            'flex aspect-auto justify-center text-xs text-ink select-none',
            className
          )}
          style={
            Object.entries(config).reduce((acc, [key, item]) => {
              const color = item.color;
              if (color) {
                acc[`--color-${key}`] = color;
              }
              return acc;
            }, {} as Record<string, string>) as React.CSSProperties
          }
          {...props}
        >
          {children}
        </div>
      </ChartContext.Provider>
    );
  }
);
ChartContainer.displayName = 'ChartContainer';

export interface ChartTooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | string;
    color?: string;
    dataKey?: string;
    payload?: any;
  }>;
  label?: string;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: 'line' | 'dot' | 'dashed';
  nameKey?: string;
  labelKey?: string;
  formatter?: (value: any, name: string, item: any, index: number) => React.ReactNode;
}

export const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  (
    {
      active,
      payload,
      className,
      indicator = 'dot',
      hideLabel = false,
      hideIndicator = false,
      label,
      formatter,
      color,
      nameKey,
    },
    ref
  ) => {
    const { config } = useChart();

    if (!payload?.length) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          'grid min-w-[9rem] items-start gap-1.5 rounded-lg border border-rule bg-card px-3 py-2 text-xs shadow-md backdrop-blur-xs font-sans',
          'dark:bg-card/95',
          className
        )}
      >
        {!hideLabel && label && (
          <div className="font-mono text-[11px] font-semibold text-ink-soft border-b border-rule/60 pb-1 mb-0.5">
            {label}
          </div>
        )}
        <div className="grid gap-1">
          {payload.map((item, index) => {
            const key = `${nameKey || item.dataKey || item.name || 'value'}`;
            const itemConfig = config[key] || config[item.name];
            const indicatorColor = color || item.color || itemConfig?.color || 'var(--ledger-blue)';

            return (
              <div
                key={index}
                className="flex w-full items-center justify-between gap-3 text-xs leading-none"
              >
                <div className="flex items-center gap-1.5">
                  {!hideIndicator && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full ring-1 ring-card"
                      style={{ backgroundColor: indicatorColor }}
                    />
                  )}
                  <span className="text-ink-soft">
                    {itemConfig?.label || item.name}
                  </span>
                </div>
                <span className="font-mono font-semibold text-ink">
                  {formatter ? formatter(item.value, item.name, item, index) : item.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
ChartTooltipContent.displayName = 'ChartTooltipContent';

export interface ChartLegendProps extends React.HTMLAttributes<HTMLDivElement> {
  payload?: Array<{
    value: any;
    dataKey?: string;
    color?: string;
    inactive?: boolean;
  }>;
  onItemClick?: (dataKey: string) => void;
}

export const ChartLegendContent = React.forwardRef<HTMLDivElement, ChartLegendProps>(
  ({ className, payload, onItemClick }, ref) => {
    const { config } = useChart();

    if (!payload?.length) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn('flex flex-wrap items-center justify-center gap-4 text-xs font-medium', className)}
      >
        {payload.map((item) => {
          const key = `${item.dataKey || item.value}`;
          const itemConfig = config[key];
          const color = item.color || itemConfig?.color || 'var(--ledger-blue)';
          const Icon = itemConfig?.icon;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onItemClick && onItemClick(key)}
              className={cn(
                'flex items-center gap-1.5 transition-opacity hover:opacity-100',
                item.inactive ? 'opacity-40 line-through' : 'opacity-90'
              )}
            >
              {Icon ? (
                <Icon className="h-3.5 w-3.5 text-ink-soft" />
              ) : (
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
              )}
              <span className="text-ink text-xs">{itemConfig?.label || item.value}</span>
            </button>
          );
        })}
      </div>
    );
  }
);
ChartLegendContent.displayName = 'ChartLegendContent';
