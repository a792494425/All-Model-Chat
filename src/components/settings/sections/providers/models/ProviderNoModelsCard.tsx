import React from 'react';
import { Sparkles, RefreshCw, Plus } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface ProviderNoModelsCardProps {
  totalModelsCount: number;
  onSyncRemoteModels?: () => void;
  isSyncingRemoteModels?: boolean;
  isProbingBatch?: boolean;
  onOpenAddModel: () => void;
}

export const ProviderNoModelsCard: React.FC<ProviderNoModelsCardProps> = ({
  totalModelsCount,
  onSyncRemoteModels,
  isSyncingRemoteModels = false,
  isProbingBatch = false,
  onOpenAddModel,
}) => {
  const { t } = useI18n();

  if (totalModelsCount === 0) {
    return (
      <div data-testid="provider-no-models-card" className="py-10 px-4 text-center space-y-3.5 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-[var(--theme-bg-tertiary)]/70 border border-[var(--theme-border-secondary)]/40 flex items-center justify-center mx-auto text-[var(--theme-text-secondary)] shadow-xs">
          <Sparkles size={22} className="text-amber-500/80" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-[var(--theme-text-primary)]">
            {t('thirdPartyNoModelsCardTitle') || 'No Models Configured'}
          </h4>
          <p className="text-xs text-[var(--theme-text-secondary)] leading-relaxed">
            {t('thirdPartyNoModelsCardDesc') ||
              'You can pull available models directly from the remote /v1/models endpoint, or add models manually.'}
          </p>
        </div>
        <div className="flex items-center justify-center gap-2.5 pt-1">
          {onSyncRemoteModels && (
            <button
              type="button"
              onClick={onSyncRemoteModels}
              disabled={isSyncingRemoteModels || isProbingBatch}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--theme-border-focus)] hover:bg-[var(--theme-border-focus)]/90 text-white text-xs font-medium transition-all cursor-pointer disabled:opacity-60 shadow-xs"
            >
              <RefreshCw size={13} className={isSyncingRemoteModels ? 'animate-spin' : ''} />
              <span>{t('thirdPartyFetchModelsAction') || 'Fetch Models (/v1/models)'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenAddModel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--theme-border-secondary)]/70 bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] text-xs font-medium transition-all cursor-pointer shadow-xs"
          >
            <Plus size={13} />
            <span>{t('thirdPartyManualAddModel') || 'Add Manually'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 text-center text-xs text-[var(--theme-text-secondary)]">
      {t('thirdPartyNoMatchingFilteredModels') || 'No matching models found.'}
    </div>
  );
};
