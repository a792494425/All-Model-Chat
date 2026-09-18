import { useCallback, useRef, type RefObject } from 'react';
import type { VirtuosoHandle } from 'react-virtuoso';
import { BOTTOM_LOCK_MS } from './messageScrollSnapshot';

interface UseMessageListBottomLockOptions {
  scrollerElementRef: RefObject<HTMLElement | null>;
  virtuosoRef: RefObject<VirtuosoHandle | null>;
}

export const useMessageListBottomLock = ({ scrollerElementRef, virtuosoRef }: UseMessageListBottomLockOptions) => {
  const bottomLockUntilRef = useRef(0);
  const detachBottomLockListenersRef = useRef<(() => void) | null>(null);
  const bottomLockPrevScrollTopRef = useRef(0);

  const cancelBottomLock = useCallback(() => {
    bottomLockUntilRef.current = 0;
  }, []);

  const handleBottomLockScroll = useCallback(() => {
    const scroller = scrollerElementRef.current;
    if (!scroller) return;
    const { scrollTop } = scroller;
    const movedUp = bottomLockPrevScrollTopRef.current - scrollTop > 10;
    bottomLockPrevScrollTopRef.current = scrollTop;
    if (!movedUp) return;
    if (scroller.scrollHeight - scroller.clientHeight - scrollTop > 40) {
      cancelBottomLock();
    }
  }, [cancelBottomLock, scrollerElementRef]);

  const activateBottomLockListeners = useCallback(() => {
    const scroller = scrollerElementRef.current;
    if (!scroller || detachBottomLockListenersRef.current) return;
    const options: AddEventListenerOptions = { capture: true, passive: true };
    scroller.addEventListener('wheel', cancelBottomLock, options);
    scroller.addEventListener('touchmove', cancelBottomLock, options);
    scroller.addEventListener('mousedown', cancelBottomLock, options);
    scroller.addEventListener('scroll', handleBottomLockScroll, options);
    detachBottomLockListenersRef.current = () => {
      scroller.removeEventListener('wheel', cancelBottomLock, options);
      scroller.removeEventListener('touchmove', cancelBottomLock, options);
      scroller.removeEventListener('mousedown', cancelBottomLock, options);
      scroller.removeEventListener('scroll', handleBottomLockScroll, options);
    };
  }, [cancelBottomLock, handleBottomLockScroll, scrollerElementRef]);

  const detachListeners = useCallback(() => {
    detachBottomLockListenersRef.current?.();
    detachBottomLockListenersRef.current = null;
  }, []);

  const scrollToRealBottom = useCallback(
    (behavior?: 'auto' | 'smooth') => {
      const scroller = scrollerElementRef.current;
      bottomLockUntilRef.current = Date.now() + BOTTOM_LOCK_MS;
      if (scroller) {
        bottomLockPrevScrollTopRef.current = scroller.scrollTop;
      }
      activateBottomLockListeners();
      if (scroller) {
        scroller.scrollTo(behavior ? { top: scroller.scrollHeight, behavior } : { top: scroller.scrollHeight });
        return;
      }
      virtuosoRef.current?.scrollToIndex(
        behavior ? { index: 'LAST', align: 'end', behavior } : { index: 'LAST', align: 'end' },
      );
    },
    [activateBottomLockListeners, scrollerElementRef, virtuosoRef],
  );

  const handleTotalListHeightChanged = useCallback(() => {
    if (Date.now() > bottomLockUntilRef.current) return;
    const scroller = scrollerElementRef.current;
    if (!scroller) return;
    if (scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop > 1) {
      scroller.scrollTo({ top: scroller.scrollHeight });
    }
  }, [scrollerElementRef]);

  const resetBottomLock = useCallback(() => {
    bottomLockUntilRef.current = 0;
  }, []);

  return {
    scrollToRealBottom,
    handleTotalListHeightChanged,
    detachListeners,
    resetBottomLock,
  };
};
