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
import { useResizeDrag } from '@/hooks/ui/useResizeDrag';
import { getChatInputMinHeight, getCompactChatInputMinHeight } from './chatInputSizing';
// useTimer optional: if project has no such hook, wrap window.setTimeout, key is ignored
const CHAT_INPUT_EXPANDED_MAX_HEIGHT = 'max(220px, 50vh)';
const CHAT_INPUT_COLLAPSED_MAX_HEIGHT = 'max(220px, 40vh)';
const HEIGHT_TRANSITION_MS = 260;
const STEP = 16;
type Options = {
  fontSize: number;
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  focusEditor: () => void;
  minHeight?: number;
  setTimeoutTimer?: (timerKey: string, callback: () => void, ms: number) => void;
};
function getViewportRelativeHeightPx(minHeightPx: number, ratio: number) {
  return Math.max(minHeightPx, Math.round(window.innerHeight * ratio));
}
function getExpandedHeightPx(minHeightPx: number) {
  return Math.max(minHeightPx, getViewportRelativeHeightPx(220, 0.5));
}
function clampHeight(height: number, minHeightPx: number, maxHeightPx: number) {
  return Math.min(maxHeightPx, Math.max(minHeightPx, Math.round(height)));
}
function getCollapsedHeightPx(frame: HTMLDivElement, minHeightPx: number) {
  const textarea = frame.querySelector(
    'textarea[data-chat-input-textarea="true"], .composer-tiptap',
  ) as HTMLElement | null;
  let collapsedHeight = frame.scrollHeight || minHeightPx;
  const maxCollapsed = getViewportRelativeHeightPx(220, 0.4);
  if (textarea) {
    const prevHeight = textarea.style.height;
    const prevMaxHeight = textarea.style.maxHeight;
    try {
      textarea.style.height = 'auto';
      textarea.style.maxHeight = 'none';
      collapsedHeight = textarea.scrollHeight || collapsedHeight;
    } finally {
      textarea.style.height = prevHeight;
      textarea.style.maxHeight = prevMaxHeight;
    }
  }
  return Math.max(minHeightPx, Math.min(collapsedHeight, maxCollapsed));
}
export interface ChatInputEditorContentStyle extends CSSProperties {
  '--composer-editor-padding'?: string;
  '--composer-editor-min-height'?: string;
  '--composer-editor-font-size'?: string;
  '--composer-editor-line-height'?: string;
  '--composer-editor-max-height'?: string;
  '--composer-editor-overflow-y'?: 'auto' | 'hidden';
  '--composer-editor-height'?: 'auto' | '100%';
}

