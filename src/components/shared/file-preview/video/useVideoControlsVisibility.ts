import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseVideoControlsVisibilityProps {
  isPlaying: boolean;
  onControlsVisibilityChange?: (visible: boolean) => void;
}

export function useVideoControlsVisibility({ isPlaying, onControlsVisibilityChange }: UseVideoControlsVisibilityProps) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
  }, []);

  const scheduleAutoHide = useCallback(() => {
    clearHideTimeout();
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 2500);
    }
  }, [clearHideTimeout, isPlaying]);

  const wakeControls = useCallback(() => {
    setControlsVisible(true);
    scheduleAutoHide();
  }, [scheduleAutoHide]);

  useEffect(() => {
    if (!isPlaying) {
      setControlsVisible(true);
      clearHideTimeout();
    } else {
      scheduleAutoHide();
    }
    return () => {
      clearHideTimeout();
    };
  }, [clearHideTimeout, isPlaying, scheduleAutoHide]);

  useEffect(() => {
    onControlsVisibilityChange?.(controlsVisible);
  }, [controlsVisible, onControlsVisibilityChange]);

  const handleMouseLeave = useCallback(() => {
    if (isPlaying) {
      clearHideTimeout();
      setControlsVisible(false);
    }
  }, [clearHideTimeout, isPlaying]);

  return {
    controlsVisible,
    setControlsVisible,
    wakeControls,
    handleMouseLeave,
  };
}
