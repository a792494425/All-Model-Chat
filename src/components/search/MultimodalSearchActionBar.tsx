import React from 'react';
import { Loader2, Plus } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { interpolate } from '@/i18n/interpolate';

export interface MultimodalSearchActionBarProps {
  selectedCount: number;
  totalResultsCount: number;
  isInserting: boolean;
  onSelectAllToggle: () => void;
  onClearSelection: () => void;
  onBatchInsert: () => void | Promise<void>;
}

export const MultimodalSearchActionBar: React.FC<MultimodalSearchActionBarProps> = ({
  selectedCount,
  totalResultsCount,
  isInserting,
  onSelectAllToggle,
  onClearSelection,
  onBatchInsert,
}) => {
  const { t } = useI18n();

  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)] flex-shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-[var(--theme-text-secondary)]">
          {interpolate(t('multimodalSearchSelectedCount'), { count: selectedCount })}
        </span>
        <button
          type="button"
          onClick={onSelectAllToggle}
          className="text-xs text-[var(--theme-text-link)] hover:underline font-medium cursor-pointer"
        >
          {selectedCount === totalResultsCount ? t('multimodalSearchDeselectAll') : t('multimodalSearchSelectAll')}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClearSelection}
          disabled={isInserting}
          className="px-3 py-1.5 text-xs font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-xl transition-colors cursor-pointer"
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          onClick={() => void onBatchInsert()}
          disabled={isInserting}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors shadow-xs cursor-pointer"
        >
          {isInserting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} strokeWidth={2.5} />}
          <span>{interpolate(t('multimodalSearchBatchInsert'), { count: selectedCount })}</span>
        </button>
      </div>
    </div>
  );
};
