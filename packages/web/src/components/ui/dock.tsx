import * as React from 'react';
import { useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
  AnimatePresence,
} from 'motion/react';
import { cn } from '../../lib/utils';

export interface DockItem<T extends string = string> {
  id: T;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  badge?: string;
  ariaLabel?: string;
}

export interface DockProps<T extends string = string> {
  items: DockItem<T>[];
  baseSize?: number;
  maxSize?: number;
  influence?: number;
  className?: string;
  activeId?: T;
  onSelectItem?: (id: T) => void;
}

interface DockIconItemProps<T extends string = string> {
  item: DockItem<T>;
  mouseX: MotionValue<number>;
  baseSize: number;
  maxSize: number;
  influence: number;
  isActive: boolean;
  onSelect?: (id: T) => void;
}

function DockIconItem<T extends string = string>({
  item,
  mouseX,
  baseSize,
  maxSize,
  influence,
  isActive,
  onSelect,
}: DockIconItemProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(
    distance,
    [-influence, 0, influence],
    [baseSize, maxSize, baseSize]
  );

  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 170,
    damping: 14,
  });

  const iconScaleSync = useTransform(
    distance,
    [-influence, 0, influence],
    [baseSize * 0.48, maxSize * 0.48, baseSize * 0.48]
  );

  const iconSize = useSpring(iconScaleSync, {
    mass: 0.1,
    stiffness: 170,
    damping: 14,
  });

  const showTooltip = isHovered || isFocused;

  return (
    <motion.div
      ref={ref}
      style={{ width }}
      className="relative flex items-end justify-center shrink-0 origin-bottom touch-pan-x"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Floating Tooltip Label */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.92 }}
            transition={{ duration: 0.12 }}
            aria-hidden="true"
            className="pointer-events-none absolute -top-8 px-2 py-0.5 rounded-md bg-ink text-paper text-[10px] font-mono font-medium whitespace-nowrap shadow-md z-30 select-none"
          >
            {item.label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spring-Smoothed Sizing Button */}
      <motion.button
        type="button"
        style={{ width, height: width }}
        onClick={() => {
          item.onClick?.();
          onSelect?.(item.id);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        aria-label={item.ariaLabel || item.label}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'rounded-xl flex items-center justify-center relative select-none transition-colors duration-150',
          'focus-visible:ring-2 focus-visible:ring-ledger-blue focus-visible:outline-hidden',
          isActive
            ? 'bg-ledger-light text-ledger-blue shadow-xs font-semibold border border-ledger-blue/25'
            : 'text-ink-soft hover:text-ink hover:bg-paper/85 active:bg-paper'
        )}
      >
        <motion.div
          style={{ width: iconSize, height: iconSize }}
          className="flex items-center justify-center shrink-0 pointer-events-none [&>svg]:w-full [&>svg]:h-full"
        >
          {item.icon}
        </motion.div>

        {item.badge && (
          <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full text-[8px] font-mono font-bold bg-stamp-red text-white leading-tight pointer-events-none">
            {item.badge}
          </span>
        )}

        {isActive && (
          <span
            aria-hidden="true"
            className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-ledger-blue shadow-xs pointer-events-none"
          />
        )}
      </motion.button>
    </motion.div>
  );
}

export function Dock<T extends string = string>({
  items,
  baseSize = 40,
  maxSize = 60,
  influence = 100,
  className,
  activeId,
  onSelectItem,
}: DockProps<T>) {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onPointerMove={(e) => mouseX.set(e.clientX)}
      onPointerDown={(e) => mouseX.set(e.clientX)}
      onPointerUp={() => mouseX.set(Infinity)}
      onPointerCancel={() => mouseX.set(Infinity)}
      onPointerLeave={() => mouseX.set(Infinity)}
      role="toolbar"
      aria-label="Navigation Dock"
      className={cn(
        'relative inline-flex items-end gap-1.5 px-2.5 pt-6 pb-2 rounded-2xl select-none',
        'bg-card/95 border border-rule/80 backdrop-blur-md shadow-xl shadow-black/5',
        'overflow-x-auto no-scrollbar touch-pan-x',
        className
      )}
    >
      {items.map((item) => {
        const isActive = activeId ? activeId === item.id : Boolean(item.isActive);
        return (
          <DockIconItem
            key={item.id}
            item={item}
            mouseX={mouseX}
            baseSize={baseSize}
            maxSize={maxSize}
            influence={influence}
            isActive={isActive}
            onSelect={onSelectItem}
          />
        );
      })}
    </motion.div>
  );
}
