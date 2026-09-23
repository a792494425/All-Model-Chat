import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useSettingsUiStore, type SettingsTab } from '@/stores/settingsUiStore';
import { SETTINGS_SEARCH_RESULTS_ID, settingsSearchOptionId } from '@/constants/settingsSearchCatalog';
import { searchSettingsCatalog, type SettingsSearchResult } from '@/utils/settingsSearch';
import { isEditableElement } from '@/utils/chat-input/focus';
import { ANCHOR_SCROLL_LOCK_MS } from '@/hooks/settings/useSettingsLogic';

const ADVANCED_SETTINGS_ITEM_IDS = new Set([
  'models-advanced',
  'models-top-p',
  'models-top-k',
  'models-max-output-tokens',
  'models-stop-sequences',
  'models-presence-penalty',
  'models-frequency-penalty',
  'models-seed',
  'models-media-resolution',
  'models-raw-mode',
  'models-hide-thinking',
  'models-always-keep-thinking',
]);

const SETTINGS_FOCUS_HIGHLIGHT_CLASSES = [
  'ring-2',
  'ring-[var(--theme-border-focus)]',
  'ring-offset-2',
  'ring-offset-[var(--theme-bg-primary)]',
  'rounded-xl',
] as const;

interface UseSettingsModalSearchProps {
  isOpen: boolean;
  activeTab: SettingsTab;
  setActiveTab: (tab: SettingsTab) => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  beginAnchorScroll: () => void;
  saveActiveScrollPosition: () => void;
  t: (key: string) => string;
}

export const useSettingsModalSearch = ({
  isOpen,
  activeTab,
  setActiveTab,
  scrollContainerRef,
  beginAnchorScroll,
  saveActiveScrollPosition,
  t,
}: UseSettingsModalSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  const isSearching = searchQuery.trim().length > 0;
  const searchResults = useMemo(() => searchSettingsCatalog(searchQuery, t), [searchQuery, t]);
  const clampedSearchSelectedIndex = Math.min(searchSelectedIndex, Math.max(searchResults.length - 1, 0));
  const activeSearchOptionId = searchResults.length > 0 ? settingsSearchOptionId(clampedSearchSelectedIndex) : null;

  useEffect(() => {
    setSearchSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setPendingFocusId(null);
    }
  }, [isOpen]);

  const handleTabChange = useCallback(
    (tab: SettingsTab) => {
      setSearchQuery('');
      setActiveTab(tab);
    },
    [setActiveTab],
  );

  const handleSelectSearchResult = useCallback(
    (result: SettingsSearchResult) => {
      if (ADVANCED_SETTINGS_ITEM_IDS.has(result.id)) {
        useSettingsUiStore.getState().setIsAdvancedModeEnabled(true);
      }
      setPendingFocusId(result.id);
      setSearchQuery('');
      setActiveTab(result.tab);
    },
    [setActiveTab],
  );

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.isComposing) return;

      if (isSearching && searchResults.length > 0) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSearchSelectedIndex((prev) => (prev + 1) % searchResults.length);
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSearchSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
          return;
        }
        if (event.key === 'Enter') {
          const selected = searchResults[clampedSearchSelectedIndex];
          if (selected) {
            event.preventDefault();
            handleSelectSearchResult(selected);
            return;
          }
        }
      }

      if (event.key !== '/' || (event.target instanceof HTMLElement && isEditableElement(event.target))) return;
      event.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [clampedSearchSelectedIndex, handleSelectSearchResult, isOpen, isSearching, searchResults]);

  useEffect(() => {
    if (!isOpen || !isSearching) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing) return;
      event.preventDefault();
      event.stopPropagation();
      setSearchQuery('');
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, isSearching]);

  useEffect(() => {
    if (!pendingFocusId || isSearching || !isOpen) {
      return;
    }

    let highlightTimer: number | undefined;
    let scrollSaveTimer: number | undefined;
    beginAnchorScroll();
    const frame = window.requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container) {
        setPendingFocusId(null);
        return;
      }

      const target = container.querySelector(
        `[data-settings-item="${CSS.escape(pendingFocusId)}"]`,
      ) as HTMLElement | null;

      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add(...SETTINGS_FOCUS_HIGHLIGHT_CLASSES);
        highlightTimer = window.setTimeout(() => {
          target.classList.remove(...SETTINGS_FOCUS_HIGHLIGHT_CLASSES);
        }, 1600);
        scrollSaveTimer = window.setTimeout(() => {
          saveActiveScrollPosition();
        }, ANCHOR_SCROLL_LOCK_MS);
      }

      setPendingFocusId(null);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      if (highlightTimer !== undefined) {
        window.clearTimeout(highlightTimer);
      }
      if (scrollSaveTimer !== undefined) {
        window.clearTimeout(scrollSaveTimer);
      }
    };
  }, [pendingFocusId, isSearching, isOpen, activeTab, scrollContainerRef, beginAnchorScroll, saveActiveScrollPosition]);

  return {
    searchQuery,
    setSearchQuery,
    isSearching,
    searchResults,
    clampedSearchSelectedIndex,
    activeSearchOptionId,
    searchInputRef,
    activeTabRef,
    handleTabChange,
    handleSelectSearchResult,
    searchResultsId: SETTINGS_SEARCH_RESULTS_ID,
  };
};
