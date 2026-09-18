import React from 'react';
import type { TemplatePresetMeta } from '@/utils/thirdPartyApiProviders';
import { useI18n } from '@/contexts/I18nContext';
import { ProviderAvatar } from '@/components/settings/sections/providers/ProviderAvatar';

interface UnconfiguredPresetsListProps {
  filteredPresets: TemplatePresetMeta[];
  selectedConnectionId: string | null;
  onSelectConnection: (key: string) => void;
}

export const UnconfiguredPresetsList: React.FC<UnconfiguredPresetsListProps> = ({
  filteredPresets,
  selectedConnectionId,
  onSelectConnection,
}) => {
  const { t } = useI18n();

  if (filteredPresets.length === 0) return null;

  return (
    <div className="space-y-1 pt-1 border-t border-[var(--theme-border-secondary)]/30">
      <div className="flex items-center justify-between px-2 py-0.5">
        <span className="text-[10px] font-semibold tracking-wider text-[var(--theme-text-secondary)]/60 uppercase">
          {t('thirdPartyTabPresets') || '预设服务商'}
        </span>
        <span className="text-[10px] text-[var(--theme-text-secondary)]/50 font-mono">({filteredPresets.length})</span>
      </div>

      {filteredPresets.map((preset) => {
        const presetKey = `preset:${preset.id}`;
        const isSelected = selectedConnectionId === presetKey;
        return (
          <div
            key={preset.id}
            data-testid={`preset-item-${preset.id}`}
            onClick={() => onSelectConnection(presetKey)}
            className={`group relative flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer select-none transition-all ${
              isSelected
                ? 'bg-[var(--theme-bg-secondary)] shadow-xs ring-1 ring-[var(--theme-border-focus)]/40 font-medium'
                : 'hover:bg-[var(--theme-bg-secondary)]/50'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <ProviderAvatar name={preset.name} templateId={preset.id} size={26} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm truncate text-[var(--theme-text-primary)]">{preset.name}</span>
                  <span className="px-1.5 py-0.2 text-[9px] font-medium rounded-full bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] border border-[var(--theme-border-secondary)]/50 shrink-0">
                    {t('thirdPartyPresetBadge') || '预设'}
                  </span>
                </div>
                {preset.description && (
                  <div className="text-[10px] text-[var(--theme-text-secondary)]/70 truncate mt-0.5">
                    {preset.description}
                  </div>
                )}
              </div>
            </div>
            <span
              className="w-2 h-2 rounded-full bg-[var(--theme-border-secondary)] opacity-30 shrink-0"
              title={t('disabled')}
            />
          </div>
        );
      })}
    </div>
  );
};
