import React, { type RefObject } from 'react';
import { type ChatGroup, type SavedChatSession } from '@/types';
import { DropdownMenuContent } from '@/components/shared/DropdownMenu';
import { SessionMenuItems } from './SessionMenuItems';

export interface SessionItemMenuProps {
  session: SavedChatSession;
  menuRef?: RefObject<HTMLDivElement>;
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

export const SessionItemMenu: React.FC<SessionItemMenuProps> = ({
  session,
  menuRef,
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
    <DropdownMenuContent
      ref={menuRef}
      align="end"
      sideOffset={4}
      className="w-52 p-1.5"
      onClick={(event) => event.stopPropagation()}
      onCloseAutoFocus={(event) => {
        if (isStartingEditRef.current) {
          event.preventDefault();
          isStartingEditRef.current = false;
        }
      }}
    >
      <SessionMenuItems
        variant="dropdown"
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
    </DropdownMenuContent>
  );
};
