import React from 'react';
import type { ChatGroup, SavedChatSession } from '@/types';
import type { SessionItemPassedProps } from './sidebarTypes';
import { DESKTOP_BREAKPOINT_PX } from '@/constants/layout';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableGroupItem } from './SortableGroupItem';

interface SidebarGroupSortDndProps {
  sortedGroups: ChatGroup[];
  sessionsByGroupId: Map<string | null, SavedChatSession[]>;
  dragOverId: string | null;
  groupDropIndicator?: { id: string; position: 'before' | 'after' } | null;
  isDragging?: boolean;
  handleGroupDragOver?: (event: React.DragEvent, groupId: string) => void;
  handleGroupDragStart: (groupId: string) => void;
  handleGroupDragEnd: () => void;
  onReorderGroups?: (activeId: string, overId: string) => void;
  onToggleGroupExpansion: (groupId: string) => void;
  onNewChatInGroup: (groupId: string) => void;
  onAutoClose: () => void;
  handleGroupStartEdit: (item: ChatGroup) => void;
  handleDrop: (e: React.DragEvent, groupId: string | null) => void;
  handleDragOver: (e: React.DragEvent) => void;
  onDeleteGroup: (groupId: string) => void;
  onClearGroup?: (groupId: string) => void;
  sessionItemProps: SessionItemPassedProps;
}

export const SidebarGroupSortDnd: React.FC<SidebarGroupSortDndProps> = ({
  sortedGroups,
  sessionsByGroupId,
  dragOverId,
  groupDropIndicator,
  isDragging,
  handleGroupDragOver,
  handleGroupDragStart,
  handleGroupDragEnd,
  onReorderGroups,
  onToggleGroupExpansion,
  onNewChatInGroup,
  onAutoClose,
  handleGroupStartEdit,
  handleDrop,
  handleDragOver,
  onDeleteGroup,
  onClearGroup,
  sessionItemProps,
}) => {
  const [activeGroupDragId, setActiveGroupDragId] = React.useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const groupIds = React.useMemo(() => sortedGroups.map((group) => `group:${group.id}`), [sortedGroups]);

  const handleGroupSortStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);
    if (activeId.startsWith('group:')) {
      const gid = activeId.slice(6);
      setActiveGroupDragId(gid);
      handleGroupDragStart(gid);
    }
  };

  const handleGroupSortEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    setActiveGroupDragId(null);
    handleGroupDragEnd();
    if (!overId || activeId === overId) return;
    if (activeId.startsWith('group:') && overId.startsWith('group:')) {
      const activeGid = activeId.slice(6);
      const overGid = overId.slice(6);
      onReorderGroups?.(activeGid, overGid);
    }
  };

  const activeGroup = activeGroupDragId ? sortedGroups.find((group) => group.id === activeGroupDragId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleGroupSortStart}
      onDragEnd={handleGroupSortEnd}
      onDragCancel={() => {
        setActiveGroupDragId(null);
        handleGroupDragEnd();
      }}
    >
      <SortableContext items={groupIds} strategy={verticalListSortingStrategy}>
        {sortedGroups.map((group) => (
          <SortableGroupItem
            key={group.id}
            group={group}
            sessions={sessionsByGroupId.get(group.id) || []}
            dragOverId={dragOverId}
            groupDropIndicator={groupDropIndicator}
            isDragging={isDragging}
            handleGroupDragOver={handleGroupDragOver}
            onGroupDragStart={handleGroupDragStart}
            onGroupDragEnd={handleGroupDragEnd}
            onReorderGroups={onReorderGroups}
            onToggleGroupExpansion={onToggleGroupExpansion}
            onNewChatInGroup={(groupId) => {
              onNewChatInGroup(groupId);
              if (window.innerWidth < DESKTOP_BREAKPOINT_PX) onAutoClose();
            }}
            handleGroupStartEdit={handleGroupStartEdit}
            handleDrop={handleDrop}
            handleDragOver={handleDragOver}
            onDeleteGroup={onDeleteGroup}
            onClearGroup={onClearGroup}
            {...sessionItemProps}
          />
        ))}
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeGroup ? (
          <div className="rounded-lg border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] shadow-xl px-3 py-2 text-sm font-semibold opacity-90">
            {activeGroup.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
