import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Modal } from '@/components/shared/Modal';
import { useI18n } from '@/contexts/I18nContext';
import { interpolate } from '@/i18n/interpolate';
import { useChatStore } from '@/stores/chatStore';
import { dbService } from '@/services/db/dbService';
import {
  extractLibraryItemsFromSessions,
  filterAndSortLibraryItems,
  formatLibraryDate,
} from '@/utils/library/libraryFiles';
import { formatFileSize } from '@/utils/file/fileSize';
import { LibraryItemThumbnail } from '@/components/library/LibraryItemThumbnail';
import { Library, Search, X, Check, LayoutGrid, List, Loader2, FolderOpen } from 'lucide-react';
import { MODAL_CLOSE_BUTTON_CLASS } from '@/constants/buttonClasses';
import type { LibraryItem, LibraryCategoryFilter } from '@/types';
import { logService } from '@/services/logService';

interface LibraryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedItems: LibraryItem[]) => Promise<void>;
  initialCategory?: LibraryCategoryFilter;
}

export const LibraryPickerModal: React.FC<LibraryPickerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialCategory = 'all',
}) => {
  const { t, language } = useI18n();
  const savedSessions = useChatStore((state) => state.savedSessions);

  const [standaloneFiles, setStandaloneFiles] = useState<LibraryItem[]>([]);
  const [historicalFiles, setHistoricalFiles] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<LibraryCategoryFilter>(initialCategory);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load files when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const loadFiles = async () => {
      setIsLoading(true);
      try {
        const [standalone, historical] = await Promise.all([
          dbService.getStandaloneLibraryFiles(),
          dbService.getAllHistoricalSessionFiles(),
        ]);
        if (active) {
          setStandaloneFiles(standalone);
          setHistoricalFiles(historical);
        }
      } catch (loadError) {
        logService.error('Failed to load library files for picker', loadError);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadFiles();
    setSelectedIds(new Set());
    setSearchQuery('');
    setCategoryFilter(initialCategory);

    return () => {
      active = false;
    };
  }, [isOpen, initialCategory]);

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Merge items
  const allItems = useMemo(() => {
    const map = new Map<string, LibraryItem>();

    standaloneFiles.forEach((file) => {
      map.set(file.id, file);
    });

    historicalFiles.forEach((file) => {
      if (!map.has(file.id)) {
        map.set(file.id, file);
      }
    });

    const inMemorySessionFiles = extractLibraryItemsFromSessions(savedSessions);
    inMemorySessionFiles.forEach((file) => {
      map.set(file.id, file);
    });

    return Array.from(map.values());
  }, [standaloneFiles, historicalFiles, savedSessions]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    return filterAndSortLibraryItems(allItems, {
      category: categoryFilter,
      source: 'all',
      fileType: 'all',
      sort: 'date_desc',
      searchQuery,
      viewMode,
    });
  }, [allItems, categoryFilter, searchQuery, viewMode]);

  const toggleSelectItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAllToggle = useCallback(() => {
    if (filteredItems.length === 0) return;
    const allFilteredSelected = filteredItems.every((item) => selectedIds.has(item.id));
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredItems.forEach((item) => next.delete(item.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredItems.forEach((item) => next.add(item.id));
        return next;
      });
    }
  }, [filteredItems, selectedIds]);

  const handleConfirmSelection = useCallback(async () => {
    if (selectedIds.size === 0 || isImporting) return;

    const itemsToImport = allItems.filter((item) => selectedIds.has(item.id));
    if (itemsToImport.length === 0) return;

    setIsImporting(true);
    try {
      await onConfirm(itemsToImport);
      onClose();
    } catch (importError) {
      logService.error('Failed to import items from library', importError);
    } finally {
      setIsImporting(false);
    }
  }, [allItems, isImporting, onClose, onConfirm, selectedIds]);

  const handleItemDoubleClick = useCallback(
    async (item: LibraryItem) => {
      if (isImporting) return;
      setIsImporting(true);
      try {
        await onConfirm([item]);
        onClose();
      } catch (importError) {
        logService.error('Failed to import single item from library', importError);
      } finally {
        setIsImporting(false);
      }
    },
    [isImporting, onClose, onConfirm],
  );

  const allFilteredSelected = filteredItems.length > 0 && filteredItems.every((item) => selectedIds.has(item.id));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      contentClassName="w-full max-w-3xl sm:max-w-4xl h-[85vh] max-h-[720px] bg-[var(--theme-bg-primary)] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[var(--theme-border-primary)]"
      noPadding
      ariaLabel={t('attachMenuLibrary')}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)]/40 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--theme-bg-tertiary)] flex items-center justify-center text-[var(--theme-text-primary)]">
            <Library size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--theme-text-primary)] leading-tight">
              {t('attachMenuLibrary')}
            </h2>
            <p className="text-xs text-[var(--theme-text-tertiary)]">
              {interpolate(t('librarySelectedCount'), { count: selectedIds.size })}
            </p>
          </div>
        </div>
        <button type="button" onClick={onClose} className={MODAL_CLOSE_BUTTON_CLASS} aria-label={t('close')}>
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] flex-shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-tertiary)] pointer-events-none"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('librarySearchPlaceholder')}
            className="w-full pl-9 pr-8 py-1.5 text-sm bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] rounded-xl text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] focus:outline-none focus:border-[var(--theme-border-focus)] focus:ring-1 focus:ring-[var(--theme-border-focus)] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] p-0.5 rounded"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[var(--theme-bg-secondary)] p-1 rounded-xl border border-[var(--theme-border-secondary)] text-xs font-medium">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs'
                  : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
              }`}
            >
              {t('libraryTabAll')}
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('image')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                categoryFilter === 'image'
                  ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs'
                  : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
              }`}
            >
              {t('libraryTabImages')}
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('document')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                categoryFilter === 'document'
                  ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs'
                  : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
              }`}
            >
              {t('libraryTabDocuments')}
            </button>
          </div>

          <div className="flex items-center bg-[var(--theme-bg-secondary)] p-1 rounded-xl border border-[var(--theme-border-secondary)]">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title={t('libraryViewGrid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs'
                  : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
              }`}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title={t('libraryViewList')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs'
                  : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
              }`}
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center py-20 text-[var(--theme-text-tertiary)] gap-3">
            <Loader2 size={32} className="animate-spin text-[var(--theme-text-primary)]" />
            <p className="text-sm">{t('loading')}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-20 text-[var(--theme-text-tertiary)] gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--theme-bg-tertiary)] flex items-center justify-center text-[var(--theme-text-secondary)]">
              <FolderOpen size={24} />
            </div>
            <p className="text-sm font-medium text-[var(--theme-text-primary)]">{t('libraryEmptyTitle')}</p>
            <p className="text-xs max-w-sm text-center">{t('libraryEmptyDesc')}</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {filteredItems.map((item) => {
              const isSelected = selectedIds.has(item.id);
              const ext = item.name.includes('.') ? item.name.split('.').pop()?.toUpperCase() : '';

              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelectItem(item.id)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                  className={`group relative flex flex-col rounded-xl border transition-all duration-150 cursor-pointer overflow-hidden select-none ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/40 bg-blue-500/5 shadow-sm'
                      : 'border-[var(--theme-border-secondary)] hover:border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]/50 hover:bg-[var(--theme-bg-secondary)]'
                  }`}
                >
                  <div className="relative w-full aspect-[4/3] bg-[var(--theme-bg-tertiary)]/40 overflow-hidden flex items-center justify-center">
                    <LibraryItemThumbnail item={item} size="full" className="w-full h-full object-contain" />

                    <div
                      className={`absolute bottom-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all shadow-sm ${
                        isSelected
                          ? 'bg-blue-600 text-white scale-100 opacity-100'
                          : 'bg-black/30 border border-white/70 text-transparent group-hover:opacity-100 opacity-0 scale-90 group-hover:scale-100'
                      }`}
                    >
                      <Check size={12} strokeWidth={3} />
                    </div>
                  </div>

                  <div className="p-2.5 flex flex-col gap-1 flex-1 justify-between bg-[var(--theme-bg-secondary)]/40">
                    <div className="text-xs font-medium text-[var(--theme-text-primary)] truncate" title={item.name}>
                      {item.name}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[var(--theme-text-tertiary)]">
                      {ext ? (
                        <span className="px-1.5 py-0.5 rounded bg-[var(--theme-bg-tertiary)] font-mono text-[10px] font-semibold uppercase">
                          {ext}
                        </span>
                      ) : (
                        <span>-</span>
                      )}
                      <span>{formatFileSize(item.size)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-[var(--theme-border-secondary)] text-xs text-[var(--theme-text-tertiary)] font-medium">
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={handleSelectAllToggle}
                      className="rounded border-[var(--theme-border-secondary)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                      aria-label={t('librarySelectAll')}
                    />
                  </th>
                  <th className="py-2.5 px-3 font-normal">{t('libraryName')}</th>
                  <th className="py-2.5 px-3 font-normal w-28">{t('libraryModifiedTime')}</th>
                  <th className="py-2.5 px-3 font-normal w-24 text-right">{t('librarySize')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-border-secondary)]/50 text-xs">
                {filteredItems.map((item) => {
                  const isSelected = selectedIds.has(item.id);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => toggleSelectItem(item.id)}
                      onDoubleClick={() => handleItemDoubleClick(item)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-500/10 hover:bg-blue-500/15' : 'hover:bg-[var(--theme-bg-secondary)]'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectItem(item.id)}
                          className="rounded border-[var(--theme-border-secondary)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-3">
                          <LibraryItemThumbnail item={item} size="sm" className="w-8 h-8 rounded-lg" />
                          <div className="truncate max-w-xs sm:max-w-md">
                            <p className="font-medium text-[var(--theme-text-primary)] truncate" title={item.name}>
                              {item.name}
                            </p>
                            {item.sessionTitle && (
                              <p className="text-[11px] text-[var(--theme-text-tertiary)] truncate">
                                {interpolate(t('libraryFromSession'), { title: item.sessionTitle })}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[var(--theme-text-tertiary)] whitespace-nowrap">
                        {formatLibraryDate(item.timestamp, language)}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--theme-text-tertiary)] text-right whitespace-nowrap font-mono">
                        {formatFileSize(item.size)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)]/40 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--theme-text-secondary)]">
            {interpolate(t('librarySelectedCount'), { count: selectedIds.size })}
          </span>
          {filteredItems.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAllToggle}
              className="text-xs text-[var(--theme-text-link)] hover:underline font-medium cursor-pointer"
            >
              {allFilteredSelected ? t('libraryDeselectAll') : t('librarySelectAll')}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 text-xs font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-xl transition-colors border border-[var(--theme-border-secondary)] cursor-pointer"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirmSelection}
            disabled={selectedIds.size === 0 || isImporting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            {isImporting && <Loader2 size={14} className="animate-spin" />}
            <span>
              {t('libraryAddFiles')}
              {selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
