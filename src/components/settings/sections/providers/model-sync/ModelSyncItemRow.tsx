import React from 'react';
import { Check, Eye, Lightbulb, Wrench } from 'lucide-react';
import type { ModelOption } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { formatContextWindow, getOrInferModelCapabilities } from '@/utils/model/knownModelsCatalog';
import { ProviderAvatar } from '@/components/settings/sections/providers/ProviderAvatar';

interface ModelSyncItemRowProps {
  model: ModelOption;
  status: 'new' | 'existing' | 'stale';
  templateId?: string;
  isNewChecked: boolean;
  isStaleChecked: boolean;
  onToggleNew: (id: string) => void;
  onToggleStale: (id: string) => void;
}

export const ModelSyncItemRow: React.FC<ModelSyncItemRowProps> = ({
  model,
  status,
  templateId,
  isNewChecked,
  isStaleChecked,
  onToggleNew,
  onToggleStale,
}) => {
  const { t } = useI18n();
  const isNew = status === 'new';
  const isStale = status === 'stale';
  const isExisting = status === 'existing';

  const caps = getOrInferModelCapabilities(model);
  const contextLabel = formatContextWindow(model.contextWindow);

  return (
    <div
      key={`${status}-${model.id}`}
      onClick={() => {
        if (isNew) onToggleNew(model.id);
        if (isStale) onToggleStale(model.id);
      }}
      className={`group flex items-center justify-between gap-3 py-2.5 px-3 my-1 rounded-xl transition-colors cursor-pointer select-none border border-[var(--theme-border-primary)]/40 ${
        isNewChecked
          ? 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/25'
          : isStaleChecked
            ? 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/25'
            : 'hover:bg-[var(--theme-bg-secondary)]/40'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="shrink-0 flex items-center">
          {isNew && (
            <input
              type="checkbox"
              checked={isNewChecked}
              onChange={() => onToggleNew(model.id)}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-0 cursor-pointer"
            />
          )}
          {isStale && (
            <input
              type="checkbox"
              checked={isStaleChecked}
              onChange={() => onToggleStale(model.id)}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 rounded text-rose-600 focus:ring-0 cursor-pointer"
            />
          )}
          {isExisting && (
            <div className="w-4 h-4 flex items-center justify-center text-[var(--theme-text-secondary)]/50">
              <Check size={14} />
            </div>
          )}
        </div>

        <ProviderAvatar
          modelId={model.id}
          modelName={model.name}
          templateId={templateId}
          name={model.name || model.id}
          size={24}
          className="text-[11px]"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[var(--theme-text-primary)] truncate">{model.name}</span>

            {isNew && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
                {t('thirdPartyNew')}
              </span>
            )}
            {isStale && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/20">
                {t('thirdPartyStale')}
              </span>
            )}
            {isExisting && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--theme-bg-secondary)] text-[var(--theme-text-secondary)]">
                {t('thirdPartyConfigured')}
              </span>
            )}

            {caps.free && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
                title={t('thirdPartyFreeTooltip')}
              >
                Free
              </span>
            )}

            {contextLabel && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--theme-bg-secondary)] text-[var(--theme-text-secondary)] border border-[var(--theme-border-primary)]">
                {contextLabel}
              </span>
            )}

            {caps.thinking && (
              <span
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/15 text-purple-400 border border-purple-500/20"
                title={t('thirdPartyThinkingSupported')}
              >
                <Lightbulb size={10} />
                <span>Thinking</span>
              </span>
            )}
            {caps.vision && (
              <span
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-teal-500/15 text-teal-400 border border-teal-500/20"
                title={t('thirdPartyVisionSupported')}
              >
                <Eye size={10} />
                <span>Vision</span>
              </span>
            )}
            {caps.image && (
              <span
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20"
                title={t('thirdPartyImageSupported')}
              >
                <span>Image</span>
              </span>
            )}
            {caps.embedding && (
              <span
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20"
                title={t('thirdPartyEmbeddingSupported')}
              >
                <span>Embedding</span>
              </span>
            )}
            {caps.audio && (
              <span
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-500/15 text-rose-400 border border-rose-500/20"
                title={t('thirdPartyAudioSupported')}
              >
                <span>Audio</span>
              </span>
            )}
            {model.capabilities?.tools !== false && !caps.image && !caps.embedding && !caps.audio && (
              <span
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20"
                title={t('thirdPartyToolsSupported')}
              >
                <Wrench size={10} />
                <span>Tools</span>
              </span>
            )}
          </div>

          <div className="text-[11px] text-[var(--theme-text-secondary)] font-mono truncate mt-0.5">{model.id}</div>
        </div>
      </div>

      <div className="shrink-0 text-xs">
        {isNew && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleNew(model.id);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              isNewChecked
                ? 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25'
                : 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
            }`}
          >
            {isNewChecked ? t('thirdPartyWillImport') : t('thirdPartyIgnore')}
          </button>
        )}
        {isStale && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStale(model.id);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              isStaleChecked
                ? 'bg-rose-500/15 text-rose-500 hover:bg-rose-500/25'
                : 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
            }`}
          >
            {isStaleChecked ? t('thirdPartyWillRemove') : t('thirdPartyKeep')}
          </button>
        )}
      </div>
    </div>
  );
};
