import { useState, useRef, useEffect, useCallback, type RefObject } from 'react';
import { useWindowContext } from '@/contexts/WindowContext';
import {
  dispatchLiveArtifactClearSelection,
  isLiveArtifactSelectionDetail,
  LIVE_ARTIFACT_SELECTION_EVENT,
} from '@/utils/text-selection/liveArtifactSelection';
import {
  type ContainerRefLike,
  type SelectionBounds,
  cloneSelectionContent,
  getPlainSelectionText,
  isCodeSelection,
  getValidSelectionRange,
  createSelectionRect,
} from './selectionDomUtils';
import { useToolbarViewportClamp } from './useToolbarViewportClamp';
import { useSelectionCopyHandler } from './useSelectionCopyHandler';

export type { ContainerRefLike, SelectionBounds };

export interface UseSelectionPositionProps {
  containerRef: ContainerRefLike;
  isAudioActive: boolean;
  /** Synchronous hold flag so TTS can pin the toolbar before React re-renders. */
  isAudioActiveRef?: RefObject<boolean>;
  toolbarRef: RefObject<HTMLDivElement>;
  onCopySuccess?: (text: string) => void;
  preserveFormattingOnCopy?: boolean;
}

export const useSelectionPosition = ({
  containerRef,
  isAudioActive,
  isAudioActiveRef,
  toolbarRef,
  onCopySuccess,
  preserveFormattingOnCopy = true,
}: UseSelectionPositionProps) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectedSpeechText, setSelectedSpeechText] = useState('');
  const [selectedCopyText, setSelectedCopyText] = useState('');
  const selectionBoundsRef = useRef<SelectionBounds | null>(null);
  const selectedTextRef = useRef('');
  const selectedPlainTextRef = useRef('');
  const selectionRequestIdRef = useRef(0);
  const { document: targetDocument, window: targetWindow } = useWindowContext();

  const isSelectionHeld = useCallback(
    () => Boolean(isAudioActive || isAudioActiveRef?.current),
    [isAudioActive, isAudioActiveRef],
  );

  const clearSelectionState = useCallback(() => {
    selectionRequestIdRef.current += 1;
    setPosition(null);
    selectionBoundsRef.current = null;
    selectedTextRef.current = '';
    selectedPlainTextRef.current = '';
    setSelectedText('');
    setSelectedSpeechText('');
    setSelectedCopyText('');
  }, []);

  // Monitor selection changes
  useEffect(() => {
    const selectionVersionRef = { current: -1 };

    // Extract the selection content (clone subtree, strip .select-none, convert
    // to markdown). Coalesced with a rAF so a per-frame `selectionchange` burst
    // during a long drag runs it exactly once per frame, and the position-only
    // pass below (which re-renders the toolbar per frame) keeps the heavy clone
    // off the hot path.
    const runSelectionExtraction = () => {
      const range = getValidSelectionRange(targetWindow, containerRef);
      if (!range) {
        if (!isSelectionHeld()) {
          clearSelectionState();
        }
        return;
      }

      if (isSelectionHeld()) {
        return;
      }

      const requestId = (selectionRequestIdRef.current += 1);

      const container = cloneSelectionContent(range, targetDocument);
      const html = container.innerHTML;
      const rangeIsCodeSelection = isCodeSelection(range);
      const cleanedPlainText = getPlainSelectionText(container);
      const plainText = rangeIsCodeSelection
        ? (targetWindow.getSelection()?.toString() || cleanedPlainText).trim()
        : cleanedPlainText;

      if (!plainText) {
        clearSelectionState();
        return;
      }

      const rect = range.getBoundingClientRect();
      const applySelectionState = (text: string) => {
        if (requestId !== selectionRequestIdRef.current) {
          return;
        }

        const nextText = text || plainText;
        if (!nextText) {
          clearSelectionState();
          return;
        }

        selectionBoundsRef.current = rect;
        selectedTextRef.current = nextText;
        selectedPlainTextRef.current = plainText;

        setPosition({
          top: rect.top - 50,
          left: rect.left + rect.width / 2,
        });
        setSelectedText(nextText);
        setSelectedSpeechText(plainText);
        setSelectedCopyText(preserveFormattingOnCopy ? nextText : plainText || nextText);
      };

      if (rangeIsCodeSelection) {
        applySelectionState(plainText);
        return;
      }

      void (async () => {
        const { convertHtmlToMarkdown } = await import('@/utils/markdown/htmlToMarkdown');
        applySelectionState(convertHtmlToMarkdown(html).trim());
      })();
    };

    let extractionFrame: number | null = null;
    const scheduleSelectionExtraction = () => {
      if (extractionFrame !== null) {
        return;
      }
      extractionFrame = targetWindow.requestAnimationFrame(() => {
        extractionFrame = null;
        runSelectionExtraction();
      });
    };
    const cancelScheduledExtraction = () => {
      if (extractionFrame !== null) {
        targetWindow.cancelAnimationFrame(extractionFrame);
        extractionFrame = null;
      }
    };

    // Live, lightweight pass: the toolbar position follows the selection on
    // every change, but the content extraction is coalesced (rAF) and cached by
    // version — dragging within the same selected range re-runs the cheap
    // position pass without re-cloning the DOM.
    const seedImmediateSelectionText = (range: Range) => {
      const immediatePlain = (targetWindow.getSelection()?.toString() || range.toString() || '').trim();
      if (!immediatePlain) {
        return;
      }

      selectedPlainTextRef.current = immediatePlain;
      if (!selectedTextRef.current) {
        selectedTextRef.current = immediatePlain;
        setSelectedText(immediatePlain);
        setSelectedCopyText(immediatePlain);
      }
      setSelectedSpeechText(immediatePlain);
    };

    const handleSelectionChange = () => {
      selectionVersionRef.current += 1;
      const version = selectionVersionRef.current;

      if (isSelectionHeld()) {
        return;
      }

      const range = getValidSelectionRange(targetWindow, containerRef);
      if (!range) {
        clearSelectionState();
        return;
      }

      const rect = range.getBoundingClientRect();
      selectionBoundsRef.current = rect;
      setPosition({
        top: rect.top - 50,
        left: rect.left + rect.width / 2,
      });
      seedImmediateSelectionText(range);

      scheduleSelectionExtraction();
      if (version !== selectionVersionRef.current) {
        return;
      }
    };

    targetDocument.addEventListener('selectionchange', handleSelectionChange);
    targetDocument.addEventListener('mouseup', scheduleSelectionExtraction);
    targetDocument.addEventListener('keyup', scheduleSelectionExtraction);

    return () => {
      targetDocument.removeEventListener('selectionchange', handleSelectionChange);
      targetDocument.removeEventListener('mouseup', scheduleSelectionExtraction);
      targetDocument.removeEventListener('keyup', scheduleSelectionExtraction);
      cancelScheduledExtraction();
    };
  }, [clearSelectionState, containerRef, isSelectionHeld, preserveFormattingOnCopy, targetDocument, targetWindow]);

  useEffect(() => {
    const handleLiveArtifactSelection = (event: Event) => {
      if (isSelectionHeld()) {
        return;
      }

      const detail = (event as CustomEvent<unknown>).detail;
      if (!isLiveArtifactSelectionDetail(detail)) {
        clearSelectionState();
        return;
      }

      const copyText = detail.copyText || detail.text;
      selectionBoundsRef.current = detail.rect;
      selectedTextRef.current = detail.text;
      selectedPlainTextRef.current = copyText;
      setPosition({
        top: detail.rect.top - 50,
        left: detail.rect.left + detail.rect.width / 2,
      });
      setSelectedText(detail.text);
      setSelectedSpeechText(copyText || detail.text);
      setSelectedCopyText(copyText);
    };

    targetWindow.addEventListener(LIVE_ARTIFACT_SELECTION_EVENT, handleLiveArtifactSelection);
    return () => targetWindow.removeEventListener(LIVE_ARTIFACT_SELECTION_EVENT, handleLiveArtifactSelection);
  }, [clearSelectionState, isSelectionHeld, targetWindow]);

  useSelectionCopyHandler({
    isSelectionHeld,
    selectedTextRef,
    selectedPlainTextRef,
    preserveFormattingOnCopy,
    onCopySuccess,
    targetDocument,
  });

  const { clampedPosition } = useToolbarViewportClamp({
    position,
    toolbarRef,
    selectionBoundsRef,
    targetWindow,
  });

  const clearSelection = () => {
    targetWindow.getSelection()?.removeAllRanges();
    dispatchLiveArtifactClearSelection(targetWindow);
    clearSelectionState();
  };

  const selectionRect = createSelectionRect(selectionBoundsRef.current, targetWindow);

  return {
    position: clampedPosition,
    setPosition,
    selectedText,
    selectedSpeechText,
    selectedCopyText,
    selectionRect,
    clearSelection,
  };
};
