import React, { useMemo } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import type { AppSettings, ModelOption } from '@/types';
import { ModelPicker } from '@/components/shared/ModelPicker';
import { buildProviderAwareModelList } from '@/utils/thirdPartyApiProviders';

export const SelectionAskModelSection: React.FC<{
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  availableModels: ModelOption[];
}> = ({ settings, onUpdate, availableModels }) => {
  const { t } = useI18n();
  const models = useMemo(() => buildProviderAwareModelList(settings, availableModels), [settings, availableModels]);
  const selectedId = (settings as unknown as Record<string, unknown>).selectionAskModelId as string | undefined;
  const selectedModel = selectedId ? models.find((m) => m.id === selectedId && (m.providerId ?? 'gemini-native') === ((settings as unknown as Record<string, unknown>).selectionAskProviderId as string | undefined ?? 'gemini-native')) ?? models.find((m) => m.id === selectedId) : undefined;

  return (
    <section data-settings-item="selectionAskModel" className="rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]/40 p-4">
      <h3 className="text-sm font-semibold text-[var(--theme-text-primary)]">{t('selectionAskModel')}</h3>
      <p className="mt-1 text-xs leading-relaxed text-[var(--theme-text-secondary)]">{t('selectionAskModelDesc')}</p>
      <div className="mt-3">
        <ModelPicker
          models={models}
          selectedId={selectedId ?? ''}
          onSelect={(id, providerId) => {
            onUpdate('selectionAskModelId' as keyof AppSettings, id as unknown as AppSettings[keyof AppSettings]);
            onUpdate('selectionAskProviderId' as keyof AppSettings, (providerId ?? undefined) as unknown as AppSettings[keyof AppSettings]);
          }}
          renderTrigger={({ isOpen, setIsOpen, selectedModel: pickerSelected }) => (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="flex w-full items-center justify-between rounded-lg border border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)] px-3 py-2 text-sm text-left transition-colors hover:border-[var(--theme-border-focus)]"
              aria-label={t('selectionAskModel')}
              aria-haspopup="listbox"
              aria-expanded={isOpen}
            >
              <span className={pickerSelected ? 'text-[var(--theme-text-primary)] truncate' : 'text-[var(--theme-text-tertiary)]'}>
                {pickerSelected ? `${pickerSelected.name} · ${pickerSelected.id}` : t('selectionAskModelNotConfigured')}
              </span>
              <span className="ml-2 shrink-0 text-[var(--theme-text-tertiary)]">{isOpen ? '▲' : '▼'}</span>
            </button>
          )}
          dropdownClassName="w-full min-w-[320px] max-h-[360px]"
        />
        {selectedModel && selectedModel.unavailable && (
          <p className="mt-2 text-xs text-[var(--theme-text-danger)]">{t('selectionAskModelUnavailable')}</p>
        )}
      </div>
    </section>
  );
};
