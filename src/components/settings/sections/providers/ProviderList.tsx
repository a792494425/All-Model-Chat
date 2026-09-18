import React from 'react';
import { Plus } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { GEMINI_PROVIDER_ID, type ThirdPartyConnection } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { SortableProviderItem } from './provider-list/SortableProviderItem';
import { useProviderListLogic } from './provider-list/useProviderListLogic';
import { ProviderListSearchAndFilter } from './provider-list/ProviderListSearchAndFilter';
import { OfficialGeminiItem } from './provider-list/OfficialGeminiItem';
import { UnconfiguredPresetsList } from './provider-list/UnconfiguredPresetsList';

interface ProviderListProps {
  connections: ThirdPartyConnection[];
  selectedConnectionId: string | null;
  onSelectConnection: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onAddConnection: () => void;
  onEditConnection: (connection: ThirdPartyConnection) => void;
  onDuplicateConnection: (connection: ThirdPartyConnection) => void;
  onDeleteConnection: (id: string) => void;
  onProbeConnection: (connection: ThirdPartyConnection) => void;
  geminiStatus?: {
    isConfigured: boolean;
    useProxy: boolean;
  };
}

export const ProviderList: React.FC<ProviderListProps> = ({
  connections,
  selectedConnectionId,
  onSelectConnection,
  onReorder,
  onAddConnection,
  onEditConnection,
  onDuplicateConnection,
  onDeleteConnection,
  onProbeConnection,
  geminiStatus,
}) => {
  const { t } = useI18n();

  const {
    search,
    setSearch,
    filterMode,
    setFilterMode,
    healthResults,
    sensors,
    enabledCount,
    allCount,
    disabledCount,
    filteredConnections,
    filteredPresets,
    handleDragEnd,
    isGeminiMatch,
  } = useProviderListLogic({
    connections,
    geminiStatus,
    onReorder,
    officialProvidersText: t('thirdPartyOfficialProviders'),
  });

  return (
    <div className="w-full md:w-64 lg:w-72 flex flex-col h-full bg-[var(--theme-bg-secondary)]/25 border-r border-[var(--theme-border-secondary)]/40 flex-shrink-0 select-none">
      <ProviderListSearchAndFilter
        search={search}
        setSearch={setSearch}
        filterMode={filterMode}
        setFilterMode={setFilterMode}
        enabledCount={enabledCount}
        allCount={allCount}
        disabledCount={disabledCount}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-3">
        {isGeminiMatch && (
          <OfficialGeminiItem
            isSelected={selectedConnectionId === GEMINI_PROVIDER_ID}
            onSelect={onSelectConnection}
            geminiStatus={geminiStatus}
          />
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 py-0.5">
            <span className="text-[10px] font-semibold tracking-wider text-[var(--theme-text-secondary)]/60 uppercase">
              {t('thirdPartyProvidersList')}
            </span>
            <span className="text-[10px] text-[var(--theme-text-secondary)]/50 font-mono">({connections.length})</span>
          </div>

          {filteredConnections.length === 0 ? (
            <div className="py-4 px-2 text-center text-xs text-[var(--theme-text-secondary)]">
              {search ? t('thirdPartyNoSearchResults') : t('thirdPartyConnectionsEmpty')}
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredConnections.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                {filteredConnections.map((connection) => (
                  <SortableProviderItem
                    key={connection.id}
                    connection={connection}
                    isSelected={connection.id === selectedConnectionId}
                    healthResult={healthResults[connection.id]}
                    onSelect={() => onSelectConnection(connection.id)}
                    onEdit={() => onEditConnection(connection)}
                    onDuplicate={() => onDuplicateConnection(connection)}
                    onDelete={() => onDeleteConnection(connection.id)}
                    onProbe={() => onProbeConnection(connection)}
                    t={t}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        <UnconfiguredPresetsList
          filteredPresets={filteredPresets}
          selectedConnectionId={selectedConnectionId}
          onSelectConnection={onSelectConnection}
        />
      </div>

      <div className="p-3 border-t border-[var(--theme-border-secondary)]/30 flex-shrink-0 bg-[var(--theme-bg-primary)]/40">
        <button
          type="button"
          data-settings-item="providers-add"
          onClick={onAddConnection}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-[var(--theme-border-secondary)] hover:border-[var(--theme-border-focus)] bg-[var(--theme-bg-secondary)]/50 hover:bg-[var(--theme-bg-tertiary)]/70 text-xs font-medium text-[var(--theme-text-primary)] transition-all cursor-pointer shadow-xs"
        >
          <Plus size={14} />
          <span>{t('thirdPartyAddCustomConnection') || t('thirdPartyAddConnection')}</span>
        </button>
      </div>
    </div>
  );
};
