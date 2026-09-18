import React from 'react';
import type { SavedChatSession } from '@/types';
import type { SessionItemPassedProps } from './sidebarTypes';
import { LimitedSessionList } from './LimitedSessionList';

interface SessionListGroupProps {
  title?: string;
  sessions: SavedChatSession[];
  sessionItemProps: SessionItemPassedProps;
  isDragging?: boolean;
}

export const SessionListGroup: React.FC<SessionListGroupProps> = ({
  title,
  sessions,
  sessionItemProps,
  isDragging,
}) => {
  return (
    <div>
      {title && (
        <div className="px-3 pt-4 pb-1 text-xs font-semibold tracking-wide text-[var(--theme-text-primary)]">
          {title}
        </div>
      )}
      <LimitedSessionList sessions={sessions} sessionItemProps={sessionItemProps} isDragging={isDragging} />
    </div>
  );
};
