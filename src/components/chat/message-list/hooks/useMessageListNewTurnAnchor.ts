import { useCallback, useEffect, useRef } from 'react';
import type { VirtuosoHandle } from 'react-virtuoso';
import type { ChatMessage } from '@/types';
import { ANCHOR_SCROLL_DELAY_MS } from './messageScrollSnapshot';

interface UseMessageListNewTurnAnchorOptions {
  messages: ChatMessage[];
  activeSessionId: string | null;
  lastRestoredSessionIdRef: { current: string | null };
  atBottomRef: { current: boolean };
  virtuosoRef: { current: VirtuosoHandle | null };
  lastScrollTarget: { current: number | null };
  activeSessionIdRef: { current: string | null };
}

export const useMessageListNewTurnAnchor = ({
  messages,
  activeSessionId,
  lastRestoredSessionIdRef,
  atBottomRef,
  virtuosoRef,
  lastScrollTarget,
  activeSessionIdRef,
}: UseMessageListNewTurnAnchorOptions) => {
  const anchorTimeoutRef = useRef<number | null>(null);
  const prevMsgCount = useRef(messages.length);
  const prevSessionIdForAnchor = useRef(activeSessionId);

  const clearAnchorTimeout = useCallback(() => {
    if (anchorTimeoutRef.current !== null) {
      clearTimeout(anchorTimeoutRef.current);
      anchorTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const sessionChanged = prevSessionIdForAnchor.current !== activeSessionId;
    const restorationPending = lastRestoredSessionIdRef.current !== activeSessionId;

    if (sessionChanged || restorationPending) {
      prevSessionIdForAnchor.current = activeSessionId;
      prevMsgCount.current = messages.length;
      return;
    }

    if (messages.length > prevMsgCount.current) {
      let targetIndex = -1;
      for (let index = messages.length - 1; index >= Math.max(0, prevMsgCount.current - 1); index--) {
        if (messages[index].role === 'model') {
          targetIndex = index;
          break;
        }
      }

      if (targetIndex !== -1) {
        if (atBottomRef.current) {
          const sessionIdForScroll = activeSessionId;
          clearAnchorTimeout();
          anchorTimeoutRef.current = window.setTimeout(() => {
            anchorTimeoutRef.current = null;
            if (activeSessionIdRef.current !== sessionIdForScroll) return;
            if (!atBottomRef.current) return;
            virtuosoRef.current?.scrollToIndex({
              index: targetIndex,
              align: 'start',
              behavior: 'smooth',
            });
            lastScrollTarget.current = targetIndex;
          }, ANCHOR_SCROLL_DELAY_MS);
        }
      }
    }
    prevMsgCount.current = messages.length;
  }, [
    messages,
    activeSessionId,
    clearAnchorTimeout,
    atBottomRef,
    lastRestoredSessionIdRef,
    activeSessionIdRef,
    virtuosoRef,
    lastScrollTarget,
  ]);

  useEffect(() => {
    return () => {
      clearAnchorTimeout();
    };
  }, [clearAnchorTimeout]);

  return {
    clearAnchorTimeout,
  };
};
