import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { resolveAskPanelDockSide, type AskPanelDockSide } from '@/utils/text-selection/askPanelDocking';
import { SELECTION_ASK_PANEL_SIZE_KEY } from '@/constants/storageKeys';
import { readPersistentStorageItem, writePersistentStorageItem } from '@/stores/persistentStorage';
import { safeJsonParse } from '@/utils/safeJsonParse';

const PANEL_DEFAULT_WIDTH = 560;
const PANEL_DEFAULT_HEIGHT = 420;
const PANEL_MIN_WIDTH = 340;
const PANEL_MIN_HEIGHT = 320;
const PANEL_MAX_HEIGHT_CAP = 520;
export const VIEWPORT_PADDING = 12;
export const DOCK_HANDLE_WIDTH = 22;
export const DOCK_HANDLE_HEIGHT = 56;
/** 指针位移小于该值视为单击而非拖拽，不触发贴边吸附 */
const DOCK_DRAG_MIN_MOVE = 6;
export const PANEL_Z_INDEX = 'z-[10000]';

export type PanelSize = { width: number; height: number };
export type ResizeDir = 'e' | 'w' | 'n' | 's' | 'se' | 'sw' | 'ne' | 'nw';

const clampSizeToViewport = (size: PanelSize, vw: number, vh: number): PanelSize => ({
  width: Math.max(PANEL_MIN_WIDTH, Math.min(size.width, vw - VIEWPORT_PADDING * 2)),
  height: Math.max(PANEL_MIN_HEIGHT, Math.min(size.height, vh - VIEWPORT_PADDING * 2, PANEL_MAX_HEIGHT_CAP)),
});

const readPersistedSize = (vw: number, vh: number): PanelSize | null => {
  const raw = readPersistentStorageItem(SELECTION_ASK_PANEL_SIZE_KEY);
  if (!raw) return null;
  const parsed = safeJsonParse<Partial<PanelSize> | null>(raw, null);
  if (!parsed || typeof parsed.width !== 'number' || typeof parsed.height !== 'number') return null;
  return clampSizeToViewport({ width: parsed.width, height: parsed.height }, vw, vh);
};

export interface UseAskPanelFloatingOptions {
  anchorRect: DOMRect | null;
  targetWindow: Window;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
}