function getEditorContentStyle(
  fontSize: number,
  isExpanded: boolean,
  manual: number | null,
  compact = false,
  minHeightOverride?: number,
): ChatInputEditorContentStyle {
  const minHeight =
    minHeightOverride ?? (compact ? getCompactChatInputMinHeight(fontSize) : getChatInputMinHeight(fontSize));
  const hasCustom = isExpanded || manual !== null;
  const isFixed = compact || hasCustom;
  const maxHeight = compact
    ? `${minHeight}px`
    : isExpanded
      ? CHAT_INPUT_EXPANDED_MAX_HEIGHT
      : manual !== null
        ? `${manual}px`
        : CHAT_INPUT_COLLAPSED_MAX_HEIGHT;
  return {
    height: compact ? minHeight : hasCustom ? '100%' : undefined,
    minHeight,
    '--composer-editor-padding': compact ? '3px 0' : minHeightOverride !== undefined ? '2px 0' : '6px 44px 0 15px',
    '--composer-editor-min-height': `${minHeight}px`,
    '--composer-editor-font-size': `${fontSize}px`,
    '--composer-editor-line-height': '1.4',
    '--composer-editor-max-height': maxHeight,
    '--composer-editor-overflow-y': compact ? 'hidden' : 'auto',
    '--composer-editor-height': isFixed ? '100%' : 'auto',
  };
}
const EDITOR_ELEMENT_STYLE = [
  'max-height: var(--composer-editor-max-height) !important',
  'overflow-y: var(--composer-editor-overflow-y)',
  'height: var(--composer-editor-height)',
].join('; ');
export function useChatInputExpandSizing({
  fontSize,
  isExpanded,
  onExpandedChange,
  focusEditor,
  minHeight: minHeightProp,
  setTimeoutTimer,
}: Options) {
  const minHeight = minHeightProp ?? getChatInputMinHeight(fontSize);
  const compactMinHeight = getCompactChatInputMinHeight(fontSize);
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const maxHeight = useMemo(
    () => Math.max(minHeight, Math.max(220, Math.round(viewportHeight * 0.5))),
    [minHeight, viewportHeight],
  );
  const frameRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<number | null>(null);
  const pendingRef = useRef<boolean | null>(null);
  const dragRef = useRef({ startClientY: 0, startHeight: 0, collapseExpanded: false });
  const [animatedHeight, setAnimatedHeight] = useState<string | null>(null);
  const [manualHeight, setManualHeight] = useState<number | null>(null);
  const isAnimating = animatedHeight !== null;
  const hasCustomHeight = isExpanded || manualHeight !== null || isAnimating;
  const clearAnim = useCallback(() => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, []);
  const clearAfter = useCallback(() => {
    const finishAnimation = () => {
      setAnimatedHeight(null);
      pendingRef.current = null;
    };
    if (setTimeoutTimer) setTimeoutTimer('chatInputFrame', finishAnimation, HEIGHT_TRANSITION_MS + 80);
    else window.setTimeout(finishAnimation, HEIGHT_TRANSITION_MS + 80);
  }, [setTimeoutTimer]);
  const getCurrentHeight = useCallback(
    () => frameRef.current?.offsetHeight ?? (isExpanded ? maxHeight : (manualHeight ?? minHeight)),
    [isExpanded, manualHeight, maxHeight, minHeight],
  );
  const setClamped = useCallback(
    (height: number) => {
      clearAnim();
      pendingRef.current = null;
      setAnimatedHeight(null);
      if (height <= minHeight + 4) {
        setManualHeight(null);
      } else {
        setManualHeight(clampHeight(height, minHeight, maxHeight));
      }
    },
    [clearAnim, maxHeight, minHeight],
  );
  const handleResizeMove = useCallback(
    (event: MouseEvent) => {
      const drag = dragRef.current;
      if (drag.collapseExpanded) {
        drag.collapseExpanded = false;
        onExpandedChange(false);
      }
      setClamped(drag.startHeight + drag.startClientY - event.clientY);
    },
    [onExpandedChange, setClamped],
  );
  const { isResizing, startResizing } = useResizeDrag({ onMove: handleResizeMove, cursor: 'row-resize' });
  const startResize = useCallback(
    (event: ReactMouseEvent) => {
      dragRef.current = { startClientY: event.clientY, startHeight: getCurrentHeight(), collapseExpanded: isExpanded };
      startResizing(event);
    },
    [getCurrentHeight, isExpanded, startResizing],
  );
  const handleResizeKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      const currentHeight = getCurrentHeight();
      let targetHeight: number | null = null;
      switch (event.key) {
        case 'ArrowUp':
          targetHeight = currentHeight + STEP;
          break;
        case 'ArrowDown':
          targetHeight = currentHeight - STEP;
          break;
        case 'Home':
          targetHeight = minHeight;
          break;
        case 'End':
          targetHeight = maxHeight;
          break;
      }
      if (targetHeight === null) return;
      event.preventDefault();
      if (isExpanded) onExpandedChange(false);
      setClamped(targetHeight);
    },
    [getCurrentHeight, isExpanded, maxHeight, minHeight, onExpandedChange, setClamped],
  );
  const toggleExpanded = useCallback(
    (next?: boolean) => {
      const targetExpanded = typeof next === 'boolean' ? next : !isExpanded;
      const frame = frameRef.current;
      if (frame) {
        clearAnim();
        setAnimatedHeight(`${frame.offsetHeight || minHeight}px`);
        pendingRef.current = targetExpanded;
      }
      if (!targetExpanded) setManualHeight(null);
      onExpandedChange(targetExpanded);
      focusEditor();
    },
    [clearAnim, focusEditor, isExpanded, minHeight, onExpandedChange],
  );
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || pendingRef.current !== isExpanded) return;
    const targetHeight = isExpanded ? getExpandedHeightPx(minHeight) : getCollapsedHeightPx(frame, minHeight);
    clearAnim();
    animRef.current = requestAnimationFrame(() => {
      setAnimatedHeight(`${targetHeight}px`);
      animRef.current = null;
    });
    clearAfter();
  }, [clearAfter, clearAnim, isExpanded, minHeight]);
  useEffect(() => clearAnim, [clearAnim]);
  const handleTransitionEnd = useCallback((event: ReactTransitionEvent<HTMLDivElement>) => {
    if (event.propertyName && event.propertyName !== 'height') return;
    setAnimatedHeight(null);
    pendingRef.current = null;
  }, []);
  const restoreDefaultHeight = useCallback(() => {
    const frame = frameRef.current;
    clearAnim();
    pendingRef.current = null;
    if (!frame) {
      setManualHeight(null);
      onExpandedChange(false);
      focusEditor();
      return;
    }
    const startHeight = frame.offsetHeight || getCurrentHeight();
    const targetHeight = getCollapsedHeightPx(frame, minHeight);
    setAnimatedHeight(`${startHeight}px`);
    animRef.current = requestAnimationFrame(() => {
      setManualHeight(null);
      onExpandedChange(false);
      setAnimatedHeight(`${targetHeight}px`);
      animRef.current = null;
    });
    clearAfter();
    focusEditor();
  }, [clearAfter, clearAnim, focusEditor, getCurrentHeight, minHeight, onExpandedChange]);
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
  const compactFrameStyle = useMemo<CSSProperties>(
    () => ({ height: compactMinHeight, minHeight: compactMinHeight, overflow: 'hidden', transitionDuration: '0ms' }),
    [compactMinHeight],
  );
  const editorContentStyle = useMemo(
    () => getEditorContentStyle(fontSize, isExpanded || isAnimating, manualHeight, false, minHeightProp),
    [fontSize, isExpanded, isAnimating, manualHeight, minHeightProp],
  );
  const compactEditorContentStyle = useMemo(() => getEditorContentStyle(fontSize, false, null, true), [fontSize]);
  return {
    frameRef,
    frameStyle,
    compactFrameStyle,
    editorContentStyle,
    compactEditorContentStyle,
    editorElementStyle: EDITOR_ELEMENT_STYLE,
    minHeight,
    maxHeight,
    isResizing,
    startResize,
    handleResizeKeyDown,
    handleTransitionEnd,
    toggleExpanded,
    restoreDefaultHeight,
    hasCustomHeight,
    resizeHandleValue: isExpanded ? maxHeight : (manualHeight ?? minHeight),
  };
}
