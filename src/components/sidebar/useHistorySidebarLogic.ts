import { useCallback, useState, useEffect } from 'react';
import type { SavedChatSession, ChatGroup } from '@/types';
import { useWindowContext } from '@/contexts/WindowContext';
import { useI18n } from '@/contexts/I18nContext';
import { DESKTOP_BREAKPOINT_PX } from '@/constants/layout';
import type { HistoryDisplayMode } from '@/stores/uiStore';
import { useSidebarRenameAndMenu } from './useSidebarRenameAndMenu';
import { useSidebarDragAndDrop } from './useSidebarDragAndDrop';
import { useSidebarAutoTitle } from './useSidebarAutoTitle';
import { useSidebarSearchAndFilter } from './useSidebarSearchAndFilter';

export type { HistoryDisplayMode };

interface UseHistorySidebarLogicProps {
  isOpen: boolean;
  onToggle: () => void;
  onAutoClose: () => void;
  sessions: SavedChatSession[];
  groups: ChatGroup[];
  generatingTitleSessionIds: Set<string>;
  displayMode?: HistoryDisplayMode;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  onRenameGroup: (groupId: string, newTitle: string) => void;
  onMoveSessionToGroup: (sessionId: string, groupId: string | null, placement?: 'top' | 'end') => void;
  onSelectSession: (sessionId: string) => void;
  onRegenerateTitleSession?: (sessionId: string) => void | Promise<void>;
}

export const useHistorySidebarLogic = ({
  isOpen,
  onToggle,
  onAutoClose,
  sessions,
  groups,
  generatingTitleSessionIds,
  displayMode = 'group',
  onRenameSession,
  onRenameGroup,
  onMoveSessionToGroup,
  onSelectSession,
  onRegenerateTitleSession: onRegenerateTitleSessionProp,
}: UseHistorySidebarLogicProps) => {
  const { t, language } = useI18n();
  const { window: targetWindow } = useWindowContext();

  const {
    editingItem,
    setEditingItem,
    activeMenu,
    setActiveMenu,
    menuRef,
    editInputRef,
    handleStartEdit,
    handleRenameConfirm,
    handleRenameCancel,
    handleRenameKeyDown,
    toggleMenu,
  } = useSidebarRenameAndMenu({
    onRenameSession,
    onRenameGroup,
  });

  const {
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
  } = useSidebarDragAndDrop({
    sessions,
    onMoveSessionToGroup,
  });

  const { newlyTitledSessionIds, handleRegenerateTitle } = useSidebarAutoTitle({
    sessions,
    generatingTitleSessionIds,
    language,
    t,
    onRegenerateTitleSessionProp,
  });

  const {
    searchQuery,
    setSearchQuery,
    isSearching,
    setIsSearching,
    searchInputRef,
    filteredSessions,
    sessionsByGroupId,
    sortedGroups,
    categorizedUngroupedSessions,
    unpinnedUngroupedSessions,
    categorizedTimeModePinned,
  } = useSidebarSearchAndFilter({
    isOpen,
    onToggle,
    sessions,
    groups,
    displayMode,
    language,
    t,
  });

  const [searchOnExpand, setSearchOnExpand] = useState(false);

  const handleMiniSearchClick = useCallback(() => {
    onToggle();
    setIsSearching(true);
    setSearchOnExpand(true);
  }, [onToggle, setIsSearching]);

  useEffect(() => {
    if (!isOpen || !searchOnExpand) {
      return undefined;
    }
    const timer = targetWindow.setTimeout(() => {
      searchInputRef.current?.focus({ preventScroll: true });
      setSearchOnExpand(false);
    }, 300);
    return () => targetWindow.clearTimeout(timer);
  }, [isOpen, searchOnExpand, searchInputRef, targetWindow]);

  const handleEmptySpaceClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) {
        onToggle();
      }
    },
    [onToggle],
  );

  const handleSessionSelect = useCallback(
    (sessionId: string) => {
      onSelectSession(sessionId);
      if (targetWindow.innerWidth < DESKTOP_BREAKPOINT_PX) {
        onAutoClose();
      }
    },
    [onAutoClose, onSelectSession, targetWindow],
  );

  return {
    searchQuery,
    setSearchQuery,
    isSearching,
    setIsSearching,
    editingItem,
    setEditingItem,
    activeMenu,
    setActiveMenu,
    dragOverId,
    setDragOverId,
    draggingSessionId,
    setDraggingSessionId,
    draggingGroupId,
    setDraggingGroupId,
    sessionDropIndicator,
    groupDropIndicator,
    isDragging,
    newlyTitledSessionIds,
    menuRef,
    editInputRef,
    searchInputRef,
    filteredSessions,
    sessionsByGroupId,
    sortedGroups,
    categorizedUngroupedSessions,
    unpinnedUngroupedSessions,
    categorizedTimeModePinned,
    handleStartEdit,
    handleRenameConfirm,
    handleRenameCancel,
    handleRenameKeyDown,
    toggleMenu,
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
    handleMiniSearchClick,
    handleEmptySpaceClick,
    handleSessionSelect,
    handleRegenerateTitle,
    searchOnExpand,
  };
};
