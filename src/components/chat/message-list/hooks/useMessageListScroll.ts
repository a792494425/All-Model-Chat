import { useRef, useState, useCallback, useEffect } from 'react';
import type { VirtuosoHandle } from 'react-virtuoso';
import type { ChatMessage } from '@/types';
import { useMessageListBottomLock } from './useMessageListBottomLock';
import { useMessageListTurnNavigation } from './useMessageListTurnNavigation';
import { useMessageListScrollRestoration } from './useMessageListScrollRestoration';
import { useMessageListNewTurnAnchor } from './useMessageListNewTurnAnchor';

interface UseMessageListScrollProps {
  messages: ChatMessage[];
  setScrollContainerRef: (node: HTMLDivElement | null) => void;
  activeSessionId: string | null;
}

export const useMessageListScroll = ({
  messages,
  setScrollContainerRef,
  activeSessionId,
}: UseMessageListScrollProps) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const scrollerElementRef = useRef<HTMLElement | null>(null);
  const [atBottom, setAtBottomState] = useState(true);
  const atBottomRef = useRef(true);
  const setAtBottom = useCallback((value: boolean) => {
    atBottomRef.current = value;
    setAtBottomState(value);
  }, []);

  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const [scrollerRef, setInternalScrollerRef] = useState<HTMLElement | null>(null);
  const visibleRangeRef = useRef({ startIndex: 0, endIndex: 0 });

  const activeSessionIdRef = useRef(activeSessionId);
  const lastScrollTarget = useRef<number | null>(null);

  const { scrollToRealBottom, handleTotalListHeightChanged, detachListeners, resetBottomLock } =
    useMessageListBottomLock({
      scrollerElementRef,
      virtuosoRef,
    });

  const lastMsg = messages[messages.length - 1];
  const isLastMessageLoading = lastMsg?.role === 'model' && Boolean(lastMsg?.isLoading);
  const prevIsLastMessageLoadingRef = useRef(isLastMessageLoading);

  useEffect(() => {
    if (prevIsLastMessageLoadingRef.current && !isLastMessageLoading) {
      if (atBottomRef.current) {
        scrollToRealBottom();
      }
    }
    prevIsLastMessageLoadingRef.current = isLastMessageLoading;
  }, [isLastMessageLoading, scrollToRealBottom]);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
    resetBottomLock();
  }, [activeSessionId, resetBottomLock]);

  const onRangeChanged = useCallback(({ startIndex, endIndex }: { startIndex: number; endIndex: number }) => {
    visibleRangeRef.current = { startIndex, endIndex };
    setVisibleStartIndex(startIndex);
  }, []);

  const handleScrollerRef = useCallback(
    (ref: Window | HTMLElement | null) => {
      if (ref === null || ref instanceof HTMLElement) {
        if (scrollerElementRef.current !== ref) {
          detachListeners();
        }
        scrollerElementRef.current = ref;
        setInternalScrollerRef(ref);
        setScrollContainerRef(ref as HTMLDivElement | null);
      }
    },
    [detachListeners, setScrollContainerRef],
  );

  const { handleScroll, lastRestoredSessionIdRef } = useMessageListScrollRestoration({
    activeSessionId,
    messages,
    scrollerRef,
    virtuosoRef,
    scrollToRealBottom,
  });

  const { clearAnchorTimeout } = useMessageListNewTurnAnchor({
    messages,
    activeSessionId,
    lastRestoredSessionIdRef,
    atBottomRef,
    virtuosoRef,
    lastScrollTarget,
    activeSessionIdRef,
  });

  const { scrollToPrevTurn, scrollToNextTurn, scrollToTop, scrollToBottom, showScrollDown, showScrollUp } =
    useMessageListTurnNavigation({
      messages,
      scrollerRef,
      virtuosoRef,
      visibleRangeRef,
      visibleStartIndex,
      atBottom,
      lastScrollTarget,
      clearAnchorTimeout,
      scrollToRealBottom,
    });

  useEffect(() => {
    return () => {
      detachListeners();
    };
  }, [detachListeners]);

  return {
    virtuosoRef,
    handleScrollerRef,
    setAtBottom,
    onRangeChanged,
    handleTotalListHeightChanged,
    scrollToPrevTurn,
    scrollToNextTurn,
    scrollToTop,
    scrollToBottom,
    showScrollDown,
    showScrollUp,
    scrollerRef,
    handleScroll,
  };
};
