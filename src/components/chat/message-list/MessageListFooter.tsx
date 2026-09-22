import React from 'react';
import { type ChatMessage } from '@/types';

interface MessageListFooterProps {
  messages?: ChatMessage[];
  chatInputHeight: number;
}

const getStableSpacerHeight = (chatInputHeight: number) => Math.ceil(chatInputHeight || 140) + 20;

export const MessageListFooter: React.FC<MessageListFooterProps> = React.memo(({ chatInputHeight }) => {
  const heightStyle: React.CSSProperties = {
    height: `${getStableSpacerHeight(chatInputHeight)}px`,
    overflowAnchor: 'none',
  };

  return <div style={heightStyle} data-testid="message-list-footer-spacer" />;
});
