import React, { type RefObject } from 'react';
import { Search, X } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import type { CloudFileCategoryFilter } from './useCloudFilesLogic';

export interface CloudFilesToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: CloudFileCategoryFilter;
  setCategoryFilter: (category: CloudFileCategoryFilter) => void;
  searchInputRef: RefObject<HTMLInputElement>;
}

export const CloudFilesToolbar: React.FC<CloudFilesToolbarProps> = ({
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  searchInputRef,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] flex-shrink-0">
      <div className="relative flex-1 min-w-[180px]">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-tertiary)] pointer-events-none"
        />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t('search')}
          className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 bg-[var(--theme-bg-secondary)] p-1 rounded-xl border border-[var(--theme-border-secondary)] text-xs font-medium">
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
            categoryFilter === 'all'
              ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs font-semibold'
              : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
          }`}
        >
          {t('cloudFilesFilterAll')}
        </button>
        <button
          type="button"
          onClick={() => setCategoryFilter('video')}
          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
            categoryFilter === 'video'
              ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs font-semibold'
              : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
          }`}
        >
          {t('cloudFilesFilterVideo')}
        </button>
        <button
          type="button"
          onClick={() => setCategoryFilter('audio')}
          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
            categoryFilter === 'audio'
              ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs font-semibold'
              : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
          }`}
        >
          {t('cloudFilesFilterAudio')}
        </button>
        <button
          type="button"
          onClick={() => setCategoryFilter('document')}
          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
            categoryFilter === 'document'
              ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs font-semibold'
              : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
          }`}
        >
          {t('cloudFilesFilterDocument')}
        </button>
        <button
          type="button"
          onClick={() => setCategoryFilter('image')}
          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
            categoryFilter === 'image'
              ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs font-semibold'
              : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
          }`}
        >
          {t('cloudFilesFilterImage')}
        </button>
      </div>
    </div>
  );
};
