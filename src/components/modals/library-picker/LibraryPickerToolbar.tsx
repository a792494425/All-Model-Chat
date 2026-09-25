import React, { type RefObject } from 'react';
import {
  ArrowUpDown,
  Check,
  FileSpreadsheet,
  FileText,
  Layers,
  LayoutGrid,
  List,
  Presentation,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shared/Popover';
import type { LibraryCategoryFilter, LibraryFileTypeFilter, LibrarySortOption, LibrarySourceFilter } from '@/types';

export interface LibraryPickerToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: LibraryCategoryFilter;
  setCategoryFilter: (category: LibraryCategoryFilter) => void;
  sourceFilter: LibrarySourceFilter;
  setSourceFilter: (source: LibrarySourceFilter) => void;
  fileTypeFilter: LibraryFileTypeFilter;
  setFileTypeFilter: (fileType: LibraryFileTypeFilter) => void;
  sortOption: LibrarySortOption;
  setSortOption: (sort: LibrarySortOption) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  isFilterMenuOpen: boolean;
  setIsFilterMenuOpen: (open: boolean) => void;
  hasAdvancedFilters: boolean;
  handleResetFilters: () => void;
  handleSelectSubtype: (type: LibraryFileTypeFilter) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  t: (key: string) => string;
}

export const LibraryPickerToolbar: React.FC<LibraryPickerToolbarProps> = ({
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  sourceFilter,
  setSourceFilter,
  fileTypeFilter,
  setFileTypeFilter,
  sortOption,
  setSortOption,
  viewMode,
  setViewMode,
  isFilterMenuOpen,
  setIsFilterMenuOpen,
  hasAdvancedFilters,
  handleResetFilters,
  handleSelectSubtype,
  searchInputRef,
  t,
}) => {
  const categories: {
    key: LibraryCategoryFilter;
    labelKey: 'libraryTabAll' | 'libraryTabImages' | 'libraryTabDocuments' | 'libraryTabAudio' | 'libraryTabVideo';
  }[] = [
    { key: 'all', labelKey: 'libraryTabAll' },
    { key: 'image', labelKey: 'libraryTabImages' },
    { key: 'document', labelKey: 'libraryTabDocuments' },
    { key: 'audio', labelKey: 'libraryTabAudio' },
    { key: 'video', labelKey: 'libraryTabVideo' },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 px-5 py-2.5 border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] flex-shrink-0">
      <div className="relative flex-1 min-w-[180px]">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-tertiary)] pointer-events-none"
        />
        <input
          ref={searchInputRef as React.Ref<HTMLInputElement>}
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t('librarySearchPlaceholder')}
          className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] rounded-xl text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] focus:outline-none focus:border-[var(--theme-border-focus)] focus:ring-1 focus:ring-[var(--theme-border-focus)] transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] p-0.5 rounded cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center bg-[var(--theme-bg-secondary)] p-1 rounded-xl border border-[var(--theme-border-secondary)] text-xs font-medium overflow-x-auto no-scrollbar">
          {categories.map((cat) => {
            const isActive = categoryFilter === cat.key && fileTypeFilter === 'all';
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => {
                  setCategoryFilter(cat.key);
                  setFileTypeFilter('all');
                }}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs font-semibold'
                    : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
                }`}
              >
                {t(cat.labelKey)}
              </button>
            );
          })}
        </div>

        <Popover open={isFilterMenuOpen} onOpenChange={setIsFilterMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={t('librarySort')}
              title={t('librarySort')}
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                hasAdvancedFilters || isFilterMenuOpen
                  ? 'bg-[var(--theme-bg-tertiary)] border-[var(--theme-border-focus)] text-[var(--theme-text-primary)] shadow-xs'
                  : 'border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]'
              }`}
            >
              <SlidersHorizontal size={15} strokeWidth={2} />
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-64 rounded-2xl p-2 text-xs max-h-[calc(80vh-180px)] overflow-y-auto custom-scrollbar"
          >
            <div className="px-2.5 py-1 text-[11px] font-semibold text-[var(--theme-text-tertiary)] uppercase tracking-wider">
              {t('librarySource')}
            </div>
            <button
              type="button"
              onClick={() => {
                setSourceFilter('all');
                setIsFilterMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Layers size={14} className="text-[var(--theme-text-secondary)]" />
                <span>{t('librarySourceAll')}</span>
              </span>
              {sourceFilter === 'all' && <Check size={14} className="text-[var(--theme-accent)]" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setSourceFilter('uploaded');
                setIsFilterMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Upload size={14} className="text-[var(--theme-text-secondary)]" />
                <span>{t('librarySourceUploaded')}</span>
              </span>
              {sourceFilter === 'uploaded' && <Check size={14} className="text-[var(--theme-accent)]" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setSourceFilter('generated');
                setIsFilterMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Sparkles size={14} className="text-[var(--theme-text-secondary)]" />
                <span>{t('librarySourceGenerated')}</span>
              </span>
              {sourceFilter === 'generated' && <Check size={14} className="text-[var(--theme-accent)]" />}
            </button>

            <div className="my-1.5 border-t border-[var(--theme-border-secondary)]" />

            <div className="px-2.5 py-1 text-[11px] font-semibold text-[var(--theme-text-tertiary)] uppercase tracking-wider">
              {t('libraryDocFormats')}
            </div>
            <button
              type="button"
              onClick={() => handleSelectSubtype('all')}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <FileText size={14} className="text-[var(--theme-text-secondary)]" />
                <span>{t('libraryDocFormatAll')}</span>
              </span>
              {fileTypeFilter === 'all' && <Check size={14} className="text-[var(--theme-accent)]" />}
            </button>
            <button
              type="button"
              onClick={() => handleSelectSubtype('pdf')}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <FileText size={14} className="text-red-500" />
                <span>PDF</span>
              </span>
              {fileTypeFilter === 'pdf' && <Check size={14} className="text-[var(--theme-accent)]" />}
            </button>
            <button
              type="button"
              onClick={() => handleSelectSubtype('spreadsheet')}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <FileSpreadsheet size={14} className="text-emerald-500" />
                <span>{t('libraryFileTypeSpreadsheet')}</span>
              </span>
              {fileTypeFilter === 'spreadsheet' && <Check size={14} className="text-[var(--theme-accent)]" />}
            </button>
            <button
              type="button"
              onClick={() => handleSelectSubtype('presentation')}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Presentation size={14} className="text-amber-500" />
                <span>{t('libraryFileTypePresentation')}</span>
              </span>
              {fileTypeFilter === 'presentation' && <Check size={14} className="text-[var(--theme-accent)]" />}
            </button>

            <div className="my-1.5 border-t border-[var(--theme-border-secondary)]" />

            <div className="px-2.5 py-1 text-[11px] font-semibold text-[var(--theme-text-tertiary)] uppercase tracking-wider flex items-center gap-1.5">
              <ArrowUpDown size={12} />
              <span>{t('librarySort')}</span>
            </div>
            {(
              [
                { key: 'date_desc', labelKey: 'librarySortDateDesc' },
                { key: 'date_asc', labelKey: 'librarySortDateAsc' },
                { key: 'size_desc', labelKey: 'librarySortSizeDesc' },
                { key: 'size_asc', labelKey: 'librarySortSizeAsc' },
                { key: 'name_asc', labelKey: 'librarySortNameAsc' },
                { key: 'name_desc', labelKey: 'librarySortNameDesc' },
              ] as { key: LibrarySortOption; labelKey: string }[]
            ).map((sort) => (
              <button
                key={sort.key}
                type="button"
                onClick={() => {
                  setSortOption(sort.key);
                  setIsFilterMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors cursor-pointer"
              >
                <span>{t(sort.labelKey)}</span>
                {sortOption === sort.key && <Check size={14} className="text-[var(--theme-accent)]" />}
              </button>
            ))}

            {hasAdvancedFilters && (
              <>
                <div className="my-1.5 border-t border-[var(--theme-border-secondary)]" />
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="w-full flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--theme-text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>{t('libraryResetFilters')}</span>
                </button>
              </>
            )}
          </PopoverContent>
        </Popover>

        <div className="flex items-center bg-[var(--theme-bg-secondary)] p-1 rounded-xl border border-[var(--theme-border-secondary)]">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            title={t('libraryViewGrid')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs'
                : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
            }`}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            title={t('libraryViewList')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'list'
                ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-xs'
                : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
            }`}
          >
            <List size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
