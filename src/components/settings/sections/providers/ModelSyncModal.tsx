import React from 'react';
import { Search } from 'lucide-react';
import type { ModelOption } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { Virtuoso } from 'react-virtuoso';
import { useModelSyncLogic } from './model-sync/useModelSyncLogic';
import { ModelSyncHeader } from './model-sync/ModelSyncHeader';
import { ModelSyncFilterBar } from './model-sync/ModelSyncFilterBar';
import { ModelSyncBatchActionsBar } from './model-sync/ModelSyncBatchActionsBar';
import { ModelSyncItemRow } from './model-sync/ModelSyncItemRow';
import { ModelSyncFooter } from './model-sync/ModelSyncFooter';

export interface ModelSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionName: string;
  templateId?: string;
  remoteModels: ModelOption[];
  existingModels: ModelOption[];
  onApply: (reconciledModels: ModelOption[]) => void;
}

export const ModelSyncModal: React.FC<ModelSyncModalProps> = ({
  isOpen,
  onClose,
  connectionName,
  templateId,
  remoteModels,
  existingModels,
  onApply,
}) => {
  const { t } = useI18n();

  const {
    filterTab,
    setFilterTab,
    searchQuery,
    setSearchQuery,
    stats,
    newModels,
    staleModels,
    selectedNewIds,
    selectedStaleRemoveIds,
    displayItems,
    toggleNewModel,
    toggleStaleModel,
    toggleAllNew,
    selectAllStaleForRemoval,
    handleConfirm,
  } = useModelSyncLogic({
    remoteModels,
    existingModels,
    onApply,
    onClose,
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="model-sync-title"
    >
      <div className="relative w-full max-w-3xl max-h-[88vh] flex flex-col bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded-2xl shadow-2xl overflow-hidden text-[var(--theme-text-primary)]">
        <ModelSyncHeader connectionName={connectionName} totalRemote={stats.totalRemote} onClose={onClose} />

        <ModelSyncFilterBar
          filterTab={filterTab}
          setFilterTab={setFilterTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          totalRemote={stats.totalRemote}
          newCount={stats.newCount}
          existingCount={stats.existingCount}
          staleCount={stats.staleCount}
        />

        <ModelSyncBatchActionsBar
          newModelsCount={newModels.length}
          staleModelsCount={staleModels.length}
          selectedNewCount={selectedNewIds.size}
          selectedStaleCount={selectedStaleRemoveIds.size}
          displayItemsCount={displayItems.length}
          toggleAllNew={toggleAllNew}
          selectAllStaleForRemoval={selectAllStaleForRemoval}
        />

        <div className="flex-1 min-h-[420px] px-6 py-2">
          {displayItems.length === 0 ? (
            <div className="py-14 text-center text-[var(--theme-text-secondary)] flex flex-col items-center gap-2">
              <Search size={28} className="opacity-30" />
              <p className="text-sm">{t('thirdPartyNoMatchingModels')}</p>
            </div>
          ) : (
            <Virtuoso
              style={{ height: '100%', minHeight: '400px' }}
              className="custom-scrollbar"
              data={displayItems}
              initialItemCount={Math.min(displayItems.length, 50)}
              computeItemKey={(_index, item) => `${item.status}-${item.model.id}`}
              itemContent={(_index, { model, status }) => (
                <ModelSyncItemRow
                  key={`${status}-${model.id}`}
                  model={model}
                  status={status}
                  templateId={templateId}
                  isNewChecked={status === 'new' && selectedNewIds.has(model.id)}
                  isStaleChecked={status === 'stale' && selectedStaleRemoveIds.has(model.id)}
                  onToggleNew={toggleNewModel}
                  onToggleStale={toggleStaleModel}
                />
              )}
            />
          )}
        </div>

        <ModelSyncFooter
          selectedStaleCount={selectedStaleRemoveIds.size}
          selectedNewCount={selectedNewIds.size}
          onClose={onClose}
          onConfirm={handleConfirm}
        />
      </div>
    </div>
  );
};
