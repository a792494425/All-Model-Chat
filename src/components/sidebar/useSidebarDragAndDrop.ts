import { useState, useCallback } from 'react';
import type { SavedChatSession } from '@/types';
import { SESSION_DRAG_TYPE, isGroupDrag, isSessionDrag, resolveDropPosition } from './sidebarDragTypes';

interface UseSidebarDragAndDropProps {
  sessions: SavedChatSession[];
  onMoveSessionToGroup: (sessionId: string, groupId: string | null, placement?: 'top' | 'end') => void;
}

export const useSidebarDragAndDrop = ({ sessions, onMoveSessionToGroup }: UseSidebarDragAndDropProps) => {
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggingSessionId, setDraggingSessionId] = useState<string | null>(null);
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null);
  const [sessionDropIndicator, setSessionDropIndicator] = useState<{
    id: string;
    position: 'before' | 'after';
    willPin: boolean;
  } | null>(null);
  const [groupDropIndicator, setGroupDropIndicator] = useState<{
    id: string;
    position: 'before' | 'after';
  } | null>(null);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    if (!isSessionDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent, groupId: string | null) => {
      if (!isSessionDrag(event)) return;
      event.preventDefault();
      event.stopPropagation();
      const sessionId = event.dataTransfer.getData(SESSION_DRAG_TYPE);
      const isContainerDrop = groupId === 'all-conversations';
      const targetGroupId = isContainerDrop ? null : groupId;
      if (sessionId) onMoveSessionToGroup(sessionId, targetGroupId, isContainerDrop ? 'end' : 'top');
      setDragOverId(null);
      setDraggingSessionId(null);
    },
    [onMoveSessionToGroup],
  );

  const handleSessionDragStart = useCallback((sessionId: string) => {
    setDraggingSessionId(sessionId);
    setDraggingGroupId(null);
  }, []);

  const handleSessionDragEnd = useCallback(() => {
    setDraggingSessionId(null);
    setDragOverId(null);
    setSessionDropIndicator(null);
  }, []);

  const handleGroupDragStart = useCallback((groupId: string) => {
    setDraggingGroupId(groupId);
    setDraggingSessionId(null);
  }, []);

  const handleGroupDragEnd = useCallback(() => {
    setDraggingGroupId(null);
    setDragOverId(null);
    setGroupDropIndicator(null);
  }, []);

  const handleSessionDragOver = useCallback(
    (event: React.DragEvent, sessionId: string) => {
      if (!isSessionDrag(event)) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'move';
      const target = sessions.find((session) => session.id === sessionId);
      const dragging = draggingSessionId ? sessions.find((session) => session.id === draggingSessionId) : undefined;
      setSessionDropIndicator({
        id: sessionId,
        position: resolveDropPosition(event),
        willPin: Boolean(target?.isPinned && !dragging?.isPinned),
      });
      setDragOverId(null);
    },
    [draggingSessionId, sessions],
  );

  const handleSessionDropIndicatorClear = useCallback(() => {
    setSessionDropIndicator(null);
  }, []);

  const handleGroupDragOver = useCallback((event: React.DragEvent, groupId: string) => {
    if (!isGroupDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    setGroupDropIndicator({ id: groupId, position });
  }, []);

  const handleMainDragLeave = useCallback((event: React.DragEvent) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setDragOverId(null);
    setSessionDropIndicator(null);
    setGroupDropIndicator(null);
  }, []);

  const isDragging = Boolean(draggingSessionId || draggingGroupId);

  return {
    dragOverId,
    setDragOverId,
    draggingSessionId,
    setDraggingSessionId,
    draggingGroupId,
    setDraggingGroupId,
    sessionDropIndicator,
    groupDropIndicator,
    isDragging,
    handleDragOver,
    handleDrop,
    handleMainDragLeave,
    handleSessionDragStart,
    handleSessionDragEnd,
    handleGroupDragStart,
    handleGroupDragEnd,
    handleSessionDragOver,
    handleSessionDropIndicatorClear,
    handleGroupDragOver,
  };
};