export const useAskPanelFloating = ({ anchorRect, targetWindow, textareaRef }: UseAskPanelFloatingOptions) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<ResizeDir | null>(null);
  const [docked, setDocked] = useState<AskPanelDockSide | null>(null);
  const [dockedTop, setDockedTop] = useState(0);
  const [size, setSize] = useState<PanelSize>(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const persisted = readPersistedSize(vw, vh);
    if (persisted) return persisted;
    return {
      width: Math.min(PANEL_DEFAULT_WIDTH, vw - VIEWPORT_PADDING * 2),
      height: Math.min(PANEL_DEFAULT_HEIGHT, vh - VIEWPORT_PADDING * 2),
    };
  });

  const panelRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    pointerId?: number;
    capturedEl?: HTMLElement;
  } | null>(null);
  const resizeState = useRef<{
    dir: ResizeDir;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startTop: number;
    startLeft: number;
    pointerId: number;
    capturedEl: HTMLElement;
  } | null>(null);

  // 持久化尺寸
  useEffect(() => {
    writePersistentStorageItem(SELECTION_ASK_PANEL_SIZE_KEY, JSON.stringify(size));
  }, [size]);

  // 视口变化时 clamp 已持久化的尺寸
  useEffect(() => {
    const onResize = () => {
      setSize((prev) => clampSizeToViewport(prev, targetWindow.innerWidth, targetWindow.innerHeight));
    };
    targetWindow.addEventListener('resize', onResize);
    targetWindow.visualViewport?.addEventListener('resize', onResize);
    return () => {
      targetWindow.removeEventListener('resize', onResize);
      targetWindow.visualViewport?.removeEventListener('resize', onResize);
    };
  }, [targetWindow]);

  // Initial positioning — 用当前 size 的实际宽高
  useLayoutEffect(() => {
    const vw = targetWindow.innerWidth;
    const vh = targetWindow.innerHeight;
    const clampedSize = clampSizeToViewport(size, vw, vh);
    const width = clampedSize.width;
    const height = clampedSize.height;
    let top: number;
    let left: number;
    if (anchorRect) {
      const anchorCenterX = anchorRect.left + anchorRect.width / 2;
      left = Math.round(anchorCenterX - width / 2);
      top = Math.round(anchorRect.bottom + 12);
      if (top + height > vh - VIEWPORT_PADDING) {
        const flippedTop = anchorRect.top - height - 12;
        if (flippedTop >= VIEWPORT_PADDING) top = flippedTop;
        else top = vh - height - VIEWPORT_PADDING;
      }
    } else {
      left = Math.round((vw - width) / 2);
      top = Math.round((vh - height) / 2);
    }
    left = Math.max(VIEWPORT_PADDING, Math.min(left, vw - width - VIEWPORT_PADDING));
    top = Math.max(VIEWPORT_PADDING, Math.min(top, vh - height - VIEWPORT_PADDING));
    setPosition({ top, left });
    if (clampedSize.width !== size.width || clampedSize.height !== size.height) {
      setSize(clampedSize);
    }
    // 仅锚点/视口变化时重定位，size 变化不重定位
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reposition only on anchor/viewport changes; size updates must not reposition
  }, [anchorRect, targetWindow]);

  // Clamp position on resize。注意不能在 effect 里以 panelRef.current 为空提前 return：
  // 挂载时 position 还是 null、面板未渲染，提前返回会导致监听永远挂不上（面板渲染后 effect 不会重跑）。
  const isPanelRendered = position !== null && docked === null;
  useEffect(() => {
    if (!isPanelRendered) return;
    const clamp = () => {
      const el = panelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vw = targetWindow.innerWidth;
      const vh = targetWindow.innerHeight;
      setPosition((prev) => {
        if (!prev) return prev;
        let { top, left } = prev;
        if (left + rect.width > vw - VIEWPORT_PADDING) left = vw - rect.width - VIEWPORT_PADDING;
        if (top + rect.height > vh - VIEWPORT_PADDING) top = vh - rect.height - VIEWPORT_PADDING;
        if (left < VIEWPORT_PADDING) left = VIEWPORT_PADDING;
        if (top < VIEWPORT_PADDING) top = VIEWPORT_PADDING;
        if (left === prev.left && top === prev.top) return prev;
        return { top, left };
      });
    };
    clamp();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => clamp()) : null;
    if (panelRef.current) ro?.observe(panelRef.current);
    targetWindow.addEventListener('resize', clamp);
    targetWindow.visualViewport?.addEventListener('resize', clamp);
    return () => {
      ro?.disconnect();
      targetWindow.removeEventListener('resize', clamp);
      targetWindow.visualViewport?.removeEventListener('resize', clamp);
    };
  }, [isPanelRendered, targetWindow]);

  // 停靠状态下视口变化时，把手垂直位置重新 clamp
  useEffect(() => {
    if (!docked) return;
    const reclampHandle = () => {
      setDockedTop((prev) =>
        Math.round(
          Math.max(VIEWPORT_PADDING, Math.min(prev, targetWindow.innerHeight - size.height - VIEWPORT_PADDING)),
        ),
      );
    };
    targetWindow.addEventListener('resize', reclampHandle);
    targetWindow.visualViewport?.addEventListener('resize', reclampHandle);
    return () => {
      targetWindow.removeEventListener('resize', reclampHandle);
      targetWindow.visualViewport?.removeEventListener('resize', reclampHandle);
    };
  }, [docked, size.height, targetWindow]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // 拖拽柄是整个 header，但按钮点击必须优先 — 否则 header 抢走 pointer capture，按钮收不到 click
    const target = e.target as HTMLElement | null;
    if (target?.closest('button')) return;
    if (e.button !== 0) return;
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    dragState.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      startX: e.clientX,
      startY: e.clientY,
      pointerId: e.pointerId,
      capturedEl: e.currentTarget as HTMLElement,
    };
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragState.current || !isDragging) return;
      const vw = targetWindow.innerWidth;
      const vh = targetWindow.innerHeight;
      const el = panelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      let left = e.clientX - dragState.current.offsetX;
      let top = e.clientY - dragState.current.offsetY;
      left = Math.max(VIEWPORT_PADDING, Math.min(left, vw - rect.width - VIEWPORT_PADDING));
      top = Math.max(VIEWPORT_PADDING, Math.min(top, vh - rect.height - VIEWPORT_PADDING));
      setPosition({ top, left });
    },
    [isDragging, targetWindow],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      const st = dragState.current;
      if (st?.capturedEl && st.pointerId !== undefined) {
        try {
          st.capturedEl.releasePointerCapture(st.pointerId);
        } catch {
          // ignore
        }
      }
      // 位移过小说明是单击标题栏而非拖拽：面板恢复原位即可，不触发贴边吸附
      const moved = st ? Math.hypot(e.clientX - st.startX, e.clientY - st.startY) : Number.POSITIVE_INFINITY;
      dragState.current = null;
      setIsDragging(false);
      if (moved < DOCK_DRAG_MIN_MOVE) return;

      // 拖拽结束时贴边吸附
      const el = panelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const side = resolveAskPanelDockSide(rect.left, rect.right, targetWindow.innerWidth);
      if (!side) return;
      setDockedTop(
        Math.round(
          Math.max(VIEWPORT_PADDING, Math.min(rect.top, targetWindow.innerHeight - rect.height - VIEWPORT_PADDING)),
        ),
      );
      setDocked(side);
    },
    [targetWindow],
  );

  // 从停靠状态展开：恢复到停靠前那一侧的完整位置，之后保持展开，直到再次拖近边缘。
  const expandFromDock = useCallback(
    (focusTextarea?: boolean) => {
      if (focusTextarea) {
        targetWindow.setTimeout(() => textareaRef?.current?.focus(), 0);
      }
      if (!docked) return;
      const vw = targetWindow.innerWidth;
      const vh = targetWindow.innerHeight;
      const clampedSize = clampSizeToViewport(size, vw, vh);
      setPosition({
        top: Math.round(Math.max(VIEWPORT_PADDING, Math.min(dockedTop, vh - clampedSize.height - VIEWPORT_PADDING))),
        left: Math.round(docked === 'right' ? vw - clampedSize.width - VIEWPORT_PADDING : VIEWPORT_PADDING),
      });
      setDocked(null);
    },
    [docked, dockedTop, size, targetWindow, textareaRef],
  );

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: PointerEvent) => handlePointerMove(e);
    const onUp = (e: PointerEvent) => handlePointerUp(e);
    targetWindow.addEventListener('pointermove', onMove);
    targetWindow.addEventListener('pointerup', onUp);
    return () => {
      targetWindow.removeEventListener('pointermove', onMove);
      targetWindow.removeEventListener('pointerup', onUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp, targetWindow]);

  // Resize handling
  const handleResizePointerDown = useCallback(
    (dir: ResizeDir) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!panelRef.current || !position) return;
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);
      resizeState.current = {
        dir,
        startX: e.clientX,
        startY: e.clientY,
        startW: size.width,
        startH: size.height,
        startTop: position.top,
        startLeft: position.left,
        pointerId: e.pointerId,
        capturedEl: el,
      };
      setIsResizing(dir);
    },
    [position, size],
  );

  const handleResizePointerMove = useCallback(
    (e: PointerEvent) => {
      const st = resizeState.current;
      if (!st) return;
      const vw = targetWindow.innerWidth;
      const vh = targetWindow.innerHeight;
      const dx = e.clientX - st.startX;
      const dy = e.clientY - st.startY;
      let newW = st.startW;
      let newH = st.startH;
      let newTop = st.startTop;
      let newLeft = st.startLeft;

      if (st.dir.includes('e')) newW = st.startW + dx;
      if (st.dir.includes('w')) {
        newW = st.startW - dx;
        newLeft = st.startLeft + dx;
      }
      if (st.dir.includes('s')) newH = st.startH + dy;
      if (st.dir.includes('n')) {
        newH = st.startH - dy;
        newTop = st.startTop + dy;
      }

      newW = Math.max(PANEL_MIN_WIDTH, Math.min(newW, vw - VIEWPORT_PADDING * 2));
      newH = Math.max(PANEL_MIN_HEIGHT, Math.min(newH, vh - VIEWPORT_PADDING * 2, PANEL_MAX_HEIGHT_CAP));

      if (st.dir.includes('w')) {
        const maxLeft = st.startLeft + st.startW - PANEL_MIN_WIDTH;
        newLeft = Math.max(VIEWPORT_PADDING, Math.min(newLeft, maxLeft));
        if (newW !== st.startW - (newLeft - st.startLeft)) {
          newW = st.startW - (newLeft - st.startLeft);
        }
        // 反推出的宽度必须重新套上限，否则左缘贴边时宽度会越过视口
        newW = Math.max(PANEL_MIN_WIDTH, Math.min(newW, vw - VIEWPORT_PADDING * 2));
        newLeft = Math.max(VIEWPORT_PADDING, Math.min(newLeft, vw - newW - VIEWPORT_PADDING));
      }
      if (st.dir.includes('n')) {
        const maxTop = st.startTop + st.startH - PANEL_MIN_HEIGHT;
        newTop = Math.max(VIEWPORT_PADDING, Math.min(newTop, maxTop));
        if (newH !== st.startH - (newTop - st.startTop)) {
          newH = st.startH - (newTop - st.startTop);
        }
        // 反推出的高度必须重新套上限（含 PANEL_MAX_HEIGHT_CAP），否则上缘拖到视口顶部时高度会超出上限
        newH = Math.max(PANEL_MIN_HEIGHT, Math.min(newH, vh - VIEWPORT_PADDING * 2, PANEL_MAX_HEIGHT_CAP));
        newTop = Math.max(VIEWPORT_PADDING, Math.min(newTop, vh - newH - VIEWPORT_PADDING));
      }
      if (st.dir.includes('e') && !st.dir.includes('w')) {
        newW = Math.min(newW, vw - st.startLeft - VIEWPORT_PADDING);
      }
      if (st.dir.includes('s') && !st.dir.includes('n')) {
        newH = Math.min(newH, vh - st.startTop - VIEWPORT_PADDING);
      }

      setSize({ width: Math.round(newW), height: Math.round(newH) });
      if (st.dir.includes('w') || st.dir.includes('n')) {
        setPosition({ top: Math.round(newTop), left: Math.round(newLeft) });
      }
    },
    [targetWindow],
  );

  const handleResizePointerUp = useCallback(() => {
    const st = resizeState.current;
    if (st?.capturedEl) {
      try {
        st.capturedEl.releasePointerCapture(st.pointerId);
      } catch {
        // ignore
      }
    }
    resizeState.current = null;
    setIsResizing(null);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: PointerEvent) => handleResizePointerMove(e);
    const onUp = () => handleResizePointerUp();
    targetWindow.addEventListener('pointermove', onMove);
    targetWindow.addEventListener('pointerup', onUp);
    return () => {
      targetWindow.removeEventListener('pointermove', onMove);
      targetWindow.removeEventListener('pointerup', onUp);
    };
  }, [isResizing, handleResizePointerMove, handleResizePointerUp, targetWindow]);

  const handleResetSize = useCallback(() => {
    const vw = targetWindow.innerWidth;
    const vh = targetWindow.innerHeight;
    setSize(clampSizeToViewport({ width: PANEL_DEFAULT_WIDTH, height: PANEL_DEFAULT_HEIGHT }, vw, vh));
  }, [targetWindow]);

  return {
    position,
    setPosition,
    size,
    setSize,
    panelRef,
    isDragging,
    isResizing,
    docked,
    dockedTop,
    handlePointerDown,
    handleResizePointerDown,
    handleResetSize,
    expandFromDock,
  };
};
