import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SavedChatSession } from '@/types';
import { SessionItem } from './SessionItem';
import type { SessionItemPassedProps } from './sidebarTypes';

interface SortableSessionItemProps extends SessionItemPassedProps {
  session: SavedChatSession;
}

export const SortableSessionItem: React.FC<SortableSessionItemProps> = (props) => {
  const { session } = props;
  const sortableId = `session:${session.id}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    data: { type: 'session', session, groupId: session.groupId ?? null },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    zIndex: isDragging ? 10 : undefined,
  };

  // Use the sortable listeners on the whole row for better hit area; SessionItem's <a> still handles click.
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <SessionItem {...props} session={session} draggingSessionId={isDragging ? session.id : props.draggingSessionId} />
    </div>
  );
};
