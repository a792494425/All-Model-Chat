import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseVideoControlsVisibilityProps {
  isPlaying: boolean;
  onControlsVisibilityChange?: (visible: boolean) => void;
}

export function useVideoControlsVisibility({ isPlaying, onControlsVisibilityChange }: UseVideoControlsVisibilityProps) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wakeControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 2500);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    }
  }, [isPlaying]);

  useEffect(() => {
    onControlsVisibilityChange?.(controlsVisible);
  }, [controlsVisible, onControlsVisibilityChange]);

  const handleMouseLeave = useCallback(() => {
    if (isPlaying) {
      setControlsVisible(false);
    }
  }, [isPlaying]);

  return {
    controlsVisible,
    setControlsVisible,
    wakeControls,
    handleMouseLeave,
  };
}
