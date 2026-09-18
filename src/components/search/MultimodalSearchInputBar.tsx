import React, { type ChangeEvent, type DragEvent, type KeyboardEvent, type RefObject } from 'react';
import { Search, X, Image as ImageIcon, RotateCw } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import type { MultimodalMediaCategory } from '@/services/embedding/embeddingTypes';

export interface MultimodalSearchInputBarProps {
  searchInputRef: RefObject<HTMLInputElement>;
  fileInputRef: RefObject<HTMLInputElement>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchImagePreviewUrl: string | null;
  clearSearchImage: () => void;
  categoryFilter: MultimodalMediaCategory | 'all';
  setCategoryFilter: (category: MultimodalMediaCategory | 'all') => void;
  isSearching: boolean;
  isDragOver: boolean;
  handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  handleImageSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  handleDragOver: (e: DragEvent) => void;
  handleDragLeave: () => void;
  handleDrop: (e: DragEvent) => void;
  executeSearch: () => void | Promise<void>;
}

export const MultimodalSearchInputBar: React.FC<MultimodalSearchInputBarProps> = ({
  searchInputRef,
  fileInputRef,
  searchQuery,
  setSearchQuery,
  searchImagePreviewUrl,
  clearSearchImage,
  categoryFilter,
  setCategoryFilter,
  isSearching,
  isDragOver,
  handleKeyDown,
  handleImageSelect,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  executeSearch,
}) => {
  const { t } = useI18n();

  const categories: { key: MultimodalMediaCategory | 'all'; label: string }[] = [
    { key: 'all', label: t('multimodalSearchAll') },
    { key: 'image', label: t('libraryTabImages') },
    { key: 'document', label: t('libraryTabDocuments') },
    { key: 'audio', label: t('libraryTabAudio') },
    { key: 'video', label: t('libraryTabVideo') },
  ];

  return (
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
  );
};
