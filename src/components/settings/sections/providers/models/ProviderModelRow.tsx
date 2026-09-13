import React from 'react';
import { Square, CheckSquare, Pin, Eye, Lightbulb, Wrench, Settings, Trash2, Activity, Loader2 } from 'lucide-react';
import type { ModelOption, ThirdPartyApiProtocol, ThirdPartyTemplateId } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { ProviderAvatar } from '@/components/settings/sections/providers/ProviderAvatar';
import { formatContextWindow, getOrInferModelCapabilities } from '@/utils/model/knownModelsCatalog';
import { formatLatency, getLatencyBadgeStyles, type ConnectionHealthProbeResult } from '@/utils/thirdPartyDiagnostics';

export interface ProviderModelRowProps {
  model: ModelOption;
  protocol?: ThirdPartyApiProtocol;
  templateId?: ThirdPartyTemplateId;
  isSelected: boolean;
  isBatchMode: boolean;
  onToggleSelect: (modelId: string) => void;
  onToggleVisible: (modelId: string, visible: boolean) => void;
  onToggleThinking: (modelId: string, thinking: boolean) => void;
  onToggleTools: (modelId: string, tools: boolean) => void;
  onProbeSingle: (modelId: string) => void;
  isProbing: boolean;
  probeResult?: ConnectionHealthProbeResult;
  onOpenConfig: (model: ModelOption) => void;
  onDelete: (modelId: string) => void;
}

