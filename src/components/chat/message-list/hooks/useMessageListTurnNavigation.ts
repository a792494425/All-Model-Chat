import { useCallback } from 'react';
import type { VirtuosoHandle } from 'react-virtuoso';
import type { ChatMessage } from '@/types';
import { CURRENT_TURN_VIEWPORT_OFFSET_PX } from './messageScrollSnapshot';

interface UseMessageListTurnNavigationOptions {
  messages: ChatMessage[];
  scrollerRef: HTMLElement | null;
  virtuosoRef: { current: VirtuosoHandle | null };
  visibleRangeRef: { current: { startIndex: number; endIndex: number } | null };
  visibleStartIndex: number;
  atBottom: boolean;
  lastScrollTarget: { current: number | null };
  clearAnchorTimeout: () => void;
  scrollToRealBottom: (behavior?: 'auto' | 'smooth') => void;
}

export const useMessageListTurnNavigation = ({
  messages,
  scrollerRef,
  virtuosoRef,
  visibleRangeRef,
  visibleStartIndex,
  atBottom,
  lastScrollTarget,
  clearAnchorTimeout,
  scrollToRealBottom,
}: UseMessageListTurnNavigationOptions) => {
  const scrollToPrevTurn = useCallback(() => {
    clearAnchorTimeout();

    const currentStartIndex = visibleRangeRef.current?.startIndex ?? 0;
    let targetIndex = -1;

    for (let index = Math.max(0, currentStartIndex - 1); index >= 0; index--) {
      if (messages[index].role === 'user') {
        targetIndex = index;
        break;
      }
    }

    if (targetIndex !== -1) {
      lastScrollTarget.current = targetIndex;
      virtuosoRef.current?.scrollToIndex({ index: targetIndex, align: 'start', behavior: 'smooth' });
    } else {
      virtuosoRef.current?.scrollToIndex({ index: 0, align: 'start', behavior: 'smooth' });
    }
  }, [messages, clearAnchorTimeout, visibleRangeRef, lastScrollTarget, virtuosoRef]);

  const scrollToNextTurn = useCallback(() => {
    clearAnchorTimeout();

    const renderedTurnNavigation = (() => {
      if (!scrollerRef) {
        return null;
      }

      const messageIndexById = new Map(messages.map((message, index) => [message.id, index]));
      const viewportTop = scrollerRef.getBoundingClientRect().top;
      const currentTurnThreshold = viewportTop + CURRENT_TURN_VIEWPORT_OFFSET_PX;
      const renderedUserTurns = Array.from(
        scrollerRef.querySelectorAll<HTMLElement>('[data-message-role="user"][data-message-id]'),
      );

      let currentUserTurnIndex: number | null = null;
      let nextUserTurnIndex: number | null = null;

      for (const userTurnElement of renderedUserTurns) {
        const messageId = userTurnElement.dataset.messageId;
        if (!messageId) continue;

        const messageIndex = messageIndexById.get(messageId);
        if (messageIndex === undefined) continue;

        if (userTurnElement.getBoundingClientRect().top <= currentTurnThreshold) {
          currentUserTurnIndex = messageIndex;
          continue;
        }

        nextUserTurnIndex = messageIndex;
        break;
      }

      return { currentUserTurnIndex, nextUserTurnIndex };
    })();

    let targetIndex = -1;

    if (renderedTurnNavigation?.nextUserTurnIndex !== null && renderedTurnNavigation?.nextUserTurnIndex !== undefined) {
      targetIndex = renderedTurnNavigation.nextUserTurnIndex;
    } else {
      const currentStartIndex = visibleRangeRef.current?.startIndex ?? 0;
      const cursorIndex =
        renderedTurnNavigation?.currentUserTurnIndex ??
        (lastScrollTarget.current !== null && lastScrollTarget.current >= currentStartIndex
          ? lastScrollTarget.current
          : currentStartIndex);

      for (let index = cursorIndex + 1; index < messages.length; index++) {
        if (messages[index].role === 'user') {
          targetIndex = index;
          break;
        }
      }

      if (targetIndex === -1) {
        return;
      }
    }

    lastScrollTarget.current = targetIndex;
    virtuosoRef.current?.scrollToIndex({ index: targetIndex, align: 'start', behavior: 'smooth' });
  }, [messages, scrollerRef, clearAnchorTimeout, visibleRangeRef, lastScrollTarget, virtuosoRef]);

  const scrollToTop = useCallback(() => {
    if (messages.length === 0) {
      return;
    }

    clearAnchorTimeout();
    lastScrollTarget.current = 0;
    virtuosoRef.current?.scrollToIndex({ index: 0, align: 'start', behavior: 'smooth' });
  }, [messages.length, clearAnchorTimeout, lastScrollTarget, virtuosoRef]);

  const scrollToBottom = useCallback(() => {
    if (messages.length === 0) {
      return;
    }

    clearAnchorTimeout();
    lastScrollTarget.current = messages.length - 1;
    scrollToRealBottom('smooth');
  }, [messages.length, clearAnchorTimeout, lastScrollTarget, scrollToRealBottom]);

  const showScrollDown =
    !atBottom && messages.some((message, index) => index > visibleStartIndex && message.role === 'user');
  const showScrollUp = visibleStartIndex > 0;

  return {
    scrollToPrevTurn,
    scrollToNextTurn,
    scrollToTop,
    scrollToBottom,
    showScrollDown,
    showScrollUp,
  };
};
