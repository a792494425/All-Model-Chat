import React, { useMemo } from 'react';
import { type ApiMode, type ModelOption } from '@/types';
import { getModelIcon } from '@/components/shared/ModelIcon';
import { useI18n } from '@/contexts/I18nContext';
import { buildModelCatalog, buildModelCatalogSections, filterModelCatalog } from '@/utils/model/modelCatalog';
import { ModelCatalogList } from '@/components/shared/ModelCatalogList';

interface ModelListViewProps {
  availableModels: ModelOption[];
  selectedModelId: string;
  selectedApiMode?: ApiMode;
  onSelectModel: (id: string, apiMode?: ApiMode) => void;
}

export const ModelListView: React.FC<ModelListViewProps> = ({
  availableModels,
  selectedModelId,
  selectedApiMode,
  onSelectModel,
}) => {
  const { t } = useI18n();

  const catalog = useMemo(() => buildModelCatalog(availableModels), [availableModels]);
  const filteredEntries = useMemo(() => filterModelCatalog(catalog, ''), [catalog]);

  const sections = useMemo(() => buildModelCatalogSections(filteredEntries), [filteredEntries]);

  return (
    <div
      data-testid="settings-model-list-container"
      className="border border-[var(--theme-border-secondary)]/70 rounded-xl bg-[var(--theme-bg-input)]/30 overflow-hidden"
    >
      <div className="max-h-[340px] overflow-y-auto custom-scrollbar p-2 space-y-2.5">
        <ModelCatalogList
          sections={sections}
          variant="settings"
          renderModelIcon={getModelIcon}
          isEntrySelected={(entry) =>
            entry.id === selectedModelId &&
            (!selectedApiMode || !entry.model.apiMode || entry.model.apiMode === selectedApiMode)
          }
          onSelectEntry={(entry) => onSelectModel(entry.id, entry.model.apiMode)}
        />
        {availableModels.length === 0 && (
          <div className="p-4 text-center text-xs text-[var(--theme-text-secondary)] italic">
            {t('chatBehaviorModelNoModels')}
          </div>
        )}
        {availableModels.length > 0 && sections.length === 0 && (
          <div className="p-4 text-center text-xs text-[var(--theme-text-secondary)] italic">
            {t('modelPickerNoResults')}
          </div>
        )}
      </div>
    </div>
  );
};
