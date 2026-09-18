import React from 'react';
import { SlidersHorizontal, ArrowUpRight } from 'lucide-react';
import type { ThirdPartyConnection } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { useSettingsUiStore } from '@/stores/settingsUiStore';
import { ProviderEndpointPreview } from './ProviderEndpointPreview';
import { ProviderEditDialog } from './ProviderEditDialog';
import { ModelSyncModal } from './ModelSyncModal';
import { ProviderModelListSection } from './models/ProviderModelListSection';
import { useProviderDetailLogic } from './provider-detail/useProviderDetailLogic';
import { ProviderDetailHeader } from './provider-detail/ProviderDetailHeader';
import { ProviderConnectionCredentials } from './provider-detail/ProviderConnectionCredentials';
import { ProviderProbeSummaryBanner } from './provider-detail/ProviderProbeSummaryBanner';

interface ProviderDetailProps {
  connection: ThirdPartyConnection;
  onUpdateConnection: (updates: Partial<ThirdPartyConnection>) => void;
  onDuplicateConnection?: () => void;
  onDeleteConnection: () => void;
  onCloseModal?: () => void;
}

export const ProviderDetail: React.FC<ProviderDetailProps> = ({
  connection,
  onUpdateConnection,
  onDuplicateConnection,
  onDeleteConnection,
  onCloseModal: _onCloseModal,
}) => {
  const { t } = useI18n();
  const logic = useProviderDetailLogic({
    connection,
    onUpdateConnection,
  });

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-[var(--theme-bg-primary)] overflow-hidden">
      <ProviderDetailHeader
        connection={connection}
        onUpdateConnection={onUpdateConnection}
        onDuplicateConnection={onDuplicateConnection}
        onOpenEdit={() => logic.setIsEditOpen(true)}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-[var(--theme-border-secondary)]/40 bg-[var(--theme-bg-secondary)]/25 text-xs text-[var(--theme-text-secondary)]">
          <div className="flex items-center gap-2 min-w-0">
            <SlidersHorizontal size={14} className="text-[var(--theme-text-link)] shrink-0" />
            <span className="truncate">{t('thirdPartyGenerationSettingsHint')}</span>
          </div>
          <button
            type="button"
            onClick={() => useSettingsUiStore.getState().setActiveTab('models')}
            className="shrink-0 flex items-center gap-1 font-medium text-[var(--theme-text-link)] hover:underline hover:text-[var(--theme-text-primary)] transition-colors cursor-pointer"
          >
            <span>{t('settingsTabModels')}</span>
            <ArrowUpRight size={13} />
          </button>
        </div>

        <ProviderConnectionCredentials
          connection={connection}
          onUpdateConnection={onUpdateConnection}
          templateLinks={logic.templateLinks}
          showApiKey={logic.showApiKey}
          setShowApiKey={logic.setShowApiKey}
          healthStatus={logic.healthStatus}
          healthResult={logic.healthResult}
          setConnectionHealthResult={logic.setConnectionHealthResult}
          onTestConnection={logic.handleTestConnection}
          onOpenEdit={() => logic.setIsEditOpen(true)}
          endpointPreview={<ProviderEndpointPreview protocol={connection.protocol} baseUrl={connection.baseUrl} />}
        />

        <ProviderProbeSummaryBanner
          batchSummary={logic.batchSummary}
          onDisableFailedModels={logic.handleDisableFailedModels}
          onDismiss={() => logic.setBatchSummary(null)}
        />

        <ProviderModelListSection
          providerId={connection.id}
          providerName={connection.name}
          protocol={connection.protocol}
          templateId={connection.templateId}
          models={connection.models}
          onUpdateModels={logic.handleUpdateModels}
          onProbeSingleModel={logic.handleSingleModelProbe}
          onProbeBatchModels={logic.handleBatchHealthCheck}
          isProbingBatch={logic.isCheckingBatch}
          probingModelIds={logic.probingModelIds}
          modelProbeResults={logic.modelProbeResults}
          onStopProbe={logic.handleStopBatchHealthCheck}
          batchProgress={logic.batchProgress}
          onSyncRemoteModels={logic.handleSyncModels}
          isSyncingRemoteModels={logic.isSyncingModels}
        />
      </div>

      <ProviderEditDialog
        isOpen={logic.isEditOpen}
        connection={connection}
        onClose={() => logic.setIsEditOpen(false)}
        onSave={(updates) => onUpdateConnection(updates)}
        onDelete={onDeleteConnection}
      />

      <ModelSyncModal
        isOpen={logic.isSyncModalOpen}
        onClose={() => logic.setIsSyncModalOpen(false)}
        connectionName={connection.name}
        templateId={connection.templateId}
        remoteModels={logic.syncRemoteModels}
        existingModels={connection.models}
        onApply={logic.handleApplySyncModels}
      />
    </div>
  );
};
