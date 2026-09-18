import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';
import { selectCodeLines } from '@/utils/text-selection/codeLineSelection';

interface UseCodeGutterSelectionOptions {
  lineCount: number;
  preRef: RefObject<HTMLPreElement>;
}

export const useCodeGutterSelection = ({ lineCount, preRef }: UseCodeGutterSelectionOptions) => {
  const lastClickedLineRef = useRef<number | null>(null);
  const isDraggingGutterRef = useRef(false);
  const dragStartLineRef = useRef<number | null>(null);

  const lineNumbers = useMemo(() => {
    if (lineCount <= 0) return [];
    return Array.from({ length: lineCount }, (_, index) => index + 1);
  }, [lineCount]);

  const getCodeContainer = useCallback((): HTMLElement | null => {
    if (!preRef.current) return null;
    return (preRef.current.querySelector('[data-code-content]') ||
      preRef.current.querySelector('code') ||
      preRef.current) as HTMLElement;
  }, [preRef]);

  const selectLines = useCallback(
    (startLine: number, endLine: number) => {
      const codeContainer = getCodeContainer();
      if (!codeContainer) return;
      selectCodeLines(codeContainer, startLine, endLine);
    },
    [getCodeContainer],
  );

  const handleLineMouseDown = useCallback(
    (lineNumber: number, event: React.MouseEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();

      if (event.shiftKey && lastClickedLineRef.current !== null) {
        selectLines(lastClickedLineRef.current, lineNumber);
        lastClickedLineRef.current = lineNumber;
        return;
      }

      isDraggingGutterRef.current = true;
      dragStartLineRef.current = lineNumber;
      lastClickedLineRef.current = lineNumber;
      selectLines(lineNumber, lineNumber);
    },
    [selectLines],
  );

  const handleLineMouseEnter = useCallback(
    (lineNumber: number) => {
      if (isDraggingGutterRef.current && dragStartLineRef.current !== null) {
        selectLines(dragStartLineRef.current, lineNumber);
      }
    },
    [selectLines],
  );

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDraggingGutterRef.current = false;
      dragStartLineRef.current = null;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  return {
    lineNumbers,
    handleLineMouseDown,
    handleLineMouseEnter,
  };
};
