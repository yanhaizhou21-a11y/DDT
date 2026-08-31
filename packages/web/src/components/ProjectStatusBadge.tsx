import * as React from 'react';
import type { ProjectDomainType, ProjectStatus } from '../types';
import { cn } from '../lib/utils';

export function getProjectStatusLabel(domainType: ProjectDomainType, status: ProjectStatus): string {
  switch (status) {
    case 'not_started':
      return 'Just Started';
    case 'in_progress':
      return 'In Progress';
    case 'ready':
      switch (domainType) {
        case 'software':
          return 'Ready to Deploy';
        case 'game_dev':
          return 'Ready to Ship';
        case 'graphic_design':
        case 'video_photo':
        default:
          return 'Ready to Deliver';
      }
    default:
      return status;
  }
}

export function getProjectDomainLabel(domainType: ProjectDomainType): string {
  switch (domainType) {
    case 'software':
      return 'Software Development';
    case 'graphic_design':
      return 'Graphic Design';
    case 'game_dev':
      return 'Game Development';
    case 'video_photo':
      return 'Video/Photo';
    default:
      return domainType;
  }
}

interface ProjectStatusBadgeProps {
  domainType: ProjectDomainType;
  status: ProjectStatus;
  className?: string;
}

export const ProjectStatusBadge: React.FC<ProjectStatusBadgeProps> = ({
  domainType,
  status,
  className,
}) => {
  const label = getProjectStatusLabel(domainType, status);

  // Styling per design.md §4:
  // "small pill-free label (text + a dot, matching the tag style on kanban cards, not a filled background) —
  // --ink-soft for 'Just Started', --ledger-blue for 'In Progress', and --ledger-blue at full opacity with a filled dot
  // for 'Ready to Deploy/Deliver/Ship'. Never use --stamp-red here"
  const getDotAndTextColor = () => {
    switch (status) {
      case 'not_started':
        return {
          dot: 'bg-ink-soft/60',
          text: 'text-ink-soft',
        };
      case 'in_progress':
        return {
          dot: 'bg-ledger-blue/70 animate-pulse',
          text: 'text-ledger-blue font-medium',
        };
      case 'ready':
        return {
          dot: 'bg-ledger-blue shadow-[0_0_6px_rgba(47,72,88,0.5)]',
          text: 'text-ledger-blue font-bold',
        };
      default:
        return {
          dot: 'bg-ink-soft',
          text: 'text-ink-soft',
        };
    }
  };

  const style = getDotAndTextColor();

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-sans select-none tracking-tight',
        style.text,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', style.dot)} />
      <span>{label}</span>
    </span>
  );
};
