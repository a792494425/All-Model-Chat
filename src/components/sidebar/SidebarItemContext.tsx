import { createContext, useContext, type RefObject } from 'react';
import type { ChatGroup, SavedChatSession } from '@/types';

export interface SidebarItemContextValue {
  activeSessionId: string | null;
  editingItem: { type: 'session' | 'group'; id: string; title: string } | null;
  activeMenu: string | null;
  loadingSessionIds: Set<string>;
  generatingTitleSessionIds: Set<string>;
  newlyTitledSessionIds: ReadonlySet<string>;
  groups: ChatGroup[];
  editInputRef: RefObject<HTMLInputElement>;
  menuRef: RefObject<HTMLDivElement>;
  onSelectSession: (sessionId: string) => void;
  onTogglePinSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onDuplicateSession: (sessionId: string) => void;
  onOpenExportModal: (sessionId?: string) => void | Promise<void>;
  onMoveSessionToGroup: (sessionId: string, groupId: string | null) => void;
  onRegenerateTitleSession?: (sessionId: string) => void;
  handleStartEdit: (item: SavedChatSession) => void;
  handleRenameConfirm: () => void;
  handleRenameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  setEditingItem: (item: { type: 'session' | 'group'; id: string; title: string } | null) => void;
  toggleMenu: (e: React.MouseEvent, id: string) => void;
  setActiveMenu: (id: string | null) => void;
  setDragOverId: (id: string | null) => void;
  draggingSessionId: string | null;
  draggingGroupId?: string | null;
  dropIndicator?: { id: string; position: 'before' | 'after'; willPin?: boolean } | null;
  onSessionDragStart: (sessionId: string) => void;
  onSessionDragEnd: () => void;
  onSessionDragOver?: (event: React.DragEvent, sessionId: string) => void;
  onSessionDropIndicatorClear?: () => void;
  onReorderSession?: (activeId: string, overId: string, position: 'before' | 'after') => void;
  /** 时间视图下关闭原生拖拽（含落点处理），避免"拖了但排不了"的错觉。 */
  disableNativeDrag?: boolean;
}

export const SidebarItemContext = createContext<SidebarItemContextValue | null>(null);

export const useSidebarItemContext = (): SidebarItemContextValue | null => {
  return useContext(SidebarItemContext);
};
