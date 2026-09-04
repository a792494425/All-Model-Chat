import React, { useRef, useEffect } from 'react';
import {
  SlidersHorizontal,
  LayoutGrid,
  List,
  MessageSquarePlus,
  Download,
  Trash2,
  Upload,
  Sparkles,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  Presentation,
  Eye,
  Check,
} from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useLibraryStore } from '@/stores/libraryStore';
import { interpolate } from '@/i18n/interpolate';
import type { LibraryCategoryFilter } from '@/types';

interface LibraryToolbarProps {
  selectedCount: number;
  onStartChat: () => void;
  onDownloadSelected: () => void;
  onDeleteSelected: () => void;
}

export const LibraryToolbar: React.FC<LibraryToolbarProps> = ({
  selectedCount,
  onStartChat,
  onDownloadSelected,
  onDeleteSelected,
}) => {
  const { t } = useI18n();
  const viewMode = useLibraryStore((state) => state.viewMode);
  const setViewMode = useLibraryStore((state) => state.setViewMode);
  const categoryFilter = useLibraryStore((state) => state.categoryFilter);
  const setCategoryFilter = useLibraryStore((state) => state.setCategoryFilter);
  const sourceFilter = useLibraryStore((state) => state.sourceFilter);
  const setSourceFilter = useLibraryStore((state) => state.setSourceFilter);
  const fileTypeFilter = useLibraryStore((state) => state.fileTypeFilter);
  const setFileTypeFilter = useLibraryStore((state) => state.setFileTypeFilter);
  const isFilterMenuOpen = useLibraryStore((state) => state.isFilterMenuOpen);
  const setIsFilterMenuOpen = useLibraryStore((state) => state.setIsFilterMenuOpen);

  const filterMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isFilterMenuOpen) {
      return undefined;
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFilterMenuOpen, setIsFilterMenuOpen]);

  const categories: {
    key: LibraryCategoryFilter;
    labelKey: 'libraryTabAll' | 'libraryTabImages' | 'libraryTabDocuments';
  }[] = [
    { key: 'all', labelKey: 'libraryTabAll' },
    { key: 'image', labelKey: 'libraryTabImages' },
    { key: 'document', labelKey: 'libraryTabDocuments' },
  ];

  const hasAdvancedFilters = sourceFilter !== 'all' || fileTypeFilter !== 'all';

  return (
    <div className="flex items-center justify-between gap-3 px-4 sm:px-8 py-3 border-b border-[var(--theme-border-primary)] flex-shrink-0">
      {selectedCount > 0 ? (
        <div className="flex items-center gap-2 flex-wrap animate-in fade-in duration-150">
          <button
            onClick={onStartChat}
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-full bg-[var(--theme-text-primary)] text-[var(--theme-bg-primary)] hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            <MessageSquarePlus size={16} strokeWidth={2} />
            <span>{t('libraryStartChat')}</span>
          </button>

          <button
            onClick={onDownloadSelected}
            className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-full border border-[var(--theme-border-primary)] text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] active:scale-95 transition-all"
          >
            <Download size={15} strokeWidth={2} />
            <span>{t('libraryDownload')}</span>
          </button>

          <button
            onClick={onDeleteSelected}
            className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-full border border-red-500/40 text-red-500 hover:bg-red-500/10 active:scale-95 transition-all"
          >
            <Trash2 size={15} strokeWidth={2} />
            <span>{t('libraryDelete')}</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          {categories.map((cat) => {
            const isActive = categoryFilter === cat.key && fileTypeFilter === 'all';
            return (
              <button
                key={cat.key}
                onClick={() => {
                  setCategoryFilter(cat.key);
                  setFileTypeFilter('all');
                }}
                className={`px-3.5 py-1 text-sm font-medium rounded-full transition-colors ${
                  isActive
                    ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]'
                    : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]'
                }`}
              >
                {t(cat.labelKey)}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-3">
        {selectedCount > 0 ? (
          <span className="text-sm font-medium text-[var(--theme-text-secondary)] hidden sm:inline">
            {interpolate(t('librarySelectedCount'), { count: selectedCount })}
          </span>
        ) : (
          <div className="relative" ref={filterMenuRef}>
            <button
              onClick={() => setIsFilterMenuOpen((prev) => !prev)}
              aria-label="Filter"
              className={`p-2 rounded-lg transition-colors ${
                hasAdvancedFilters || isFilterMenuOpen
                  ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]'
                  : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]'
              }`}
            >
              <SlidersHorizontal size={18} strokeWidth={2} />
            </button>

            {isFilterMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] shadow-xl p-2 z-50 text-sm animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-xs font-semibold text-[var(--theme-text-tertiary)] uppercase tracking-wider">
                  {t('librarySource')}
                </div>
                <button
                  onClick={() => {
                    setSourceFilter(sourceFilter === 'uploaded' ? 'all' : 'uploaded');
                    setIsFilterMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Upload size={14} className="text-[var(--theme-text-secondary)]" />
                    <span>{t('librarySourceUploaded')}</span>
                  </span>
                  {sourceFilter === 'uploaded' && <Check size={14} className="text-[var(--theme-accent)]" />}
                </button>
                <button
                  onClick={() => {
                    setSourceFilter(sourceFilter === 'generated' ? 'all' : 'generated');
                    setIsFilterMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles size={14} className="text-[var(--theme-text-secondary)]" />
                    <span>{t('librarySourceGenerated')}</span>
                  </span>
                  {sourceFilter === 'generated' && <Check size={14} className="text-[var(--theme-accent)]" />}
                </button>

                <div className="my-1.5 border-t border-[var(--theme-border-secondary)]" />

                <div className="px-2.5 py-1 text-xs font-semibold text-[var(--theme-text-tertiary)] uppercase tracking-wider">
                  {t('libraryFileType')}
                </div>
                <button
                  onClick={() => {
                    setFileTypeFilter('image');
                    setCategoryFilter('all');
                    setIsFilterMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <ImageIcon size={14} className="text-[var(--theme-text-secondary)]" />
                    <span>{t('libraryFileTypeImage')}</span>
                  </span>
                  {fileTypeFilter === 'image' && <Check size={14} className="text-[var(--theme-accent)]" />}
                </button>
                <button
                  onClick={() => {
                    setFileTypeFilter('document');
                    setCategoryFilter('all');
                    setIsFilterMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <FileText size={14} className="text-[var(--theme-text-secondary)]" />
                    <span>{t('libraryFileTypeDocument')}</span>
                  </span>
                  {fileTypeFilter === 'document' && <Check size={14} className="text-[var(--theme-accent)]" />}
                </button>
                <button
                  onClick={() => {
                    setFileTypeFilter('spreadsheet');
                    setCategoryFilter('all');
                    setIsFilterMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet size={14} className="text-[var(--theme-text-secondary)]" />
                    <span>{t('libraryFileTypeSpreadsheet')}</span>
                  </span>
                  {fileTypeFilter === 'spreadsheet' && <Check size={14} className="text-[var(--theme-accent)]" />}
                </button>
                <button
                  onClick={() => {
                    setFileTypeFilter('presentation');
                    setCategoryFilter('all');
                    setIsFilterMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Presentation size={14} className="text-[var(--theme-text-secondary)]" />
                    <span>{t('libraryFileTypePresentation')}</span>
                  </span>
                  {fileTypeFilter === 'presentation' && <Check size={14} className="text-[var(--theme-accent)]" />}
                </button>
                <button
                  onClick={() => {
                    setFileTypeFilter('pdf');
                    setCategoryFilter('all');
                    setIsFilterMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <FileText size={14} className="text-red-500" />
                    <span>PDF</span>
                  </span>
                  {fileTypeFilter === 'pdf' && <Check size={14} className="text-[var(--theme-accent)]" />}
                </button>

                <div className="my-1.5 border-t border-[var(--theme-border-secondary)]" />

                <button
                  onClick={() => {
                    setSourceFilter('all');
                    setFileTypeFilter('all');
                    setCategoryFilter('all');
                    setIsFilterMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                >
                  <Eye size={14} className="text-[var(--theme-text-secondary)]" />
                  <span>{t('libraryShowAllFileTypes')}</span>
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 border-l border-[var(--theme-border-secondary)] pl-2">
          <button
            onClick={() => setViewMode('grid')}
            aria-label={t('libraryViewGrid')}
            title={t('libraryViewGrid')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]'
                : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]'
            }`}
          >
            <LayoutGrid size={18} strokeWidth={2} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            aria-label={t('libraryViewList')}
            title={t('libraryViewList')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]'
                : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]'
            }`}
          >
            <List size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
};
