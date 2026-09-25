import { useEffect, type RefObject } from 'react';

export interface UsePdfHotkeysProps {
  enabled?: boolean;
  containerRef: RefObject<HTMLElement | null>;
  onPrevPage: () => void;
  onNextPage: () => void;
  onFirstPage: () => void;
  onLastPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
  onFitToWidth?: () => void;
  onToggleSidebar?: () => void;
}

export function usePdfHotkeys({
  enabled = true,
  containerRef,
  onPrevPage,
  onNextPage,
  onFirstPage,
  onLastPage,
  onZoomIn,
  onZoomOut,
  onRotate,
  onFitToWidth,
  onToggleSidebar,
}: UsePdfHotkeysProps) {
  useEffect(() => {
    if (!enabled) return;

    let isHovered = false;
    const container = containerRef.current;

    const handleMouseEnter = () => {
      isHovered = true;
    };
    const handleMouseLeave = () => {
      isHovered = false;
    };

    if (container) {
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl instanceof HTMLElement && activeEl.isContentEditable);

      if (isInputFocused) return;

      const currentContainer = containerRef.current;
      const isContainerFocused =
        isHovered || currentContainer === activeEl || (currentContainer ? currentContainer.contains(activeEl) : false);

      if (!isContainerFocused) return;

      // Do not block system browser shortcuts when Ctrl / Meta / Alt is held
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const key = event.key.toLowerCase();

      if (event.key === 'ArrowLeft' || event.key === 'PageUp' || key === 'k') {
        event.preventDefault();
        onPrevPage();
      } else if (event.key === 'ArrowRight' || event.key === 'PageDown' || key === 'j') {
        event.preventDefault();
        onNextPage();
      } else if (event.key === 'Home') {
        event.preventDefault();
        onFirstPage();
      } else if (event.key === 'End') {
        event.preventDefault();
        onLastPage();
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        onZoomIn();
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        onZoomOut();
      } else if (key === 'r') {
        event.preventDefault();
        onRotate();
      } else if (key === 'w' && onFitToWidth) {
        event.preventDefault();
        onFitToWidth();
      } else if (key === 't' && onToggleSidebar) {
        event.preventDefault();
        onToggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (container) {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    enabled,
    containerRef,
    onPrevPage,
    onNextPage,
    onFirstPage,
    onLastPage,
    onZoomIn,
    onZoomOut,
    onRotate,
    onFitToWidth,
    onToggleSidebar,
  ]);
}
