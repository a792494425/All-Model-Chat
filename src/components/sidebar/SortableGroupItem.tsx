import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GroupItem, type GroupItemProps } from './GroupItem';

export type SortableGroupItemProps = GroupItemProps;

export const SortableGroupItem: React.FC<SortableGroupItemProps> = (props) => {
  const { group } = props;
  const sortableId = `group:${group.id}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    data: { type: 'group', group },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    zIndex: isDragging ? 10 : undefined,
  };

  // Pass dnd-kit listeners to the grip handle via props; GroupItem will apply them to the grip span.
  // We use a wrapper div that holds the sortable ref and style, and forward listeners via a prop.
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <GroupItem {...props} dndListeners={listeners} isSortableDragging={isDragging} />
    </div>
  );
};
