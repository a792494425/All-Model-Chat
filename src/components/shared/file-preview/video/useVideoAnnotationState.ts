import { useState, useCallback } from 'react';
import type { VideoAnnotation } from '@/components/media-nav/VideoHighlightOverlay';

export interface UseVideoAnnotationStateProps {
  annotation?: VideoAnnotation | null;
  annotationTargetTime?: number | null;
  isAnnotationVisible?: boolean;
  onAnnotationVisibilityChange?: (visible: boolean) => void;
  onAnnotationDismiss?: () => void;
}

export function useVideoAnnotationState({
  annotation = null,
  annotationTargetTime = null,
  isAnnotationVisible: controlledIsAnnotationVisible,
  onAnnotationVisibilityChange,
  onAnnotationDismiss,
}: UseVideoAnnotationStateProps) {
  const isControlledAnnotationVis = controlledIsAnnotationVisible !== undefined;
  const [internalAnnotationVisible, setInternalAnnotationVisible] = useState(false);
  const [isAnnotationDismissed, setIsAnnotationDismissed] = useState(false);

  const effectiveAnnotationVisible = isControlledAnnotationVis
    ? controlledIsAnnotationVisible
    : !isAnnotationDismissed && internalAnnotationVisible;

  const handleCloseAnnotation = useCallback(() => {
    setIsAnnotationDismissed(true);
    setInternalAnnotationVisible(false);
    if (isControlledAnnotationVis) {
      onAnnotationVisibilityChange?.(false);
    }
    onAnnotationDismiss?.();
  }, [isControlledAnnotationVis, onAnnotationVisibilityChange, onAnnotationDismiss]);

  const updateAnnotationVisibility = useCallback(
    (currentTime: number) => {
      if (annotation && (annotation.box2d || annotation.point)) {
        let isVisibleNow = true;
        if (annotationTargetTime !== null && annotationTargetTime !== undefined) {
          const timeDiff = Math.abs(currentTime - annotationTargetTime);
          isVisibleNow = timeDiff <= 1.5;
        }
        setInternalAnnotationVisible(isVisibleNow);
        if (isControlledAnnotationVis) {
          onAnnotationVisibilityChange?.(isVisibleNow);
        }
      }
    },
    [annotation, annotationTargetTime, isControlledAnnotationVis, onAnnotationVisibilityChange],
  );

  const resetAnnotation = useCallback(() => {
    setIsAnnotationDismissed(false);
    setInternalAnnotationVisible(false);
  }, []);

  return {
    effectiveAnnotationVisible,
    handleCloseAnnotation,
    updateAnnotationVisibility,
    resetAnnotation,
  };
}
