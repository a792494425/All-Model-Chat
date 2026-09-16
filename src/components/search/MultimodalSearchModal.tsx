import React, { useRef, useState, useEffect } from 'react';
import {
  Search,
  X,
  Layers,
  RotateCw,
  Image as ImageIcon,
  Download,
  AlertCircle,
  Plus,
  Check,
  Loader2,
} from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { Toggle } from '@/components/shared/Toggle';
import { useMultimodalSearchStore } from '@/stores/multimodalSearchStore';
import { useI18n } from '@/contexts/I18nContext';
import { useUIStore } from '@/stores/uiStore';
import { useChatStore } from '@/stores/chatStore';
import { formatFileSize } from '@/utils/file/fileSize';
import { triggerDownload } from '@/utils/export/core';
import { dbService } from '@/services/db/dbService';
import { resolveLibraryItemToUploadedFile } from '@/utils/library/libraryFiles';
import { LibraryItemThumbnail } from '@/components/library/LibraryItemThumbnail';
import { interpolate } from '@/i18n/interpolate';
import type { MultimodalMediaCategory, MultimodalSearchResult } from '@/services/embedding/embeddingTypes';
import type { LibraryItem } from '@/types';

export const MultimodalSearchModal: React.FC = () => {
  const { t } = useI18n();
  const isOpen = useMultimodalSearchStore((state) => state.isOpen);
  const closeModal = useMultimodalSearchStore((state) => state.closeModal);
  const searchQuery = useMultimodalSearchStore((state) => state.searchQuery);
  const setSearchQuery = useMultimodalSearchStore((state) => state.setSearchQuery);
  const searchImagePreviewUrl = useMultimodalSearchStore((state) => state.searchImagePreviewUrl);
  const setSearchImage = useMultimodalSearchStore((state) => state.setSearchImage);
  const clearSearchImage = useMultimodalSearchStore((state) => state.clearSearchImage);
  const categoryFilter = useMultimodalSearchStore((state) => state.categoryFilter);
  const setCategoryFilter = useMultimodalSearchStore((state) => state.setCategoryFilter);
  const isSearching = useMultimodalSearchStore((state) => state.isSearching);
  const isIndexing = useMultimodalSearchStore((state) => state.isIndexing);
  const isAutoIndexEnabled = useMultimodalSearchStore((state) => state.isAutoIndexEnabled);
  const setIsAutoIndexEnabled = useMultimodalSearchStore((state) => state.setIsAutoIndexEnabled);
  const indexedCount = useMultimodalSearchStore((state) => state.indexedCount);
  const indexProgress = useMultimodalSearchStore((state) => state.indexProgress);
  const results = useMultimodalSearchStore((state) => state.results);
  const searchError = useMultimodalSearchStore((state) => state.searchError);
  const executeSearch = useMultimodalSearchStore((state) => state.executeSearch);
  const triggerIndexing = useMultimodalSearchStore((state) => state.triggerIndexing);

  const setActiveView = useUIStore((state) => state.setActiveView);
  const setActiveSessionId = useChatStore((state) => state.setActiveSessionId);
  const setSelectedFiles = useChatStore((state) => state.setSelectedFiles);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedResultIds, setSelectedResultIds] = useState<Set<string>>(new Set());
  const [isInserting, setIsInserting] = useState(false);

  useEffect(() => {
    setSelectedResultIds(new Set());
  }, [results, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void executeSearch();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setSearchImage(file, previewUrl);
      e.target.value = '';
      void executeSearch();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file);
      setSearchImage(file, previewUrl);
      void executeSearch();
    }
  };

  const handleJumpToSession = (sessionId?: string) => {
    if (!sessionId) return;
    setActiveSessionId(sessionId);
    setActiveView('chat');
    closeModal();
  };

  const resolveSearchResultToUploadedFile = async (result: MultimodalSearchResult) => {
    const item = result.item;
    const libraryItem: LibraryItem = {
      id: item.id,
      name: item.name,
      type: item.type,
      size: item.size || 0,
      timestamp: item.createdAt || item.updatedAt,
      sessionId: item.sessionId,
      sessionTitle: item.sessionTitle,
      messageId: item.messageId,
      source: 'uploaded',
      isStandalone: item.isStandalone,
      dataUrl: item.thumbnailUrl,
    };

    return resolveLibraryItemToUploadedFile(libraryItem, (i) => dbService.fetchLibraryFileBlob(i), {
      generateNewId: true,
    });
  };

  const handleInsertSingleItem = async (result: MultimodalSearchResult) => {
    setIsInserting(true);
    try {
      const uploadedFile = await resolveSearchResultToUploadedFile(result);
      const currentFiles = useChatStore.getState().selectedFiles;
      const alreadyExists = currentFiles.some(
        (f) => f.id === uploadedFile.id || (f.name === uploadedFile.name && f.size === uploadedFile.size),
      );
      if (!alreadyExists) {
        setSelectedFiles([...currentFiles, uploadedFile]);
      }
      setActiveView('chat');
      closeModal();
    } catch {
      setActiveView('chat');
      closeModal();
    } finally {
      setIsInserting(false);
    }
  };

  const handleBatchInsert = async () => {
    if (selectedResultIds.size === 0 || isInserting) return;
    setIsInserting(true);
    try {
      const selectedResults = results.filter((r) => selectedResultIds.has(r.item.id));
      const resolvedFiles = await Promise.all(selectedResults.map((res) => resolveSearchResultToUploadedFile(res)));
      const currentFiles = useChatStore.getState().selectedFiles;
      const newFiles = resolvedFiles.filter(
        (newF) => !currentFiles.some((f) => f.id === newF.id || (f.name === newF.name && f.size === newF.size)),
      );
      setSelectedFiles([...currentFiles, ...newFiles]);
      setActiveView('chat');
      closeModal();
    } catch {
      setActiveView('chat');
      closeModal();
    } finally {
      setIsInserting(false);
    }
  };

  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedResultIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllToggle = () => {
    if (selectedResultIds.size === results.length) {
      setSelectedResultIds(new Set());
    } else {
      setSelectedResultIds(new Set(results.map((r) => r.item.id)));
    }
  };

  const handleDownloadItem = async (result: MultimodalSearchResult) => {
    const item = result.item;
    const libraryItem: LibraryItem = {
      id: item.id,
      name: item.name,
      type: item.type,
      size: item.size || 0,
      timestamp: item.createdAt || item.updatedAt,
      sessionId: item.sessionId,
      sessionTitle: item.sessionTitle,
      messageId: item.messageId,
      source: 'uploaded',
      isStandalone: item.isStandalone,
      dataUrl: item.thumbnailUrl,
    };

    const blob = await dbService.fetchLibraryFileBlob(libraryItem);
    if (blob) {
      const url = URL.createObjectURL(blob);
      triggerDownload(url, item.name, true);
    } else if (item.thumbnailUrl) {
      triggerDownload(item.thumbnailUrl, item.name, false);
    }
  };

  const getSimilarityBadge = (similarity: number) => {
    const pct = Math.round(similarity * 100);
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-black/60 text-white backdrop-blur-xs shadow-sm">
        {pct}%
      </span>
    );
  };

  const categories: { key: MultimodalMediaCategory | 'all'; label: string }[] = [
    { key: 'all', label: t('multimodalSearchAll') },
    { key: 'image', label: t('libraryTabImages') },
    { key: 'document', label: t('libraryTabDocuments') },
    { key: 'audio', label: t('libraryTabAudio') },
    { key: 'video', label: t('libraryTabVideo') },
  ];

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      contentClassName="w-[94vw] max-w-4xl max-h-[88vh] flex flex-col rounded-2xl bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] shadow-2xl overflow-hidden p-0"
      ariaLabel={t('multimodalSearchTitle')}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--theme-border-primary)] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Layers size={20} className="text-[var(--theme-text-secondary)] shrink-0" strokeWidth={2} />
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-[var(--theme-text-primary)] leading-tight">
              {t('multimodalSearchTitle')}
            </h2>
            <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 hidden sm:block">
              {t('multimodalSearchSubtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--theme-bg-tertiary)]"
            title={t('multimodalSearchAutoIndexTooltip')}
          >
            <span className="text-xs text-[var(--theme-text-secondary)] select-none hidden sm:inline">
              {t('multimodalSearchAutoIndex')}
            </span>
            <Toggle
              id="multimodal-auto-index-toggle"
              checked={isAutoIndexEnabled}
              onChange={setIsAutoIndexEnabled}
              ariaLabel={t('multimodalSearchAutoIndex')}
            />
          </div>

          <button
            type="button"
            onClick={() => void triggerIndexing()}
            disabled={isIndexing}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors disabled:opacity-50 cursor-pointer"
            title={t('multimodalSearchUpdateIndex')}
          >
            <RotateCw size={12} className={isIndexing ? 'animate-spin' : ''} />
            <span>
              {isIndexing
                ? t('multimodalSearchIndexing')
                : interpolate(t('multimodalSearchIndexedCount'), { count: indexedCount })}
            </span>
          </button>

          <button
            type="button"
            onClick={closeModal}
            aria-label="Close"
            className="p-1.5 rounded-full text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div
        className={`px-6 py-4 flex flex-col gap-3 border-b border-[var(--theme-border-primary)] transition-colors ${
          isDragOver ? 'bg-[var(--theme-bg-tertiary)]' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1 flex items-center bg-[var(--theme-bg-tertiary)] rounded-full px-3.5 py-2 focus-within:ring-1 focus-within:ring-[var(--theme-border-focus)] transition-all">
            <Search size={18} className="text-[var(--theme-text-tertiary)] flex-shrink-0 mr-2.5" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('multimodalSearchPlaceholder')}
              className="w-full bg-transparent text-sm text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-tertiary)] outline-none border-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  void executeSearch();
                }}
                aria-label="Clear input"
                className="p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] rounded-full transition-colors cursor-pointer mr-1"
              >
                <X size={15} />
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] rounded-full transition-colors cursor-pointer"
              title={t('multimodalSearchByImage')}
              aria-label={t('multimodalSearchByImage')}
            >
              <ImageIcon size={17} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => void executeSearch()}
            disabled={isSearching}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--theme-text-primary)] text-[var(--theme-bg-primary)] hover:opacity-90 active:scale-95 text-sm font-medium transition-all flex-shrink-0 cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {isSearching ? <RotateCw size={15} className="animate-spin" /> : <Search size={15} />}
            <span>{t('search')}</span>
          </button>
        </div>

        {searchImagePreviewUrl && (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] w-fit text-xs">
            <img
              src={searchImagePreviewUrl}
              alt="Search reference"
              className="w-8 h-8 object-cover rounded-lg border border-[var(--theme-border-primary)]"
            />
            <span className="font-medium text-[var(--theme-text-primary)]">
              {searchQuery.trim() ? t('multimodalSearchCombinedQuery') : t('multimodalSearchByImage')}
            </span>
            <button
              type="button"
              onClick={clearSearchImage}
              className="p-1 rounded-full text-[var(--theme-text-tertiary)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Remove query image"
            >
              <X size={13} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1">
          {categories.map((cat) => {
            const isActive = categoryFilter === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategoryFilter(cat.key)}
                className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]'
                    : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {isIndexing && indexProgress && (
        <div className="px-6 py-2 bg-[var(--theme-bg-secondary)] border-b border-[var(--theme-border-primary)] flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
            <span className="font-medium">
              {t('multimodalSearchIndexing')}
              {indexProgress.currentItemName ? ` (${indexProgress.currentItemName})` : ''}
            </span>
            <span className="text-[var(--theme-text-tertiary)] font-mono">
              {indexProgress.current} / {indexProgress.total}
            </span>
          </div>
          <div className="w-full h-1 bg-[var(--theme-bg-tertiary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--theme-text-primary)] transition-all duration-300"
              style={{
                width: `${indexProgress.total > 0 ? (indexProgress.current / indexProgress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {searchError && (
        <div className="mx-6 my-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs text-red-500">
          <AlertCircle size={15} className="flex-shrink-0" />
          <span>{searchError}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {isSearching ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-56 rounded-2xl bg-[var(--theme-bg-secondary)] animate-pulse border border-[var(--theme-border-primary)]"
              />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {results.map((res) => {
              const item = res.item;
              const isSelected = selectedResultIds.has(item.id);
              const libraryItem: LibraryItem = {
                id: item.id,
                name: item.name,
                type: item.type,
                size: item.size || 0,
                timestamp: item.createdAt || item.updatedAt,
                sessionId: item.sessionId,
                sessionTitle: item.sessionTitle,
                messageId: item.messageId,
                source: 'uploaded',
                isStandalone: item.isStandalone,
                dataUrl: item.thumbnailUrl,
              };

              return (
                <div
                  key={item.id}
                  className={`group flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/50 bg-[var(--theme-bg-secondary)]'
                      : 'border-[var(--theme-border-primary)] hover:border-[var(--theme-border-secondary)] hover:shadow-sm bg-[var(--theme-bg-secondary)]'
                  }`}
                >
                  <div className="relative w-full aspect-[4/3] bg-[var(--theme-bg-tertiary)] overflow-hidden flex items-center justify-center">
                    <LibraryItemThumbnail item={libraryItem} size="full" className="w-full h-full object-contain" />

                    <button
                      type="button"
                      onClick={(e) => handleToggleSelect(item.id, e)}
                      className={`absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-black/50 text-white/80 hover:text-white hover:bg-black/70 sm:opacity-0 sm:group-hover:opacity-100'
                      }`}
                      title={isSelected ? t('multimodalSearchDeselectAll') : t('multimodalSearchSelectAll')}
                      aria-label={isSelected ? t('multimodalSearchDeselectAll') : t('multimodalSearchSelectAll')}
                    >
                      {isSelected ? (
                        <Check size={14} strokeWidth={2.5} />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded border border-white/60" />
                      )}
                    </button>

                    <div
                      className="absolute top-2.5 right-2.5 flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/60 backdrop-blur-xs p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => void handleInsertSingleItem(res)}
                          title={t('multimodalSearchInsertIntoChat')}
                          aria-label={t('multimodalSearchInsertIntoChat')}
                          className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                        >
                          <Plus size={14} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDownloadItem(res)}
                          title={t('libraryDownload')}
                          aria-label={t('libraryDownload')}
                          className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                        >
                          <Download size={14} strokeWidth={2} />
                        </button>
                      </div>
                      {getSimilarityBadge(res.similarity)}
                    </div>
                  </div>

                  <div className="p-3 sm:p-3.5 flex flex-col justify-between flex-1 gap-2">
                    <div>
                      <h4 className="text-sm font-medium text-[var(--theme-text-primary)] truncate" title={item.name}>
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[var(--theme-text-tertiary)]">
                        <span>{formatFileSize(item.size || 0)}</span>
                        <span>•</span>
                        <span className="uppercase">{item.category}</span>
                      </div>
                    </div>

                    {item.sessionTitle && (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleJumpToSession(item.sessionId)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleJumpToSession(item.sessionId);
                          }
                        }}
                        className="text-xs text-[var(--theme-text-tertiary)] hover:text-[var(--theme-accent)] hover:underline truncate cursor-pointer transition-colors"
                        title={item.sessionTitle}
                      >
                        {interpolate(t('libraryFromSession'), { title: item.sessionTitle })}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--theme-border-secondary)]">
                      <button
                        type="button"
                        onClick={() => void handleInsertSingleItem(res)}
                        disabled={isInserting}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-text-primary)] hover:text-[var(--theme-bg-primary)] text-xs font-medium text-[var(--theme-text-secondary)] transition-colors cursor-pointer disabled:opacity-50"
                        title={t('multimodalSearchInsertIntoChat')}
                      >
                        {isInserting ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Plus size={13} strokeWidth={2} />
                        )}
                        <span>{t('multimodalSearchInsertIntoChat')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDownloadItem(res)}
                        className="p-1.5 rounded-lg bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-primary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors cursor-pointer"
                        title={t('libraryDownload')}
                        aria-label={t('libraryDownload')}
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 gap-3">
            <div className="p-4 rounded-full bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)]">
              <Layers size={28} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--theme-text-primary)]">
                {searchQuery || searchImagePreviewUrl
                  ? t('multimodalSearchNoResults')
                  : t('multimodalSearchPlaceholder')}
              </p>
              <p className="text-xs text-[var(--theme-text-tertiary)] mt-1">
                {interpolate(t('multimodalSearchIndexedCount'), { count: indexedCount })}
              </p>
            </div>
            {indexedCount === 0 && !isIndexing && (
              <button
                type="button"
                onClick={() => void triggerIndexing()}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--theme-text-primary)] text-[var(--theme-bg-primary)] text-xs font-medium hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                <RotateCw size={13} />
                <span>{t('multimodalSearchUpdateIndex')}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {selectedResultIds.size > 0 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-[var(--theme-text-secondary)]">
              {interpolate(t('multimodalSearchSelectedCount'), { count: selectedResultIds.size })}
            </span>
            <button
              type="button"
              onClick={handleSelectAllToggle}
              className="text-xs text-[var(--theme-text-link)] hover:underline font-medium cursor-pointer"
            >
              {selectedResultIds.size === results.length
                ? t('multimodalSearchDeselectAll')
                : t('multimodalSearchSelectAll')}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedResultIds(new Set())}
              disabled={isInserting}
              className="px-3 py-1.5 text-xs font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-xl transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleBatchInsert()}
              disabled={isInserting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              {isInserting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} strokeWidth={2.5} />}
              <span>{interpolate(t('multimodalSearchBatchInsert'), { count: selectedResultIds.size })}</span>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