export const ProviderModelRow: React.FC<ProviderModelRowProps> = ({
  model,
  templateId,
  isSelected,
  isBatchMode,
  onToggleSelect,
  onToggleVisible,
  onToggleThinking,
  onToggleTools,
  onProbeSingle,
  isProbing,
  probeResult,
  onOpenConfig,
  onDelete,
}) => {
  const { t } = useI18n();
  const isVisible = model.visibleInSelector !== false;
  const isThinking = Boolean(model.enableThinking);
  const isTools = model.enableTools !== false;
  const caps = { ...getOrInferModelCapabilities(model), ...(model.capabilities || {}) };

  return (
    <div
      className={`group flex items-center justify-between gap-3 px-3 py-2 rounded-xl transition-all ${
        isSelected
          ? 'bg-[var(--theme-border-focus)]/10 border-[var(--theme-border-focus)]/50 ring-1 ring-[var(--theme-border-focus)]/30'
          : 'bg-[var(--theme-bg-primary)]/80 hover:bg-[var(--theme-bg-secondary)]/60 border border-[var(--theme-border-secondary)]/30 hover:border-[var(--theme-border-secondary)]'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(model.id);
          }}
          className={`p-0.5 rounded cursor-pointer transition-all ${
            isBatchMode || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
          }`}
          title={isSelected ? t('thirdPartyDeselectModel') || 'Deselect' : t('thirdPartySelectModel') || 'Select'}
        >
          {isSelected ? (
            <CheckSquare size={14} className="text-[var(--theme-border-focus)]" />
          ) : (
            <Square
              size={14}
              className="text-[var(--theme-text-secondary)]/50 hover:text-[var(--theme-text-secondary)]"
            />
          )}
        </button>

        <ProviderAvatar
          name={model.name || model.id}
          modelId={model.id}
          modelName={model.name}
          templateId={templateId}
          size={24}
          className="text-[11px]"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {model.isPinned && (
              <span title="Pinned" className="inline-flex">
                <Pin size={11} className="text-[var(--theme-border-focus)] fill-current shrink-0" />
              </span>
            )}
            <span
              className={`text-xs font-medium truncate ${
                isVisible
                  ? 'text-[var(--theme-text-primary)]'
                  : 'text-[var(--theme-text-secondary)] line-through opacity-70'
              }`}
              title={model.name || model.id}
            >
              {model.name || model.id}
            </span>

            {caps.free && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                Free
              </span>
            )}
            {model.contextWindow && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-[var(--theme-bg-secondary)] text-[var(--theme-text-secondary)] border border-[var(--theme-border-primary)]/60">
                {formatContextWindow(model.contextWindow)}
              </span>
            )}
            {(caps.thinking || isThinking) && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25">
                Thinking
              </span>
            )}
            {caps.vision && (
              <span className="px-1 py-0.2 rounded text-[9px] font-medium bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                Vision
              </span>
            )}
            {caps.image && (
              <span className="px-1 py-0.2 rounded text-[9px] font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                Image
              </span>
            )}
            {caps.audio && (
              <span className="px-1 py-0.2 rounded text-[9px] font-medium bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                Audio
              </span>
            )}

            {isProbing ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] bg-[var(--theme-bg-secondary)] text-[var(--theme-text-secondary)] border border-[var(--theme-border-primary)]/60">
                <Loader2 size={10} className="animate-spin" />
                <span>{t('thirdPartyTesting') || 'Testing...'}</span>
              </span>
            ) : probeResult ? (
              probeResult.status === 'success' ? (
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-medium ${
                    getLatencyBadgeStyles(probeResult.grade).badge
                  }`}
                  title={
                    t('thirdPartyLatencyTooltip', { latency: probeResult.latencyMs }) || `${probeResult.latencyMs}ms`
                  }
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${getLatencyBadgeStyles(probeResult.grade).dot}`} />
                  <span>{formatLatency(probeResult.latencyMs)}</span>
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 cursor-help"
                  title={probeResult.errorMessage || probeResult.diagnosticTip || 'Test failed'}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>
                    {probeResult.errorMessage?.includes('404')
                      ? '404'
                      : probeResult.errorMessage?.includes('401')
                        ? '401'
                        : probeResult.errorMessage?.includes('429')
                          ? '429'
                          : t('thirdPartyFailed') || 'Failed'}
                  </span>
                </span>
              )
            ) : null}
          </div>

          {model.name && model.name !== model.id && (
            <div className="text-[10px] font-mono text-[var(--theme-text-secondary)]/70 truncate">{model.id}</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => onProbeSingle(model.id)}
          disabled={isProbing}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 ${
            probeResult?.status === 'success'
              ? 'text-emerald-500 hover:bg-emerald-500/10'
              : probeResult?.status === 'error'
                ? 'text-rose-500 hover:bg-rose-500/10'
                : 'text-[var(--theme-text-secondary)]/40 hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]'
          }`}
          title={t('thirdPartyProbeSingleModel') || 'Test connection speed'}
        >
          {isProbing ? <Loader2 size={13} className="animate-spin" /> : <Activity size={13} />}
        </button>

        <button
          type="button"
          onClick={() => onToggleVisible(model.id, !isVisible)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isVisible
              ? 'text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20'
              : 'text-[var(--theme-text-secondary)]/40 hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]'
          }`}
          title={
            isVisible
              ? t('thirdPartyModelVisibleTooltip') || 'Visible in picker'
              : t('thirdPartyModelHiddenTooltip') || 'Hidden in picker'
          }
        >
          <Eye size={13} />
        </button>

        <button
          type="button"
          onClick={() => onToggleThinking(model.id, !isThinking)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isThinking
              ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
              : 'text-[var(--theme-text-secondary)]/40 hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]'
          }`}
          title={
            isThinking
              ? t('thirdPartyThinkingEnabledTooltip') || 'Thinking enabled'
              : t('thirdPartyThinkingDisabledTooltip') || 'Thinking disabled'
          }
        >
          <Lightbulb size={13} />
        </button>

        <button
          type="button"
          onClick={() => onToggleTools(model.id, !isTools)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isTools
              ? 'text-sky-500 bg-sky-500/10 hover:bg-sky-500/20'
              : 'text-[var(--theme-text-secondary)]/40 hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]'
          }`}
          title={
            isTools
              ? t('thirdPartyToolsEnabledTooltip') || 'Tools enabled'
              : t('thirdPartyToolsDisabledTooltip') || 'Tools disabled'
          }
        >
          <Wrench size={13} />
        </button>

        <button
          type="button"
          onClick={() => onOpenConfig(model)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            model.parameters && Object.keys(model.parameters).length > 0
              ? 'text-[var(--theme-border-focus)] bg-[var(--theme-border-focus)]/10'
              : 'text-[var(--theme-text-secondary)]/40 hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]'
          }`}
          title={t('settingsModelConfigTitle') || 'Model Configuration'}
        >
          <Settings size={13} />
        </button>

        <button
          type="button"
          onClick={() => onDelete(model.id)}
          className="p-1.5 rounded-lg text-[var(--theme-text-secondary)]/40 hover:text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]/10 transition-colors cursor-pointer"
          title={t('thirdPartyDeleteModel') || 'Delete model'}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};
