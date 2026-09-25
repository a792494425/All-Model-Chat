import React, { type MouseEvent } from 'react';
import { AlertCircle, Layers, RotateCw } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { interpolate } from '@/i18n/interpolate';
import type { MultimodalSearchResult } from '@/services/embedding/embeddingTypes';
import { MultimodalSearchResultCard } from './MultimodalSearchResultCard';

export interface MultimodalSearchResultsViewProps {
  isIndexing: boolean;
  indexProgress: { current: number; total: number; currentItemName?: string } | null;
  indexedCount: number;
  searchError: string | null;
  isSearching: boolean;
  results: MultimodalSearchResult[];
  selectedResultIds: Set<string>;
  isInserting: boolean;
  searchQuery: string;
  searchImagePreviewUrl: string | null;
  onToggleSelect: (id: string, e?: MouseEvent) => void;
  onInsertSingleItem: (result: MultimodalSearchResult) => void | Promise<void>;
  onDownloadItem: (result: MultimodalSearchResult) => void | Promise<void>;
  onJumpToSession: (sessionId?: string) => void;
  onTriggerIndexing: () => void | Promise<void>;
}

export const MultimodalSearchResultsView: React.FC<MultimodalSearchResultsViewProps> = ({
  isIndexing,
  indexProgress,
  indexedCount,
  searchError,
  isSearching,
  results,
  selectedResultIds,
  isInserting,
  searchQuery,
  searchImagePreviewUrl,
  onToggleSelect,
  onInsertSingleItem,
  onDownloadItem,
  onJumpToSession,
  onTriggerIndexing,
}) => {
  const { t } = useI18n();

  return (
    <>
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
            {[1, 2, 3, 4, 5, 6].map((skeletonIndex) => (
              <div
                key={skeletonIndex}
                className="h-56 rounded-2xl bg-[var(--theme-bg-secondary)] animate-pulse border border-[var(--theme-border-primary)]"
              />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {results.map((result) => (
              <MultimodalSearchResultCard
                key={result.item.id}
                result={result}
                isSelected={selectedResultIds.has(result.item.id)}
                isInserting={isInserting}
                onToggleSelect={onToggleSelect}
                onInsertSingleItem={onInsertSingleItem}
                onDownloadItem={onDownloadItem}
                onJumpToSession={onJumpToSession}
              />
            ))}
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
                onClick={() => void onTriggerIndexing()}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--theme-text-primary)] text-[var(--theme-bg-primary)] text-xs font-medium hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                <RotateCw size={13} />
                <span>{t('multimodalSearchUpdateIndex')}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
};
