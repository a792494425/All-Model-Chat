import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

const OVERFLOW_TOLERANCE_PX = 1;

type Options = {
  enabled: boolean;
  frameRef: RefObject<HTMLDivElement | null>;
  isComposing: () => boolean;
};

type Measurement = {
  presentation: 'compact' | 'regular';
  revision: number;
};

export function useCompactChatInputPresentation({ enabled, frameRef, isComposing }: Options) {
  const [revision, setRevision] = useState(0);
  const [measurement, setMeasurement] = useState<Measurement>({ presentation: 'compact', revision: -1 });
  const scheduledMeasurementRef = useRef(false);
  const mountedRef = useRef(true);
  const wasEnabledRef = useRef(enabled);

  const requestMeasurement = useCallback(() => {
    if (!enabled || isComposing() || scheduledMeasurementRef.current) return;
    scheduledMeasurementRef.current = true;
    queueMicrotask(() => {
      scheduledMeasurementRef.current = false;
      if (mountedRef.current) setRevision((prev) => prev + 1);
    });
  }, [enabled, isComposing]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useLayoutEffect(() => {
    if (!enabled) {
      wasEnabledRef.current = false;
      return;
    }
    if (!wasEnabledRef.current) {
      wasEnabledRef.current = true;
      requestMeasurement();
      return;
    }
    if (measurement.revision === revision || isComposing()) return;
    const frame = frameRef.current;
    const editorElement = frame?.querySelector<HTMLElement>(
      'textarea[data-chat-input-textarea="true"], .composer-tiptap',
    );
    if (!editorElement) return;
    const hasHardBr = Boolean(
      editorElement.querySelector(':scope > p > br:not(.ProseMirror-trailingBreak)') ||
      (editorElement as HTMLTextAreaElement).value?.includes('\n'),
    );
    const hasOverflow =
      editorElement.clientHeight > 0
        ? editorElement.scrollHeight > editorElement.clientHeight + OVERFLOW_TOLERANCE_PX
        : false;
    const hasHorizontalOverflow =
      editorElement.clientWidth > 0
        ? editorElement.scrollWidth > editorElement.clientWidth + OVERFLOW_TOLERANCE_PX
        : false;
    setMeasurement({
      presentation: hasHardBr || hasOverflow || hasHorizontalOverflow ? 'regular' : 'compact',
      revision,
    });
  }, [enabled, frameRef, isComposing, measurement.revision, revision, requestMeasurement]);

  useEffect(() => {
    if (!enabled) return;
    const frame = frameRef.current;
    const inputbarElement = frame?.closest<HTMLElement>('[data-composer-inputbar]') ?? frame;
    if (!frame || !inputbarElement) return;

    // Textarea value writes rewrite the textarea's own text node on every render;
    // those are the app's own updates, not content signals (value-driven changes
    // are already measured via the inputText effect). Only act on other mutations,
    // which is how the rich-text (.composer-tiptap) variant signals content edits.
    const mutationObserver = new MutationObserver((records) => {
      const isMeaningful = records.some((record) => !(record.target instanceof HTMLTextAreaElement));
      if (isMeaningful) requestMeasurement();
    });
    mutationObserver.observe(frame, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    let lastWidth = inputbarElement.getBoundingClientRect().width;
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver((entries) => {
            const nextWidth = entries[0]?.contentRect.width ?? inputbarElement.getBoundingClientRect().width;
            if (nextWidth === lastWidth) return;
            lastWidth = nextWidth;
            requestMeasurement();
          });
    resizeObserver?.observe(inputbarElement);

    return () => {
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
    };
  }, [enabled, frameRef, requestMeasurement]);

  const measurementPending = measurement.revision !== revision;

  return { isCompact: enabled && (measurementPending || measurement.presentation === 'compact'), requestMeasurement };
}
