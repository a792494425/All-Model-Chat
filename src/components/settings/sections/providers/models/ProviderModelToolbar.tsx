import React from 'react';
import {
  ChevronsUpDown,
  Search,
  ListChecks,
  Activity,
  RefreshCw,
  Plus,
  RotateCcw,
  Loader2,
  Square,
  X,
} from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

export type ModelCapabilityTab = 'all' | 'text' | 'vision' | 'thinking' | 'image' | 'embedding' | 'audio' | 'free';

interface CapabilityTabDef {
  id: ModelCapabilityTab;
  labelKey: string;
}

const CAPABILITY_TABS: CapabilityTabDef[] = [
  { id: 'all', labelKey: 'thirdPartyCapabilityAll' },
  { id: 'text', labelKey: 'thirdPartyCapabilityText' },
  { id: 'vision', labelKey: 'thirdPartyCapabilityVision' },
  { id: 'thinking', labelKey: 'thirdPartyCapabilityThinking' },
  { id: 'image', labelKey: 'thirdPartyCapabilityImage' },
  { id: 'embedding', labelKey: 'thirdPartyCapabilityEmbedding' },
  { id: 'audio', labelKey: 'thirdPartyCapabilityAudio' },
  { id: 'free', labelKey: 'thirdPartyCapabilityFree' },
];

export interface ProviderModelToolbarProps {
  modelsCount: number;
  activeCapabilityTab: ModelCapabilityTab;
  onSelectCapabilityTab: (tab: ModelCapabilityTab) => void;
  capabilityCounts: Record<ModelCapabilityTab, number>;
  onToggleCollapseAll: () => void;
  isSearchOpen: boolean;
  onToggleSearchOpen: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isBatchMode: boolean;
  onToggleBatchMode: () => void;
  hasSelectedBatch: boolean;
  isCheckingBatch: boolean;
  batchProgress: { completed: number; total: number } | null;
  onProbeAll: () => void;
  onStopProbe: () => void;
  onSyncModels?: () => void;
  isSyncingModels?: boolean;
  onOpenAddModel: () => void;
  onResetDefaultModels?: () => void;
}

export const ProviderModelToolbar: React.FC<ProviderModelToolbarProps> = ({
  modelsCount,
  activeCapabilityTab,
  onSelectCapabilityTab,
  capabilityCounts,
  onToggleCollapseAll,
  isSearchOpen,
  onToggleSearchOpen,
  searchQuery,
  onSearchChange,
  isBatchMode,
  onToggleBatchMode,
  hasSelectedBatch,
  isCheckingBatch,
  batchProgress,
  onProbeAll,
  onStopProbe,
  onSyncModels,
  isSyncingModels = false,
  onOpenAddModel,
  onResetDefaultModels,
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--theme-text-primary)]">
            {t('thirdPartyModelsLabel') || 'Models'}
          </span>
          <button
            type="button"
            onClick={onToggleCollapseAll}
            className="p-1 rounded-md text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
            title={t('thirdPartyToggleCollapseAll') || 'Toggle collapse all'}
          >
            <ChevronsUpDown size={14} />
          </button>
          <button
            type="button"
            onClick={onToggleSearchOpen}
            className={`p-1 rounded-md transition-colors ${
              isSearchOpen || searchQuery
                ? 'text-[var(--theme-border-focus)] bg-[var(--theme-border-focus)]/10'
                : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]'
            }`}
            title={t('thirdPartySearchModels') || 'Search models'}
          >
            <Search size={14} />
          </button>
          <button
            type="button"
            onClick={onToggleBatchMode}
            className={`p-1 rounded-md transition-colors ${
              isBatchMode || hasSelectedBatch
                ? 'text-[var(--theme-border-focus)] bg-[var(--theme-border-focus)]/10'
                : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]'
            }`}
            title={t('thirdPartyBatchManage') || 'Batch management'}
          >
            <ListChecks size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isCheckingBatch ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs font-medium text-amber-600 dark:text-amber-400">
              <Loader2 size={13} className="animate-spin" />
              <span>
                {t('thirdPartyProbingProgress', {
                  completed: batchProgress?.completed ?? 0,
                  total: batchProgress?.total ?? 0,
                }) || `Testing ${batchProgress?.completed ?? 0} / ${batchProgress?.total ?? 0}`}
              </span>
              <button
                type="button"
                onClick={onStopProbe}
                className="ml-1 p-0.5 rounded hover:bg-amber-500/20 transition-colors cursor-pointer"
                title={t('thirdPartyAbortProbe') || 'Abort test'}
              >
                <Square size={11} className="fill-current" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onProbeAll}
              disabled={modelsCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--theme-border-secondary)]/70 bg-[var(--theme-bg-secondary)]/50 hover:bg-[var(--theme-bg-tertiary)] text-xs font-medium text-[var(--theme-text-primary)] transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              title={t('thirdPartyProbeAllTooltip') || 'Test all models'}
            >
              <Activity size={13} className="text-emerald-500" />
              <span>{t('thirdPartyProbe') || 'Test'}</span>
            </button>
          )}

          {onSyncModels && (
            <button
              type="button"
              onClick={onSyncModels}
              disabled={isSyncingModels || isCheckingBatch}
              title={t('thirdPartySyncModelsTooltip') || 'Fetch remote models via /v1/models endpoint'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--theme-border-secondary)]/70 bg-[var(--theme-bg-secondary)]/50 hover:bg-[var(--theme-bg-tertiary)] text-xs font-medium text-[var(--theme-text-primary)] transition-all cursor-pointer disabled:opacity-60 shadow-xs"
            >
              <RefreshCw size={13} className={isSyncingModels ? 'animate-spin text-blue-500' : ''} />
              <span>
                {isSyncingModels
                  ? t('thirdPartySyncingModels') || 'Fetching...'
                  : t('thirdPartySyncModels') || 'Fetch Models'}
              </span>
            </button>
          )}

          {onResetDefaultModels && (
            <button
              type="button"
              onClick={onResetDefaultModels}
              disabled={isCheckingBatch}
              className="p-1.5 rounded-xl border border-[var(--theme-border-secondary)]/70 bg-[var(--theme-bg-secondary)]/50 hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title={t('thirdPartyResetDefaultModelsTooltip') || '恢复官方预设模型列表'}
            >
              <RotateCcw size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAddModel}
            className="p-1.5 rounded-xl border border-[var(--theme-border-secondary)]/70 bg-[var(--theme-bg-secondary)]/50 hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] transition-all cursor-pointer shadow-xs"
            title={t('thirdPartyManualAddModel') || 'Add model manually'}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {modelsCount > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs select-none">
          {CAPABILITY_TABS.filter((tab) => tab.id === 'all' || (capabilityCounts[tab.id] ?? 0) > 0).map((tab) => {
            const isActive = activeCapabilityTab === tab.id;
            const count = capabilityCounts[tab.id] ?? 0;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectCapabilityTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[var(--theme-border-focus)] text-white shadow-xs'
                    : 'bg-[var(--theme-bg-secondary)]/60 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)]/30'
                }`}
              >
                <span>{t(tab.labelKey) || tab.id}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive
                      ? 'bg-white/20 text-white font-semibold'
                      : 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-secondary)]/80'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {isSearchOpen && (
        <div className="relative animate-in fade-in duration-100">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-secondary)]/60 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t('thirdPartyFilterModelPlaceholder') || 'Search models by name or ID...'}
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-[var(--theme-border-secondary)]/60 bg-[var(--theme-bg-secondary)]/20 text-[var(--theme-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-border-focus)]"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] p-0.5"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
