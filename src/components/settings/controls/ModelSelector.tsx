import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { type ApiMode, type ModelOption } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { getModelIcon } from '@/components/shared/ModelIcon';
import { ModelSelectorHeader } from './model-selector/ModelSelectorHeader';
import { ModelListEditor } from './model-selector/ModelListEditor';
import { ModelListView } from './model-selector/ModelListView';

interface ModelSelectorProps {
  availableModels: ModelOption[];
  selectedModelId: string;
  selectedApiMode?: ApiMode;
  onSelectModel: (id: string, apiMode?: ApiMode) => void;
  setAvailableModels: (models: ModelOption[]) => void;
  defaultModels?: ModelOption[];
  defaultApiMode?: ApiMode;
  /** Badge text for the selected model; see ModelCatalogList.activeBadgeLabel. */
  activeBadgeLabel?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  availableModels,
  selectedModelId,
  selectedApiMode,
  onSelectModel,
  setAvailableModels,
  defaultModels,
  defaultApiMode,
  activeBadgeLabel,
}) => {
  const { t } = useI18n();
  const [isEditingList, setIsEditingList] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownContainerRef, () => setIsDropdownOpen(false), isDropdownOpen);

  const isProviderAwareList =
    availableModels.some((model) => model.apiMode === 'third-party') ||
    !!defaultModels?.some((model) => model.apiMode === 'third-party');

  const selectedModel = useMemo(() => {
    return (
      availableModels.find(
        (model) =>
          model.id === selectedModelId && (!selectedApiMode || !model.apiMode || model.apiMode === selectedApiMode),
      ) || availableModels.find((model) => model.id === selectedModelId)
    );
  }, [availableModels, selectedModelId, selectedApiMode]);

  const handleSelectModel = (id: string, apiMode?: ApiMode) => {
    onSelectModel(id, apiMode);
    setIsDropdownOpen(false);
  };

  return (
    <div className="space-y-4">
      <ModelSelectorHeader
        isEditingList={isEditingList}
        setIsEditingList={(editing) => {
          setIsEditingList(editing);
          if (editing) {
            setIsDropdownOpen(false);
          }
        }}
      />

      {isEditingList ? (
        <ModelListEditor
          availableModels={availableModels}
          defaultModels={defaultModels}
          defaultApiMode={defaultApiMode}
          showApiModeControls={isProviderAwareList}
          onSave={setAvailableModels}
          setIsEditingList={setIsEditingList}
        />
      ) : (
        <div ref={dropdownContainerRef} className="relative">
          <div
            data-testid="settings-selected-model-card"
            role="button"
            tabIndex={0}
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setIsDropdownOpen((prev) => !prev);
              } else if (event.key === 'Escape' && isDropdownOpen) {
                event.preventDefault();
                setIsDropdownOpen(false);
              }
            }}
            className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)]/30 hover:bg-[var(--theme-bg-input)]/50 transition-colors cursor-pointer select-none group"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)]/50 flex items-center justify-center text-[var(--theme-text-primary)]">
                {getModelIcon(selectedModel ?? { id: selectedModelId, name: selectedModelId })}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    data-testid="settings-default-model-name"
                    className="text-sm font-semibold text-[var(--theme-text-primary)] truncate"
                  >
                    {selectedModel?.name || selectedModelId || t('appNoModelsAvailable')}
                  </span>
                  <span
                    data-testid="settings-default-model-badge"
                    className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-[var(--theme-text-link)]/15 text-[var(--theme-text-link)] border border-[var(--theme-text-link)]/30 shrink-0"
                  >
                    {activeBadgeLabel ?? t('settingsDefaultModelBadge')}
                  </span>
                </div>
                <div className="text-xs text-[var(--theme-text-tertiary)] font-mono truncate mt-0.5">
                  {selectedModel?.apiMode && selectedModel.apiMode !== 'gemini-native' ? (
                    <span className="capitalize">
                      {selectedModel.apiMode}: {selectedModelId}
                    </span>
                  ) : (
                    selectedModelId
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              data-testid="settings-change-model-button"
              aria-expanded={isDropdownOpen}
              onClick={(event) => {
                event.stopPropagation();
                setIsDropdownOpen((prev) => !prev);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-secondary)] text-[var(--theme-text-primary)] transition-all shrink-0"
            >
              <span>{t('settingsChangeModel')}</span>
              <ChevronDown
                size={14}
                className={`text-[var(--theme-text-secondary)] transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>

          {isDropdownOpen && (
            <div
              data-testid="settings-model-dropdown"
              className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl bg-[var(--theme-bg-primary)] shadow-2xl border border-[var(--theme-border-secondary)] overflow-hidden"
            >
              <ModelListView
                availableModels={availableModels}
                selectedModelId={selectedModelId}
                selectedApiMode={selectedApiMode}
                onSelectModel={handleSelectModel}
                activeBadgeLabel={activeBadgeLabel}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
