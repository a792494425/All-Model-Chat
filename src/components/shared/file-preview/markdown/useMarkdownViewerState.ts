import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UploadedFile } from '@/types';
import { readPersistentStorageItem, writePersistentStorageItem } from '@/stores/persistentStorage';
import { MARKDOWN_VIEW_MODE_STORAGE_PREFIX, MARKDOWN_TOC_STORAGE_PREFIX } from '@/constants/storageKeys';
import { shouldDeferMarkdownPreview } from '@/components/shared/file-preview/markdownPreviewPolicy';
import { extractMarkdownToc, type MarkdownTocItem } from '@/components/shared/file-preview/markdownToc';
import { getMarkdownDocumentStats } from '@/components/shared/file-preview/markdownDocumentStats';
import { isEditableElement } from '@/utils/chat-input/focus';

export type MarkdownViewMode = 'preview' | 'source';

const readStoredMarkdownViewMode = (storageKey: string): MarkdownViewMode => {
  return readPersistentStorageItem(storageKey) === 'source' ? 'source' : 'preview';
};

const readStoredTocVisibility = (storageKey: string): boolean => {
  return readPersistentStorageItem(storageKey) === 'open';
};

const scrollPreviewToHeading = (container: HTMLElement, headingIndex: number) => {
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const target = headings.item(headingIndex) as HTMLElement | null;
  if (!target) return;

  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  target.classList.remove('heading-target-pulse');
  void target.offsetWidth;
  target.classList.add('heading-target-pulse');
  setTimeout(() => {
    target.classList.remove('heading-target-pulse');
  }, 1800);
};

interface UseMarkdownViewerStateProps {
  file: UploadedFile;
  displayContent: string;
  isEditable?: boolean;
}

export const useMarkdownViewerState = ({ file, displayContent, isEditable = false }: UseMarkdownViewerStateProps) => {
  const storageKey = useMemo(() => `${MARKDOWN_VIEW_MODE_STORAGE_PREFIX}${file.id}:${file.name}`, [file.id, file.name]);
  const tocStorageKey = useMemo(() => `${MARKDOWN_TOC_STORAGE_PREFIX}${file.id}:${file.name}`, [file.id, file.name]);

  const [modeState, setModeState] = useState<{ storageKey: string; mode: MarkdownViewMode }>(() => ({
    storageKey,
    mode: readStoredMarkdownViewMode(storageKey),
  }));
  const [forcePreviewState, setForcePreviewState] = useState<{ storageKey: string; value: boolean }>(() => ({
    storageKey,
    value: false,
  }));
  const [tocVisibleState, setTocVisibleState] = useState<{ storageKey: string; value: boolean }>(() => ({
    storageKey: tocStorageKey,
    value: readStoredTocVisibility(tocStorageKey),
  }));
  const [tocFilterMode, setTocFilterMode] = useState<'compact' | 'all'>('compact');
  const [highlightedSourceLine, setHighlightedSourceLine] = useState<number | null>(null);
  const [activeHeadingIndex, setActiveHeadingIndex] = useState<number>(0);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const mode = modeState.storageKey === storageKey ? modeState.mode : readStoredMarkdownViewMode(storageKey);
  const forcePreview = forcePreviewState.storageKey === storageKey && forcePreviewState.value;
  const tocVisible =
    tocVisibleState.storageKey === tocStorageKey ? tocVisibleState.value : readStoredTocVisibility(tocStorageKey);

  const updateMode = useCallback(
    (nextMode: MarkdownViewMode) => {
      setModeState({ storageKey, mode: nextMode });
      writePersistentStorageItem(storageKey, nextMode);
    },
    [storageKey],
  );

  const updateTocVisibility = useCallback(
    (nextVisible: boolean) => {
      setTocVisibleState({ storageKey: tocStorageKey, value: nextVisible });
      writePersistentStorageItem(tocStorageKey, nextVisible ? 'open' : 'closed');
    },
    [tocStorageKey],
  );

  const shouldDefer = useMemo(() => shouldDeferMarkdownPreview(displayContent), [displayContent]);
  const showSource = isEditable || mode === 'source' || (shouldDefer && !forcePreview);
  const tocItems = useMemo(() => extractMarkdownToc(displayContent), [displayContent]);
  const documentStats = useMemo(() => getMarkdownDocumentStats(displayContent), [displayContent]);

  const hasRepetitiveHeadings = useMemo(() => {
    return tocItems.some(
      (item) => item.level >= 4 || (item.level >= 3 && (item.text === '详情' || item.text === '详细信息')),
    );
  }, [tocItems]);

  const filteredTocItems = useMemo(() => {
    if (tocFilterMode === 'all' || !hasRepetitiveHeadings) return tocItems;
    return tocItems.filter((item) => item.level <= 3 && item.text !== '详情' && item.text !== '详细信息');
  }, [tocItems, tocFilterMode, hasRepetitiveHeadings]);

  useEffect(() => {
    if (showSource) return;
    const container = previewContainerRef.current;
    if (!container) return;

    let ticking = false;
    const updateActiveHeading = () => {
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (headings.length === 0) return;

      const containerTop = container.getBoundingClientRect().top;
      let currentIndex = 0;

      for (let index = 0; index < headings.length; index++) {
        const heading = headings[index];
        const rect = heading.getBoundingClientRect();
        if (rect.top - containerTop <= 96) {
          currentIndex = index;
        } else {
          break;
        }
      }

      setActiveHeadingIndex(currentIndex);
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateActiveHeading);
        ticking = true;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    updateActiveHeading();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [showSource, displayContent]);

  const handleTocSelect = useCallback(
    (item: MarkdownTocItem) => {
      if (typeof window !== 'undefined' && window.innerWidth < 640) {
        updateTocVisibility(false);
      }

      if (showSource) {
        setHighlightedSourceLine(item.line);
        return;
      }

      if (!previewContainerRef.current) return;
      scrollPreviewToHeading(previewContainerRef.current, item.index);
      setActiveHeadingIndex(item.index);
    },
    [showSource, updateTocVisibility],
  );

  const handlePreviewSelect = useCallback(() => {
    updateMode('preview');
    setForcePreviewState({ storageKey, value: true });
  }, [storageKey, updateMode]);

  const handleSourceSelect = useCallback(() => {
    updateMode('source');
  }, [updateMode]);

  const handleToggleToc = useCallback(() => {
    updateTocVisibility(!tocVisible);
  }, [tocVisible, updateTocVisibility]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditable) return;

      const activeElement = document.activeElement as HTMLElement | null;
      const isEditingFieldFocused = Boolean(activeElement && isEditableElement(activeElement));

      if (isEditingFieldFocused) return;

      if (event.key === 'Escape' && tocVisible && typeof window !== 'undefined' && window.innerWidth < 640) {
        event.preventDefault();
        updateTocVisibility(false);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.altKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        handlePreviewSelect();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        handleSourceSelect();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePreviewSelect, handleSourceSelect, isEditable, tocVisible, updateTocVisibility]);

  return {
    previewContainerRef,
    showSource,
    shouldDefer,
    forcePreview,
    documentStats,
    tocItems,
    filteredTocItems,
    hasRepetitiveHeadings,
    tocVisible,
    tocFilterMode,
    setTocFilterMode,
    activeHeadingIndex,
    highlightedSourceLine,
    setHighlightedSourceLine,
    updateTocVisibility,
    handlePreviewSelect,
    handleSourceSelect,
    handleToggleToc,
    handleTocSelect,
  };
};
