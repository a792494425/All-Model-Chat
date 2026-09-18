import { useState, useEffect, useRef, useMemo } from 'react';
import type { SavedChatSession, ChatGroup } from '@/types';
import type { SupportedLanguage } from '@/i18n/languageRegistry';
import { FOCUS_HISTORY_SEARCH_EVENT } from '@/constants/layout';
import { dbService } from '@/services/db/dbService';
import { logService } from '@/services/logService';
import { compareSessionOrder } from '@/stores/sessionModels';
import type { HistoryDisplayMode } from '@/stores/uiStore';
import { categorizeSessionsByDate, type HistoryTranslator } from './sidebarDateCategorizer';
import { useWindowContext } from '@/contexts/WindowContext';

interface UseSidebarSearchAndFilterProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: SavedChatSession[];
  groups: ChatGroup[];
  displayMode?: HistoryDisplayMode;
  language: SupportedLanguage;
  t: HistoryTranslator;
}

export const useSidebarSearchAndFilter = ({
  isOpen,
  onToggle,
  sessions,
  groups,
  displayMode = 'group',
  language,
  t,
}: UseSidebarSearchAndFilterProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ query: string; ids: Set<string> } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const { document: targetDocument, window: targetWindow } = useWindowContext();

  useEffect(() => {
    const handleFocusHistorySearch = () => {
      if (!isOpen) {
        onToggle();
      }
      setIsSearching(true);
      targetWindow.setTimeout(() => searchInputRef.current?.focus(), 0);
    };

    targetDocument.addEventListener(FOCUS_HISTORY_SEARCH_EVENT, handleFocusHistorySearch);
    return () => targetDocument.removeEventListener(FOCUS_HISTORY_SEARCH_EVENT, handleFocusHistorySearch);
  }, [isOpen, onToggle, targetDocument, targetWindow]);

  // Debounced DB-backed content search.
  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    const handler = setTimeout(async () => {
      try {
        const ids = await dbService.searchSessions(trimmedQuery);
        setSearchResults({ query: trimmedQuery, ids: new Set(ids) });
      } catch (searchError) {
        logService.error('Search error', searchError);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const filteredSessions = useMemo(() => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return sessions;

    const freshSearchResults = searchResults?.query === trimmedQuery ? searchResults : null;
    if (freshSearchResults) {
      return sessions.filter((session) => freshSearchResults.ids.has(session.id));
    }

    const query = trimmedQuery.toLowerCase();
    return sessions.filter((session) => {
      if (session.title.toLowerCase().includes(query)) return true;
      return session.messages.some((message) => message.content.toLowerCase().includes(query));
    });
  }, [sessions, searchQuery, searchResults]);

  const sessionsByGroupId = useMemo(() => {
    const map = new Map<string | null, SavedChatSession[]>();
    map.set(null, []);
    groups.forEach((group) => map.set(group.id, []));
    filteredSessions.forEach((session) => {
      const key = session.groupId && map.has(session.groupId) ? session.groupId : null;
      map.get(key)?.push(session);
    });
    map.forEach((sessionList) => sessionList.sort(compareSessionOrder));
    return map;
  }, [filteredSessions, groups]);

  const sortedGroups = useMemo(() => {
    const hasOrderKey = groups.some((group) => group.orderKey);
    if (hasOrderKey) {
      return [...groups].sort((leftGroup, rightGroup) => {
        if (leftGroup.orderKey && rightGroup.orderKey) return leftGroup.orderKey.localeCompare(rightGroup.orderKey);
        if (leftGroup.orderKey) return -1;
        if (rightGroup.orderKey) return 1;
        return rightGroup.timestamp - leftGroup.timestamp;
      });
    }
    return [...groups].sort((leftGroup, rightGroup) => rightGroup.timestamp - leftGroup.timestamp);
  }, [groups]);

  const categorizedUngroupedSessions = useMemo(() => {
    if (displayMode !== 'time') return { categories: {}, categoryOrder: [] as string[] };
    const allUnpinned = filteredSessions.filter((session) => !session.isPinned);
    return categorizeSessionsByDate(allUnpinned, language, t);
  }, [filteredSessions, displayMode, t, language]);

  const unpinnedUngroupedSessions = useMemo(() => {
    if (displayMode === 'time') return [];
    return (sessionsByGroupId.get(null) || []).filter((session) => !session.isPinned);
  }, [sessionsByGroupId, displayMode]);

  const categorizedTimeModePinned = useMemo(() => {
    if (displayMode !== 'time') return [];
    return filteredSessions.filter((session) => session.isPinned);
  }, [filteredSessions, displayMode]);

  return {
    searchQuery,
    setSearchQuery,
    isSearching,
    setIsSearching,
    searchInputRef,
    filteredSessions,
    sessionsByGroupId,
    sortedGroups,
    categorizedUngroupedSessions,
    unpinnedUngroupedSessions,
    categorizedTimeModePinned,
  };
};
