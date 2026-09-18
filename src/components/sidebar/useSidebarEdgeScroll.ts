import React from 'react';
import { isGroupDrag, isSessionDrag } from './sidebarDragTypes';

const EDGE_SCROLL_ZONE_PX = 48;

export function useSidebarEdgeScroll() {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const scrollRafRef = React.useRef<number | null>(null);

  const stopEdgeScroll = React.useCallback(() => {
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
  }, []);

  const startEdgeScroll = React.useCallback((container: HTMLDivElement, direction: number) => {
    if (scrollRafRef.current !== null) return;
    const step = () => {
      container.scrollTop += direction;
      scrollRafRef.current = requestAnimationFrame(step);
    };
    scrollRafRef.current = requestAnimationFrame(step);
  }, []);

  const handleScrollContainerDragOver = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (isGroupDrag(event)) return;
      if (!isSessionDrag(event)) {
        stopEdgeScroll();
        return;
      }
      const container = scrollContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const distanceFromTop = event.clientY - rect.top;
      const distanceFromBottom = rect.bottom - event.clientY;

      if (distanceFromTop < EDGE_SCROLL_ZONE_PX) {
        const speed = Math.max(1, Math.ceil((EDGE_SCROLL_ZONE_PX - distanceFromTop) / 8));
        startEdgeScroll(container, -speed);
      } else if (distanceFromBottom < EDGE_SCROLL_ZONE_PX) {
        const speed = Math.max(1, Math.ceil((EDGE_SCROLL_ZONE_PX - distanceFromBottom) / 8));
        startEdgeScroll(container, speed);
      } else {
        stopEdgeScroll();
      }
    },
    [startEdgeScroll, stopEdgeScroll],
  );

  // Cancel any pending edge-scroll rAF on unmount.
  React.useEffect(() => () => stopEdgeScroll(), [stopEdgeScroll]);

  return {
    scrollContainerRef,
    handleScrollContainerDragOver,
    stopEdgeScroll,
  };
}
