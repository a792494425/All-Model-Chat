import React from 'react';
import { Trash2 } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface ModelSyncBatchActionsBarProps {
  newModelsCount: number;
  staleModelsCount: number;
  selectedNewCount: number;
  selectedStaleCount: number;
  displayItemsCount: number;
  toggleAllNew: () => void;
  selectAllStaleForRemoval: () => void;
}

export const ModelSyncBatchActionsBar: React.FC<ModelSyncBatchActionsBarProps> = ({
  newModelsCount,
  staleModelsCount,
  selectedNewCount,
  selectedStaleCount,
  displayItemsCount,
  toggleAllNew,
  selectAllStaleForRemoval,
}) => {
  const { t } = useI18n();

  return (
    <div className="px-6 py-2 bg-[var(--theme-bg-secondary)]/30 border-b border-[var(--theme-border-primary)]/40 flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
      <div className="flex items-center gap-4">
        {newModelsCount > 0 && (
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-[var(--theme-text-primary)] select-none">
            <input
              type="checkbox"
              checked={selectedNewCount === newModelsCount && newModelsCount > 0}
              onChange={toggleAllNew}
              className="rounded text-blue-600 focus:ring-0 cursor-pointer"
            />
            <span>{t('thirdPartySelectAllNew', { selected: selectedNewCount, total: newModelsCount })}</span>
          </label>
        )}
        {staleModelsCount > 0 && (
          <button
            type="button"
            onClick={selectAllStaleForRemoval}
            className="flex items-center gap-1 text-rose-500 hover:text-rose-600 font-medium"
          >
            <Trash2 size={13} />
            <span>
              {selectedStaleCount === staleModelsCount
                ? t('thirdPartyUncheckPruneStale')
                : t('thirdPartyCheckPruneStale')}{' '}
              ({selectedStaleCount}/{staleModelsCount})
            </span>
          </button>
        )}
      </div>
      <span className="text-[11px] opacity-75">{t('thirdPartyDisplayItems', { count: displayItemsCount })}</span>
    </div>
  );
};
