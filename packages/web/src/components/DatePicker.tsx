import React, { useMemo } from 'react';
import {
  DatePicker as AriaDatePicker,
  DatePickerProps as AriaDatePickerProps,
  DateInput,
  DateSegment,
  Dialog,
  Popover,
  Calendar,
  CalendarGrid,
  CalendarCell,
  CalendarHeaderCell,
  CalendarGridHeader,
  CalendarGridBody,
  Heading,
  Button as AriaButton,
  Group,
} from 'react-aria-components';
import { parseDate, today, getLocalTimeZone } from '@internationalized/date';
import type { DateValue } from '@internationalized/date';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../types';

export interface DatePickerProps
  extends Omit<AriaDatePickerProps<DateValue>, 'value' | 'onChange' | 'defaultValue'> {
  value?: string | DateValue | null;
  onChange?: (dateStr: string, dateValue: DateValue | null) => void;
  onDateChange?: (dateValue: DateValue | null) => void;
  defaultValue?: string | DateValue | null;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
  isClearable?: boolean;
  minDate?: string;
  maxDate?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  onDateChange,
  defaultValue,
  label,
  className,
  size = 'md',
  isClearable = false,
  minDate,
  maxDate,
  'aria-label': ariaLabel,
  isDisabled,
  ...props
}) => {
  // Convert string values to DateValue safely
  const parsedValue: DateValue | null = useMemo(() => {
    if (!value) return null;
    if (typeof value === 'string') {
      try {
        const trimmed = value.trim().slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
          return parseDate(trimmed);
        }
      } catch (e) {
        return null;
      }
      return null;
    }
    return value;
  }, [value]);

  const parsedDefaultValue: DateValue | undefined = useMemo(() => {
    if (!defaultValue) return undefined;
    if (typeof defaultValue === 'string') {
      try {
        const trimmed = defaultValue.trim().slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
          return parseDate(trimmed);
        }
      } catch (e) {
        return undefined;
      }
    }
    return defaultValue;
  }, [defaultValue]);

  const minValue = useMemo(() => {
    if (!minDate) return undefined;
    try {
      return parseDate(minDate);
    } catch {
      return undefined;
    }
  }, [minDate]);

  const maxValue = useMemo(() => {
    if (!maxDate) return undefined;
    try {
      return parseDate(maxDate);
    } catch {
      return undefined;
    }
  }, [maxDate]);

  const handleChange = (newDateValue: DateValue | null) => {
    const dateStr = newDateValue ? newDateValue.toString() : '';
    if (onChange) {
      onChange(dateStr, newDateValue);
    }
    if (onDateChange) {
      onDateChange(newDateValue);
    }
  };

  const handleSetToday = () => {
    const now = today(getLocalTimeZone());
    handleChange(now);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleChange(null);
  };

  const isSmall = size === 'sm';

  return (
    <AriaDatePicker
      value={parsedValue}
      onChange={handleChange}
      defaultValue={parsedDefaultValue}
      minValue={minValue}
      maxValue={maxValue}
      aria-label={ariaLabel || label || 'Select date'}
      isDisabled={isDisabled}
      className={cn('flex flex-col gap-1 w-full', className)}
      {...props}
    >
      {label && (
        <span className="text-xs font-mono uppercase tracking-wider text-ink-soft">
          {label}
        </span>
      )}

      <Group
        className={cn(
          'flex items-center justify-between bg-paper border border-rule/90 rounded-md transition-all',
          'hover:border-ink-soft/60 focus-within:border-ledger-blue focus-within:ring-1 focus-within:ring-ledger-blue/20 focus-within:bg-card',
          isDisabled && 'opacity-60 cursor-not-allowed bg-paper/50',
          isSmall ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CalendarIcon
            className={cn(
              'text-ledger-blue shrink-0',
              isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'
            )}
          />
          <DateInput
            className="flex items-center gap-0.5 font-mono text-ink text-xs sm:text-sm select-none"
          >
            {(segment) => (
              <DateSegment
                segment={segment}
                className={cn(
                  'rounded px-0.5 py-0.5 outline-hidden transition-colors',
                  'focus:bg-ledger-blue focus:text-paper font-mono',
                  segment.isPlaceholder && 'text-ink-soft/60'
                )}
              />
            )}
          </DateInput>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {isClearable && parsedValue && !isDisabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded text-ink-soft hover:text-stamp-red hover:bg-paper transition-colors"
              title="Clear date"
              aria-label="Clear date"
            >
              <X className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            </button>
          )}

          <AriaButton
            className={cn(
              'p-1 rounded-md text-ink-soft hover:text-ink hover:bg-paper/80 active:scale-95 transition-all outline-hidden',
              'focus-visible:ring-1 focus-visible:ring-ledger-blue'
            )}
          >
            <ChevronRight className={cn('rotate-90 transition-transform', isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
          </AriaButton>
        </div>
      </Group>

      <Popover
        className={cn(
          'z-50 bg-card border border-rule rounded-xl shadow-elevated p-3 select-none',
          'entering:animate-in entering:fade-in-0 entering:zoom-in-95',
          'exiting:animate-out exiting:fade-out-0 exiting:zoom-out-95',
          'outline-hidden'
        )}
      >
        <Dialog className="outline-hidden">
          <Calendar className="w-full">
            <header className="flex items-center justify-between pb-2.5 mb-2 border-b border-rule/70">
              <AriaButton
                slot="previous"
                className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-paper active:scale-95 transition-all outline-hidden focus-visible:ring-1 focus-visible:ring-ledger-blue"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </AriaButton>

              <Heading className="font-serif font-semibold text-sm text-ink tracking-tight" />

              <AriaButton
                slot="next"
                className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-paper active:scale-95 transition-all outline-hidden focus-visible:ring-1 focus-visible:ring-ledger-blue"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </AriaButton>
            </header>

            <CalendarGrid className="w-full border-collapse">
              <CalendarGridHeader>
                {(day) => (
                  <CalendarHeaderCell className="font-mono text-[11px] uppercase tracking-wider text-ink-soft/80 font-medium pb-2 text-center w-8">
                    {day}
                  </CalendarHeaderCell>
                )}
              </CalendarGridHeader>
              <CalendarGridBody>
                {(date) => (
                  <CalendarCell
                    date={date}
                    className={({ isSelected, isToday, isDisabled, isOutsideVisibleRange }) =>
                      cn(
                        'w-8 h-8 mx-auto flex items-center justify-center rounded-lg font-mono text-xs transition-all outline-hidden cursor-pointer select-none',
                        'hover:bg-paper hover:text-ink',
                        isOutsideVisibleRange && 'text-ink-soft/30 opacity-40',
                        isToday && !isSelected && 'font-bold border border-ledger-blue/40 text-ledger-blue bg-ledger-blue/5',
                        isSelected && 'bg-ledger-blue text-paper font-semibold shadow-xs hover:bg-ledger-hover hover:text-paper',
                        isDisabled && 'text-ink-soft/30 cursor-not-allowed opacity-40 hover:bg-transparent'
                      )
                    }
                  />
                )}
              </CalendarGridBody>
            </CalendarGrid>

            {/* Quick Presets Footer */}
            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-rule/70 text-xs font-mono">
              <button
                type="button"
                onClick={handleSetToday}
                className="px-2 py-1 rounded-md text-ledger-blue hover:bg-ledger-blue/10 active:scale-95 transition-all"
              >
                Today
              </button>
              {parsedValue && (
                <button
                  type="button"
                  onClick={() => handleChange(null)}
                  className="px-2 py-1 rounded-md text-stamp-red hover:bg-stamp-red/10 active:scale-95 transition-all"
                >
                  Clear
                </button>
              )}
            </div>
          </Calendar>
        </Dialog>
      </Popover>
    </AriaDatePicker>
  );
};
