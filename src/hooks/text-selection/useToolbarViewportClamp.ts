import { useState, useLayoutEffect, useMemo, type RefObject } from 'react';
import type { SelectionBounds } from './selectionDomUtils';

interface UseToolbarViewportClampProps {
  position: { top: number; left: number } | null;
  toolbarRef: RefObject<HTMLDivElement>;
  selectionBoundsRef: { current: SelectionBounds | null };
  targetWindow: Window;
}

export function useToolbarViewportClamp({
  position,
  toolbarRef,
  selectionBoundsRef,
  targetWindow,
}: UseToolbarViewportClampProps) {
  const [toolbarElement, setToolbarElement] = useState<HTMLDivElement | null>(null);
  const [toolbarSize, setToolbarSize] = useState<{ width: number; height: number } | null>(null);
  const toolbarNode = toolbarRef.current;

  useLayoutEffect(() => {
    if (!position) {
      if (toolbarElement !== null) {
        setToolbarElement(null);
      }
      if (toolbarSize !== null) {
        setToolbarSize(null);
      }
      return;
    }

    if (toolbarNode !== toolbarElement) {
      setToolbarElement(toolbarNode);
    }
  }, [position, toolbarElement, toolbarNode, toolbarSize]);

  useLayoutEffect(() => {
    if (!position || !toolbarElement) {
      return;
    }

    const updateToolbarSize = () => {
      const rect = toolbarElement.getBoundingClientRect();
      const nextSize = {
        width: rect.width,
        height: rect.height,
      };

      setToolbarSize((prev) => {
        if (prev && prev.width === nextSize.width && prev.height === nextSize.height) {
          return prev;
        }

        return nextSize;
      });
    };

    updateToolbarSize();

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => updateToolbarSize()) : null;

    resizeObserver?.observe(toolbarElement);
    targetWindow.addEventListener('resize', updateToolbarSize);
    targetWindow.visualViewport?.addEventListener('resize', updateToolbarSize);
    targetWindow.visualViewport?.addEventListener('scroll', updateToolbarSize);

    return () => {
      resizeObserver?.disconnect();
      targetWindow.removeEventListener('resize', updateToolbarSize);
      targetWindow.visualViewport?.removeEventListener('resize', updateToolbarSize);
      targetWindow.visualViewport?.removeEventListener('scroll', updateToolbarSize);
    };
  }, [position, toolbarElement, targetWindow]);

  const clampedPosition = useMemo(() => {
    if (!position || !toolbarSize) return position;

    const { width, height } = toolbarSize;
    const viewportWidth = targetWindow.innerWidth;
    const viewportHeight = targetWindow.innerHeight;
    const padding = 10;

    let correctedLeft = position.left;
    let correctedTop = position.top;
    const halfWidth = width / 2;

    // Horizontal
    if (correctedLeft - halfWidth < padding) correctedLeft = padding + halfWidth;
    if (correctedLeft + halfWidth > viewportWidth - padding) {
      correctedLeft = viewportWidth - padding - halfWidth;
    }

    // Vertical
    if (correctedTop < padding) {
      if (selectionBoundsRef.current) {
        const belowPos = selectionBoundsRef.current.bottom + 10;
        if (belowPos + height < viewportHeight - padding) {
          correctedTop = belowPos;
        } else {
          correctedTop = padding;
        }
      } else {
        correctedTop = padding;
      }
    }
    if (correctedTop + height > viewportHeight - padding) {
      correctedTop = viewportHeight - padding - height;
    }

    if (Math.abs(correctedLeft - position.left) > 1 || Math.abs(correctedTop - position.top) > 1) {
      return { left: correctedLeft, top: correctedTop };
    }

    return position;
  }, [position, toolbarSize, targetWindow.innerHeight, targetWindow.innerWidth, selectionBoundsRef]);

  return {
    clampedPosition,
  };
}
