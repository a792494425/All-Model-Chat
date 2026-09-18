import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import type { BatchHealthCheckSummary } from '@/utils/model/modelHealthCheck';

export interface ProviderProbeSummaryBannerProps {
  batchSummary: BatchHealthCheckSummary | null;
  onDisableFailedModels: () => void;
  onDismiss: () => void;
}

export const ProviderProbeSummaryBanner: React.FC<ProviderProbeSummaryBannerProps> = ({
  batchSummary,
  onDisableFailedModels,
  onDismiss,
}) => {
  const { t } = useI18n();

  if (!batchSummary || batchSummary.errorCount === 0) return null;

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300 animate-in fade-in duration-150">
      <div className="flex items-center gap-2">
        <AlertCircle size={15} className="text-amber-500 flex-shrink-0" />
        <span>
          {t('thirdPartyProbeSummaryBanner', {
            successCount: batchSummary.successCount,
            errorCount: batchSummary.errorCount,
            latency: batchSummary.avgLatencyMs,
          })}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={onDisableFailedModels}
          className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 font-medium text-amber-800 dark:text-amber-200 transition-colors cursor-pointer"
        >
          {t('thirdPartyDisableFailedModels')}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 transition-colors cursor-pointer"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
};
