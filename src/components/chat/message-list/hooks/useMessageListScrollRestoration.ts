import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { VirtuosoHandle } from 'react-virtuoso';
import type { ChatMessage } from '@/types';
import { readPersistentStorageItem, writePersistentStorageItem } from '@/stores/persistentStorage';
import {
  createScrollSnapshot,
  getScrollStorageKey,
  parseStoredScrollSnapshot,
  RESTORE_SCROLL_DELAY_MS,
} from './messageScrollSnapshot';

interface UseMessageListScrollRestorationOptions {
  activeSessionId: string | null;
  messages: ChatMessage[];
  scrollerRef: HTMLElement | null;
  virtuosoRef: RefObject<VirtuosoHandle | null>;
  scrollToRealBottom: (behavior?: 'auto' | 'smooth') => void;
}

export const useMessageListScrollRestoration = ({
  activeSessionId,
  messages,
  scrollerRef,
  virtuosoRef,
  scrollToRealBottom,
}: UseMessageListScrollRestorationOptions) => {
  const scrollSaveTimeoutRef = useRef<number | null>(null);
  const lastPersistedSnapshotJsonRef = useRef<string | null>(null);
  const restoreTimeoutRef = useRef<number | null>(null);
  const lastRestoredSessionIdRef = useRef<string | null>(null);
  const activeSessionIdRef = useRef(activeSessionId);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
    lastPersistedSnapshotJsonRef.current = null;
  }, [activeSessionId]);

  const clearRestoreTimeout = useCallback(() => {
    if (restoreTimeoutRef.current !== null) {
      clearTimeout(restoreTimeoutRef.current);
      restoreTimeoutRef.current = null;
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (document.hidden) return;

    const container = scrollerRef;
    if (!container) return;
    if (!activeSessionId || lastRestoredSessionIdRef.current !== activeSessionId || messages.length === 0) return;

    const { scrollTop } = container;
    const snapshot = createScrollSnapshot(container) ?? { scrollTop: Math.max(0, Math.round(scrollTop)) };

    const serialized = JSON.stringify(snapshot);
    if (lastPersistedSnapshotJsonRef.current === serialized) {
      return;
    }

    if (scrollSaveTimeoutRef.current) {
      clearTimeout(scrollSaveTimeoutRef.current);
    }
    scrollSaveTimeoutRef.current = window.setTimeout(() => {
      scrollSaveTimeoutRef.current = null;
      lastPersistedSnapshotJsonRef.current = serialized;
      writePersistentStorageItem(getScrollStorageKey(activeSessionId), serialized);
    }, 300);
  }, [scrollerRef, activeSessionId, messages.length]);

  useEffect(() => {
    return () => {
      if (scrollSaveTimeoutRef.current) {
        clearTimeout(scrollSaveTimeoutRef.current);
      }
      clearRestoreTimeout();
    };
  }, [clearRestoreTimeout]);

  useEffect(() => {
    if (!activeSessionId) return;

    if (lastRestoredSessionIdRef.current !== activeSessionId) {
      if (messages.length > 0) {
        const savedSnapshot = parseStoredScrollSnapshot(
          readPersistentStorageItem(getScrollStorageKey(activeSessionId)),
        );
        const sessionIdForRestore = activeSessionId;
        clearRestoreTimeout();

        restoreTimeoutRef.current = window.setTimeout(() => {
          restoreTimeoutRef.current = null;
          if (activeSessionIdRef.current !== sessionIdForRestore) return;

          if (typeof savedSnapshot === 'number') {
            virtuosoRef.current?.scrollTo({ top: savedSnapshot });
          } else if (savedSnapshot) {
            if ('atBottom' in savedSnapshot) {
              scrollToRealBottom();
              lastRestoredSessionIdRef.current = sessionIdForRestore;
              return;
            }

            const targetIndex = messages.findIndex((message) => message.id === savedSnapshot.messageId);
            if (targetIndex >= 0) {
              virtuosoRef.current?.scrollToIndex({
                index: targetIndex,
                align: 'start',
                offset: -savedSnapshot.topOffset,
              });
            } else {
              virtuosoRef.current?.scrollTo({ top: savedSnapshot.scrollTop });
            }
          } else {
            scrollToRealBottom();
          }
          lastRestoredSessionIdRef.current = sessionIdForRestore;
        }, RESTORE_SCROLL_DELAY_MS);
      }
    }
  }, [activeSessionId, messages, clearRestoreTimeout, scrollToRealBottom, virtuosoRef]);

  return {
    handleScroll,
    lastRestoredSessionIdRef,
  };
};
