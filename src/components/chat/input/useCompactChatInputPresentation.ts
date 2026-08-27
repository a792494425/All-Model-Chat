import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

const TOL = 1;

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
  const [rev, setRev] = useState(0);
  const [m, setM] = useState<Measurement>({ presentation: 'compact', revision: -1 });
  const schedRef = useRef(false);
  const mountedRef = useRef(true);
  const wasEnabledRef = useRef(enabled);

  const requestMeasurement = useCallback(() => {
    if (!enabled || isComposing() || schedRef.current) return;
    schedRef.current = true;
    queueMicrotask(() => {
      schedRef.current = false;
      if (mountedRef.current) setRev((r) => r + 1);
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
    if (m.revision === rev || isComposing()) return;
    const frame = frameRef.current;
    const ed = frame?.querySelector<HTMLElement>('textarea[data-chat-input-textarea="true"], .composer-tiptap');
    const row = frame?.closest<HTMLElement>('[data-composer-compact-row]') ?? frame?.querySelector<HTMLElement>('[data-composer-compact-row]');
    const targetRow = (row ?? frame) as HTMLElement | null;
    if (!ed || !targetRow) return;
    const hasHardBr = !!(ed.querySelector(':scope > p > br:not(.ProseMirror-trailingBreak)') || (ed as HTMLTextAreaElement).value?.includes('\n'));
    const hasOverflow = ed.clientHeight > 0 ? ed.scrollHeight > ed.clientHeight + TOL : false;
    const hasRowOverflow = targetRow.clientWidth > 0 ? targetRow.scrollWidth > targetRow.clientWidth + TOL : false;
    setM({ presentation: hasHardBr || hasOverflow || hasRowOverflow ? 'regular' : 'compact', revision: rev });
  }, [enabled, frameRef, isComposing, m.revision, rev, requestMeasurement]);

  useEffect(() => {
    if (!enabled) return;
    const frame = frameRef.current;
    const row = frame?.closest<HTMLElement>('[data-composer-compact-row]') ?? frame?.querySelector<HTMLElement>('[data-composer-compact-row]');
    const inputbarElement = frame?.closest<HTMLElement>('[data-composer-inputbar]') ?? (row as HTMLElement | null) ?? frame;
    if (!frame || !inputbarElement) return;

    const mutationObserver = new MutationObserver(requestMeasurement);
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

  const measurementPending = m.revision !== rev;

  return { isCompact: enabled && (measurementPending || m.presentation === 'compact'), requestMeasurement };
}
