import { useState, useRef, useCallback } from 'react';

export interface UseVideoSegmentProps {
  defaultSegment?: { start: number; end: number } | null;
  segment?: { start: number; end: number } | null;
  onSegmentChange?: (segment: { start: number; end: number } | null) => void;
  isSegmentLoopEnabled?: boolean;
  onSegmentLoopChange?: (enabled: boolean) => void;
}

export function useVideoSegment({
  defaultSegment = null,
  segment: controlledSegment,
  onSegmentChange,
  isSegmentLoopEnabled: controlledIsSegmentLoopEnabled,
  onSegmentLoopChange,
}: UseVideoSegmentProps) {
  const isControlledSegment = controlledSegment !== undefined;
  const [internalSegment, setInternalSegment] = useState<{ start: number; end: number } | null>(defaultSegment);
  const activeSegment = isControlledSegment ? controlledSegment : internalSegment;
  const activeSegmentRef = useRef(activeSegment);
  activeSegmentRef.current = activeSegment;

  const updateSegment = useCallback(
    (newSegment: { start: number; end: number } | null) => {
      if (!isControlledSegment) {
        setInternalSegment(newSegment);
      }
      onSegmentChange?.(newSegment);
    },
    [isControlledSegment, onSegmentChange],
  );

  const isControlledLoop = controlledIsSegmentLoopEnabled !== undefined;
  const [internalLoop, setInternalLoop] = useState(true);
  const isSegmentLoopEnabled = isControlledLoop ? controlledIsSegmentLoopEnabled : internalLoop;
  const isSegmentLoopEnabledRef = useRef(isSegmentLoopEnabled);
  isSegmentLoopEnabledRef.current = isSegmentLoopEnabled;

  const toggleSegmentLoop = useCallback(() => {
    const nextVal = !isSegmentLoopEnabled;
    if (!isControlledLoop) {
      setInternalLoop(nextVal);
    }
    onSegmentLoopChange?.(nextVal);
  }, [isControlledLoop, isSegmentLoopEnabled, onSegmentLoopChange]);

  const resetSegment = useCallback(
    (newDefault: { start: number; end: number } | null = null) => {
      if (!isControlledSegment) {
        setInternalSegment(newDefault);
      }
    },
    [isControlledSegment],
  );

  return {
    activeSegment,
    activeSegmentRef,
    updateSegment,
    isSegmentLoopEnabled,
    isSegmentLoopEnabledRef,
    toggleSegmentLoop,
    resetSegment,
  };
}
