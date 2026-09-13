import React from 'react';
import {
  Square,
  CheckSquare,
  MinusSquare,
  Eye,
  EyeOff,
  Activity,
  Trash2,
  X,
} from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

export interface ProviderBatchActionBarProps {
  selectedCount: number;
  totalFilteredCount: number;
  isAllSelected: boolean;
  isPartialSelected: boolean;
  onToggleSelectAll: () => void;
  onInvertSelection: () => void;
  onBatchSetVisible: (visible: boolean) => void;
  onBatchProbeSelected: () => void;
  onBatchDelete: () => void;
  onExitBatchMode: () => void;
  isCheckingBatch: boolean;
}

export const ProviderBatchActionBar: React.FC<ProviderBatchActionBarProps> = ({
  selectedCount,
  totalFilteredCount,
  isAllSelected,
  isPartialSelected,
  onToggleSelectAll,
  onInvertSelection,
  onBatchSetVisible,
  onBatchProbeSelected,
  onBatchDelete,
  onExitBatchMode,
  isCheckingBatch,
}) => {
  const { t } = useI18n();

  return (
    <div
      data-testid="batch-action-bar"
      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl border border-[var(--theme-border-focus)]/30 bg-[var(--theme-border-focus)]/5 text-xs animate-in fade-in duration-150 shadow-xs"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleSelectAll}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[var(--theme-border-secondary)]/70 bg-[var(--theme-bg-primary)] hover:bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] font-medium cursor-pointer transition-colors"
        >
          {isAllSelected ? (
            <CheckSquare size={13} className="text-[var(--theme-border-focus)]" />
          ) : isPartialSelected ? (
            <MinusSquare size={13} className="text-[var(--theme-border-focus)]" />
          ) : (
            <Square size={13} className="text-[var(--theme-text-secondary)]" />
          )}
          <span>{isAllSelected ? t('thirdPartyDeselectAll') || 'Deselect All' : t('thirdPartySelectAll') || 'Select All'}</span>
        </button>

        <button
          type="button"
          onClick={onInvertSelection}
          className="px-2 py-1 rounded-lg border border-[var(--theme-border-secondary)]/70 bg-[var(--theme-bg-primary)] hover:bg-[var(--theme-bg-secondary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors cursor-pointer"
        >
          {t('thirdPartyInvertSelection') || 'Invert'}
        </button>

        <span className="text-[var(--theme-text-secondary)] ml-1">
          {t('thirdPartySelectedCount', { selected: selectedCount, total: totalFilteredCount }) ||
            `${selectedCount} / ${totalFilteredCount} selected`}
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => onBatchSetVisible(true)}
          disabled={selectedCount === 0}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title={t('thirdPartyShowSelectedTooltip') || 'Show selected models'}
        >
          <Eye size={12} />
          <span>{t('thirdPartyShow') || 'Show'}</span>
        </button>

        <button
          type="button"
          onClick={() => onBatchSetVisible(false)}
          disabled={selectedCount === 0}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--theme-border-secondary)]/70 bg-[var(--theme-bg-primary)] hover:bg-[var(--theme-bg-secondary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title={t('thirdPartyHideSelectedTooltip') || 'Hide selected models'}
        >
          <EyeOff size={12} />
          <span>{t('thirdPartyHide') || 'Hide'}</span>
        </button>

        <button
          type="button"
          onClick={onBatchProbeSelected}
          disabled={selectedCount === 0 || isCheckingBatch}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title={t('thirdPartyProbeSelectedTooltip') || 'Test selected models'}
        >
          <Activity size={12} />
          <span>{t('thirdPartyProbeSelected') || 'Test Selected'}</span>
        </button>

        <button
          type="button"
          onClick={onBatchDelete}
          disabled={selectedCount === 0}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title={t('thirdPartyDeleteSelectedTooltip') || 'Delete selected models'}
        >
          <Trash2 size={12} />
          <span>{t('delete') || 'Delete'}</span>
        </button>

        <button
          type="button"
          onClick={onExitBatchMode}
          className="p-1 rounded-lg text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors ml-1 cursor-pointer"
          title={t('thirdPartyExitBatchManageTooltip') || 'Exit batch mode'}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
