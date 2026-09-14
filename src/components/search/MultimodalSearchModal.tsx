import React, { useRef, useState, useEffect } from 'react';
import {
  Search,
  X,
  Sparkles,
  RotateCw,
  Image as ImageIcon,
  MessageSquare,
  Download,
  AlertCircle,
  ExternalLink,
  Layers,
  FileText,
  Music,
  Video,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
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

  const handleStartChatWithFile = async (result: MultimodalSearchResult) => {
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

    try {
      const uploadedFile = await resolveLibraryItemToUploadedFile(
        libraryItem,
        (i) => dbService.fetchLibraryFileBlob(i),
        { generateNewId: true },
      );
      setSelectedFiles([uploadedFile]);
      setActiveView('chat');
      closeModal();
    } catch {
      setActiveView('chat');
      closeModal();
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
    if (pct >= 85) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
          <Sparkles size={11} />
          {pct}%
        </span>
      );
    }
    if (pct >= 70) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-500 border border-sky-500/30">
          {pct}%
        </span>
      );
    }
    if (pct >= 50) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30">
          {pct}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/15 text-zinc-400 border border-zinc-500/30">
        {pct}%
      </span>
    );
  };

  const categories: { key: MultimodalMediaCategory | 'all'; label: string; icon: LucideIcon }[] = [
    { key: 'all', label: t('multimodalSearchAll'), icon: Layers },
    { key: 'image', label: t('libraryTabImages'), icon: ImageIcon },
    { key: 'document', label: t('libraryTabDocuments'), icon: FileText },
    { key: 'audio', label: t('libraryTabAudio'), icon: Music },
    { key: 'video', label: t('libraryTabVideo'), icon: Video },
  ];

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      contentClassName="w-[94vw] max-w-4xl max-h-[88vh] flex flex-col rounded-2xl bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] shadow-2xl overflow-hidden p-0"
      ariaLabel={t('multimodalSearchTitle')}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--theme-border-primary)] flex-shrink-0 bg-[var(--theme-bg-secondary)]/40">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 text-sky-500 border border-sky-500/30">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[var(--theme-text-primary)]">
                {t('multimodalSearchTitle')}
              </h2>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)]">
                gemini-embedding-2
              </span>
            </div>
            <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5">
              {t('multimodalSearchSubtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void triggerIndexing()}
            disabled={isIndexing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] transition-all disabled:opacity-50 cursor-pointer"
            title={t('multimodalSearchUpdateIndex')}
          >
            <RotateCw size={13} className={isIndexing ? 'animate-spin text-sky-500' : ''} />
            <span>
              {isIndexing
                ? t('multimodalSearchIndexing')
                : interpolate(t('multimodalSearchIndexedCount'), { count: indexedCount })}
            </span>
          </button>

          <button
            onClick={closeModal}
            aria-label="Close"
            className="p-2 rounded-full text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div
        className={`p-5 flex flex-col gap-4 border-b border-[var(--theme-border-primary)] transition-colors ${
          isDragOver ? 'bg-sky-500/10' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--theme-text-tertiary)]">
              <Search size={18} />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('multimodalSearchPlaceholder')}
              className="w-full pl-10 pr-10 py-2.5 text-sm bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-tertiary)] rounded-xl border border-[var(--theme-border-secondary)] focus:border-[var(--theme-border-focus)] focus:bg-[var(--theme-bg-primary)] outline-none transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  void executeSearch();
                }}
                aria-label="Clear input"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] text-sm font-medium transition-all flex-shrink-0 cursor-pointer"
            title={t('multimodalSearchByImage')}
          >
            <ImageIcon size={16} />
            <span className="hidden sm:inline">{t('multimodalSearchByImage')}</span>
          </button>

          <button
            onClick={() => void executeSearch()}
            disabled={isSearching}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--theme-accent)] text-[var(--theme-bg-primary)] hover:opacity-90 active:scale-95 text-sm font-semibold transition-all flex-shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isSearching ? <RotateCw size={16} className="animate-spin" /> : <Search size={16} />}
            <span>{t('libraryTitle')}</span>
          </button>
        </div>

        {searchImagePreviewUrl && (
          <div className="flex items-center gap-3 p-2 rounded-xl bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-secondary)] w-fit">
            <img
              src={searchImagePreviewUrl}
              alt="Search reference"
              className="w-12 h-12 object-cover rounded-lg border border-[var(--theme-border-primary)]"
            />
            <div className="text-xs">
              <span className="font-medium text-[var(--theme-text-primary)] block">
                {t('multimodalSearchByImage')}
              </span>
              <span className="text-[var(--theme-text-tertiary)]">
                {t('multimodalSearchDropImage')}
              </span>
            </div>
            <button
              onClick={clearSearchImage}
              className="p-1 rounded-full text-[var(--theme-text-tertiary)] hover:text-red-500 hover:bg-red-500/10 ml-2 cursor-pointer"
              title="Remove query image"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = categoryFilter === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setCategoryFilter(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[var(--theme-text-primary)] text-[var(--theme-bg-primary)] shadow-sm'
                    : 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border-secondary)]'
                }`}
              >
                <Icon size={12} />
                <span>{cat.label}</span>
                {isActive && <Check size={12} />}
              </button>
            );
          })}
        </div>
      </div>

      {isIndexing && indexProgress && (
        <div className="px-5 py-2.5 bg-sky-500/10 border-b border-sky-500/20 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-sky-500">
            <span className="font-medium">
              {t('multimodalSearchIndexing')}
              {indexProgress.currentItemName ? ` (${indexProgress.currentItemName})` : ''}
            </span>
            <span>
              {indexProgress.current} / {indexProgress.total}
            </span>
          </div>
          <div className="w-full h-1.5 bg-sky-500/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 transition-all duration-300"
              style={{
                width: `${indexProgress.total > 0 ? (indexProgress.current / indexProgress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {searchError && (
        <div className="mx-5 my-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs text-red-500">
          <AlertCircle size={15} className="flex-shrink-0" />
          <span>{searchError}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-5">
        {isSearching ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-48 rounded-xl bg-[var(--theme-bg-secondary)] animate-pulse border border-[var(--theme-border-secondary)]"
              />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {results.map((res) => {
              const item = res.item;
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
                  className="group flex flex-col rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)] overflow-hidden shadow-sm hover:shadow-md transition-all hover:border-[var(--theme-border-focus)]"
                >
                  <div className="relative h-40 bg-[var(--theme-bg-tertiary)] flex items-center justify-center overflow-hidden border-b border-[var(--theme-border-secondary)]">
                    <LibraryItemThumbnail item={libraryItem} size="lg" className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2">
                      {getSimilarityBadge(res.similarity)}
                    </div>
                  </div>

                  <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
                    <div>
                      <h4
                        className="text-sm font-semibold text-[var(--theme-text-primary)] truncate"
                        title={item.name}
                      >
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[var(--theme-text-tertiary)]">
                        <span>{formatFileSize(item.size || 0)}</span>
                        <span>•</span>
                        <span className="uppercase">{item.category}</span>
                      </div>
                    </div>

                    {item.sessionTitle && (
                      <button
                        onClick={() => handleJumpToSession(item.sessionId)}
                        className="flex items-center gap-1.5 text-xs text-sky-500 hover:underline truncate text-left cursor-pointer"
                        title={item.sessionTitle}
                      >
                        <MessageSquare size={12} className="flex-shrink-0" />
                        <span className="truncate">{item.sessionTitle}</span>
                        <ExternalLink size={11} className="flex-shrink-0 ml-auto" />
                      </button>
                    )}

                    <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--theme-border-secondary)]">
                      <button
                        onClick={() => void handleStartChatWithFile(res)}
                        className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-text-primary)] hover:text-[var(--theme-bg-primary)] text-xs font-medium text-[var(--theme-text-secondary)] transition-colors cursor-pointer"
                        title={t('multimodalSearchStartChatWithFile')}
                      >
                        <MessageSquare size={13} />
                        <span>{t('multimodalSearchStartChatWithFile')}</span>
                      </button>

                      <button
                        onClick={() => void handleDownloadItem(res)}
                        className="p-1.5 rounded-lg bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-primary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors cursor-pointer"
                        title={t('libraryDownload')}
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
              <Sparkles size={32} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--theme-text-primary)]">
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
                onClick={() => void triggerIndexing()}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--theme-accent)] text-[var(--theme-bg-primary)] text-xs font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                <RotateCw size={14} />
                <span>{t('multimodalSearchUpdateIndex')}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
