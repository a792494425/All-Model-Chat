import React from 'react';
import { type ChatGroup, type SavedChatSession } from '@/types';
import { ContextMenuContent } from '@/components/shared/ContextMenu';
import { SessionMenuItems } from './SessionMenuItems';

export interface SessionItemContextMenuProps {
  session: SavedChatSession;
  groups: ChatGroup[];
  onMoveSessionToGroup: (sessionId: string, groupId: string | null) => void;
  onStartEdit: () => void;
  onTogglePin: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
  onRegenerateTitle?: () => void;
  isGeneratingTitle?: boolean;
}

export const SessionItemContextMenu: React.FC<SessionItemContextMenuProps> = ({
  session,
  groups,
  onMoveSessionToGroup,
  onStartEdit,
  onTogglePin,
  onDuplicate,
  onExport,
  onDelete,
  onRegenerateTitle,
  isGeneratingTitle = false,
}) => {
  const isStartingEditRef = React.useRef(false);

  const handleStartEdit = () => {
    isStartingEditRef.current = true;
    onStartEdit();
  };

  return (
    <ContextMenuContent
      className="w-52 p-1.5"
      onCloseAutoFocus={(event) => {
        if (isStartingEditRef.current) {
          event.preventDefault();
          isStartingEditRef.current = false;
        }
      }}
    >
      <SessionMenuItems
        variant="context"
        session={session}
        groups={groups}
        onMoveSessionToGroup={onMoveSessionToGroup}
        onStartEdit={handleStartEdit}
        onTogglePin={onTogglePin}
        onDuplicate={onDuplicate}
        onExport={onExport}
        onDelete={onDelete}
        onRegenerateTitle={onRegenerateTitle}
        isGeneratingTitle={isGeneratingTitle}
      />
    </ContextMenuContent>
  );
};
