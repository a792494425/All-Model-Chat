import { useEffect } from 'react';
import { copySelectionTextToClipboardEvent } from '@/utils/text-selection/selectionClipboard';
import { isEditableElement } from './selectionDomUtils';

interface UseSelectionCopyHandlerProps {
  isSelectionHeld: () => boolean;
  selectedTextRef: { current: string };
  selectedPlainTextRef: { current: string };
  preserveFormattingOnCopy: boolean;
  onCopySuccess?: (text: string) => void;
  targetDocument: Document;
}

export function useSelectionCopyHandler({
  isSelectionHeld,
  selectedTextRef,
  selectedPlainTextRef,
  preserveFormattingOnCopy,
  onCopySuccess,
  targetDocument,
}: UseSelectionCopyHandlerProps) {
  useEffect(() => {
    const handleCopy = (event: ClipboardEvent) => {
      if (isSelectionHeld()) {
        return;
      }

      const activeElement = targetDocument.activeElement;
      if (isEditableElement(activeElement)) {
        return;
      }

      const text = preserveFormattingOnCopy
        ? selectedTextRef.current
        : selectedPlainTextRef.current || selectedTextRef.current;
      if (copySelectionTextToClipboardEvent(event, text)) {
        onCopySuccess?.(text);
      }
    };

    targetDocument.addEventListener('copy', handleCopy);
    return () => targetDocument.removeEventListener('copy', handleCopy);
  }, [isSelectionHeld, onCopySuccess, preserveFormattingOnCopy, selectedPlainTextRef, selectedTextRef, targetDocument]);
}
