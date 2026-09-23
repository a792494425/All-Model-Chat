import React from 'react';
import {
  Square,
  CheckSquare,
  Pin,
  Eye,
  EyeOff,
  Lightbulb,
  Wrench,
  Settings,
  Trash2,
  Activity,
  Loader2,
  MoreHorizontal,
} from 'lucide-react';
import type { ModelOption, ThirdPartyApiProtocol, ThirdPartyTemplateId } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { ProviderAvatar } from '@/components/settings/sections/providers/ProviderAvatar';
import { formatContextWindow, getOrInferModelCapabilities } from '@/utils/model/knownModelsCatalog';
import {
  formatLatency,
  getLatencyBadgeStyles,
  type ConnectionHealthProbeResult,
} from '@/utils/third-party/thirdPartyDiagnostics';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/shared/DropdownMenu';

export interface ProviderModelRowProps {
  model: ModelOption;
  protocol?: ThirdPartyApiProtocol | 'gemini';
  templateId?: ThirdPartyTemplateId;
  isSelected: boolean;
  isBatchMode: boolean;
  onToggleSelect: (modelId: string) => void;
  onToggleVisible: (modelId: string, visible: boolean) => void;
  onToggleThinking: (modelId: string, thinking: boolean) => void;
  onToggleTools: (modelId: string, tools: boolean) => void;
  onTogglePin?: (modelId: string, pinned: boolean) => void;
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
  onTogglePin,
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
  const isPinned = Boolean(model.isPinned);
  const caps = { ...getOrInferModelCapabilities(model), ...(model.capabilities || {}) };

  return (
    <div
      className={`group flex items-center justify-between gap-3 px-3 py-2 rounded-xl transition-all ${
        isSelected
          ? 'bg-[var(--theme-border-focus)]/10 border-[var(--theme-border-focus)]/50 ring-1 ring-[var(--theme-border-focus)]/30'
          : isVisible
            ? 'bg-[var(--theme-bg-primary)]/80 hover:bg-[var(--theme-bg-secondary)]/60 border border-[var(--theme-border-secondary)]/30 hover:border-[var(--theme-border-secondary)]'
            : 'bg-[var(--theme-bg-secondary)]/20 hover:bg-[var(--theme-bg-secondary)]/40 border border-[var(--theme-border-secondary)]/20 hover:border-[var(--theme-border-secondary)]/40'
      }`}
    >
      <div
        className={`flex items-center gap-2.5 min-w-0 flex-1 transition-opacity ${
          isVisible ? 'opacity-100' : 'opacity-45 group-hover:opacity-75'
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(model.id);
          }}
          className={`p-0.5 rounded cursor-pointer transition-all flex-shrink-0 ${
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
          className={`text-[11px] flex-shrink-0 transition-all ${!isVisible ? 'grayscale opacity-75' : ''}`}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-xs font-medium truncate ${
                isVisible ? 'text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-secondary)]'
              }`}
              title={model.name || model.id}
            >
              {model.name || model.id}
            </span>

            {caps.free && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                {t('thirdPartyCapabilityFree') || 'Free'}
              </span>
            )}
            {model.contextWindow && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-[var(--theme-bg-secondary)] text-[var(--theme-text-secondary)] border border-[var(--theme-border-primary)]/60">
                {formatContextWindow(model.contextWindow)}
              </span>
            )}
            {(caps.thinking || isThinking) && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25">
                {t('thirdPartyCapabilityThinking') || 'Thinking'}
              </span>
            )}
            {caps.vision && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                {t('thirdPartyCapabilityVision') || 'Vision'}
              </span>
            )}
            {caps.image && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                {t('thirdPartyCapabilityImage') || 'Image'}
              </span>
            )}
            {caps.audio && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                {t('thirdPartyCapabilityAudio') || 'Audio'}
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

      <div className="flex items-center gap-0.5 flex-shrink-0">
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
              ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
              : 'text-[var(--theme-text-secondary)]/35 hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]'
          }`}
          title={
            isVisible
              ? t('thirdPartyModelVisibleTooltip') || 'Visible in picker'
              : t('thirdPartyModelHiddenTooltip') || 'Hidden in picker'
          }
        >
          {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
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
          <Settings size={14} />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-1.5 rounded-lg text-[var(--theme-text-secondary)]/40 hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors cursor-pointer"
              title={t('shortcutsMoreActionsAria') || 'More options'}
              aria-label={t('shortcutsMoreActionsAria') || 'More options'}
            >
              <MoreHorizontal size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onProbeSingle(model.id)} disabled={isProbing}>
              {isProbing ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
              <span>{t('thirdPartyProbeSingleModel') || 'Test latency'}</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onToggleThinking(model.id, !isThinking)}>
              <Lightbulb size={14} className={isThinking ? 'text-amber-500' : 'text-[var(--theme-text-secondary)]'} />
              <span>
                {isThinking
                  ? t('thirdPartyThinkingEnabledTooltip') || 'Thinking enabled'
                  : t('thirdPartyThinkingDisabledTooltip') || 'Thinking disabled'}
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onToggleTools(model.id, !isTools)}>
              <Wrench size={14} className={isTools ? 'text-sky-500' : 'text-[var(--theme-text-secondary)]'} />
              <span>
                {isTools
                  ? t('thirdPartyToolsEnabledTooltip') || 'Tools enabled'
                  : t('thirdPartyToolsDisabledTooltip') || 'Tools disabled'}
              </span>
            </DropdownMenuItem>

            {onTogglePin && (
              <DropdownMenuItem onClick={() => onTogglePin(model.id, !isPinned)}>
                <Pin
                  size={14}
                  className={
                    isPinned ? 'text-[var(--theme-border-focus)] fill-current' : 'text-[var(--theme-text-secondary)]'
                  }
                />
                <span>{isPinned ? t('historyUnpin') || 'Unpin model' : t('settingsPinModel') || 'Pin model'}</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem variant="danger" onClick={() => onDelete(model.id)}>
              <Trash2 size={14} />
              <span>{t('thirdPartyDeleteModel') || 'Delete model'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
