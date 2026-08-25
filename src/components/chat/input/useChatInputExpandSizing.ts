import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type TransitionEvent as ReactTransitionEvent,
} from 'react';
import { useResizeDrag } from '@/hooks/useResizeDrag';

const CHAT_INPUT_EXPANDED_MAX_HEIGHT = 'max(220px, 50vh)';

const HEIGHT_TRANSITION_MS = 260;
const RESIZE_KEYBOARD_STEP = 16;

type Options = {
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  focusEditor: () => void;
  minHeight: number;
};

function getViewportRelativeHeightPx(minH: number, ratio: number) {
  return Math.max(minH, Math.round(window.innerHeight * ratio));
}

function getExpandedHeightPx(minH: number) {
  return Math.max(minH, getViewportRelativeHeightPx(220, 0.5));
}

function clampHeight(height: number, minH: number, maxH: number) {
  return Math.min(maxH, Math.max(minH, Math.round(height)));
}

function getCollapsedHeightPx(frame: HTMLDivElement, minH: number) {
  // For AMC the frame wraps the textarea; collapsed height should be natural content height capped at 40vh.
  const maxCollapsed = getViewportRelativeHeightPx(220, 0.4);
  // Try to read scrollHeight from textarea inside frame.
  const textarea = frame.querySelector('textarea[data-chat-input-textarea="true"]') as HTMLElement | null;
  if (textarea) {
    // Temporarily reset height to measure natural height.
    const prevHeight = textarea.style.height;
    try {
      textarea.style.height = 'auto';
      const contentHeight = textarea.scrollHeight || minH;
      return Math.max(minH, Math.min(contentHeight, maxCollapsed));
    } finally {
      textarea.style.height = prevHeight;
    }
  }
  const contentHeight = frame.scrollHeight || minH;
  return Math.max(minH, Math.min(contentHeight, maxCollapsed));
}

export function useChatInputExpandSizing({ isExpanded, onExpandedChange, focusEditor, minHeight }: Options) {
  const maxHeight = useMemo(() => getExpandedHeightPx(minHeight), [minHeight]);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pendingExpandedRef = useRef<boolean | null>(null);
  const resizeDragRef = useRef({ startClientY: 0, startHeight: 0, collapseExpanded: false });
  const [animatedHeight, setAnimatedHeight] = useState<string | null>(null);
  const [manualHeight, setManualHeight] = useState<number | null>(null);

  const hasManualHeight = manualHeight !== null;
  const hasCustomHeight = isExpanded || hasManualHeight;

  const clearAnimationFrame = useCallback(() => {
    if (animationFrameRef.current === null) return;
    window.cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
  }, []);

  const clearAnimatedHeightAfterTransition = useCallback(() => {
    window.setTimeout(() => {
      setAnimatedHeight(null);
      pendingExpandedRef.current = null;
    }, HEIGHT_TRANSITION_MS + 80);
  }, []);

  const getCurrentHeight = useCallback(() => {
    const measured = frameRef.current?.offsetHeight;
    if (measured) return measured;
    if (isExpanded) return maxHeight;
    return manualHeight ?? minHeight;
  }, [isExpanded, manualHeight, maxHeight, minHeight]);

  const setClampedManualHeight = useCallback(
    (height: number) => {
      clearAnimationFrame();
      pendingExpandedRef.current = null;
      setAnimatedHeight(null);
      setManualHeight(clampHeight(height, minHeight, maxHeight));
    },
    [clearAnimationFrame, maxHeight, minHeight],
  );

  const handleResizeMove = useCallback(
    (moveEvent: MouseEvent) => {
      const dragState = resizeDragRef.current;
      if (dragState.collapseExpanded) {
        dragState.collapseExpanded = false;
        onExpandedChange(false);
      }
      setClampedManualHeight(dragState.startHeight + dragState.startClientY - moveEvent.clientY);
    },
    [onExpandedChange, setClampedManualHeight],
  );

  const { isResizing, startResizing } = useResizeDrag({ onMove: handleResizeMove, cursor: 'row-resize' });

  const startResize = useCallback(
    (event: ReactMouseEvent) => {
      resizeDragRef.current = {
        startClientY: event.clientY,
        startHeight: getCurrentHeight(),
        collapseExpanded: isExpanded,
      };
      startResizing(event);
    },
    [getCurrentHeight, isExpanded, startResizing],
  );

  const handleResizeKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      const currentHeight = getCurrentHeight();
      let nextHeight: number | null = null;
      switch (event.key) {
        case 'ArrowUp':
          nextHeight = currentHeight + RESIZE_KEYBOARD_STEP;
          break;
        case 'ArrowDown':
          nextHeight = currentHeight - RESIZE_KEYBOARD_STEP;
          break;
        case 'Home':
          nextHeight = minHeight;
          break;
        case 'End':
          nextHeight = maxHeight;
          break;
      }
      if (nextHeight === null) return;
      event.preventDefault();
      if (isExpanded) onExpandedChange(false);
      setClampedManualHeight(nextHeight);
    },
    [getCurrentHeight, isExpanded, maxHeight, minHeight, onExpandedChange, setClampedManualHeight],
  );

  const toggleExpanded = useCallback(
    (nextState?: boolean) => {
      const target = typeof nextState === 'boolean' ? nextState : !isExpanded;
      const frame = frameRef.current;
      if (frame) {
        clearAnimationFrame();
        setAnimatedHeight(`${frame.offsetHeight || minHeight}px`);
        pendingExpandedRef.current = target;
      }
      if (!target) setManualHeight(null);
      onExpandedChange(target);
      focusEditor();
    },
    [clearAnimationFrame, focusEditor, isExpanded, minHeight, onExpandedChange],
  );

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || pendingExpandedRef.current !== isExpanded) return;
    const targetHeight = isExpanded ? getExpandedHeightPx(minHeight) : getCollapsedHeightPx(frame, minHeight);
    clearAnimationFrame();
    animationFrameRef.current = window.requestAnimationFrame(() => {
      setAnimatedHeight(`${targetHeight}px`);
      animationFrameRef.current = null;
    });
    clearAnimatedHeightAfterTransition();
  }, [clearAnimatedHeightAfterTransition, clearAnimationFrame, isExpanded, minHeight]);

  useEffect(() => clearAnimationFrame, [clearAnimationFrame]);

  const handleTransitionEnd = useCallback((event: ReactTransitionEvent<HTMLDivElement>) => {
    if (event.propertyName && event.propertyName !== 'height') return;
    setAnimatedHeight(null);
    pendingExpandedRef.current = null;
  }, []);

  const resolvedFrameHeight =
    animatedHeight ??
    (isExpanded ? CHAT_INPUT_EXPANDED_MAX_HEIGHT : manualHeight !== null ? `${manualHeight}px` : undefined);

  const frameStyle = useMemo<CSSProperties>(
    () => ({
      height: resolvedFrameHeight,
      minHeight,
      overflow: 'hidden',
      transition: isResizing ? 'none' : `height ${HEIGHT_TRANSITION_MS}ms cubic-bezier(0, 0, 0.2, 1)`,
    }),
    [isResizing, minHeight, resolvedFrameHeight],
  );

  return {
    frameRef,
    frameStyle,
    isResizing,
    startResize,
    handleResizeKeyDown,
    handleTransitionEnd,
    toggleExpanded,
    hasCustomHeight,
    maxHeight,
    minHeight,
    resizeHandleValue: isExpanded ? maxHeight : (manualHeight ?? minHeight),
  };
}
