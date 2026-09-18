import React from 'react';
import { SearchX, Server } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import type { McpServerConfig } from '@/types';
import { SETTINGS_OUTLINE_BUTTON_CLASS } from '@/constants/buttonClasses';
import { SETTINGS_SECTION_CARD_CLASS } from '@/constants/designTokens';
import type { CapabilityTestState } from './mcpSectionShared';
import { McpServerCard } from './McpServerCard';

interface ExternalMcpServersSectionProps {
  servers: McpServerConfig[];
  filteredAndSorted: McpServerConfig[];
  sortOrder: string[];
  cardKeys: string[];
  expandedCards: Set<string>;
  capabilityStates: Record<string, CapabilityTestState>;
  activeTabs: Record<string, string>;
  toolQueries: Record<string, string>;
  deferredToolQueries: Record<string, string>;
  schemaToolNames: Set<string>;
  onClearFilters: () => void;
  onToggleExpanded: (cardKey: string) => void;
  onToggleEnabled: (server: McpServerConfig, index: number, cardKey: string, enabled: boolean) => void;
  onRemove: (index: number) => void;
  onTestCapabilities: (server: McpServerConfig, cardKey: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onUpdateServer: (index: number, updates: Partial<McpServerConfig>) => void;
  onTabChange: (cardKey: string, tab: string) => void;
  onToolQueryChange: (cardKey: string, query: string) => void;
  onToggleSchemaTool: (toolName: string) => void;
}

export const ExternalMcpServersSection: React.FC<ExternalMcpServersSectionProps> = ({
  servers,
  filteredAndSorted,
  sortOrder,
  cardKeys,
  expandedCards,
  capabilityStates,
  activeTabs,
  toolQueries,
  deferredToolQueries,
  schemaToolNames,
  onClearFilters,
  onToggleExpanded,
  onToggleEnabled,
  onRemove,
  onTestCapabilities,
  onMove,
  onUpdateServer,
  onTabChange,
  onToolQueryChange,
  onToggleSchemaTool,
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      {servers.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)]">
            {t('settingsMcpExternalSectionTitle')}
          </span>
        </div>
      )}

      {servers.length === 0 ? (
        <div
          className={`${SETTINGS_SECTION_CARD_CLASS} flex flex-col items-center justify-center gap-2 border-dashed py-8 text-center text-xs text-[var(--theme-text-secondary)]`}
        >
          <Server size={24} strokeWidth={1.5} className="opacity-40" aria-hidden />
          <span>{t('settingsMcpEmpty')}</span>
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <div
          className={`${SETTINGS_SECTION_CARD_CLASS} flex flex-col items-center justify-center gap-2 border-dashed py-8 text-center text-xs text-[var(--theme-text-secondary)]`}
        >
          <SearchX size={24} strokeWidth={1.5} className="opacity-40" aria-hidden />
          <span>{t('settingsMcpEmptyFiltered')}</span>
          <button type="button" onClick={onClearFilters} className={`${SETTINGS_OUTLINE_BUTTON_CLASS} mt-1`}>
            {t('settingsMcpClearFilters')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSorted.map((server) => {
            const origIndex = servers.indexOf(server);
            const fallbackIndex = origIndex !== -1 ? origIndex : 0;
            const stateKey =
              origIndex !== -1
                ? (cardKeys[origIndex] ?? `mcp-card-fallback-${origIndex}`)
                : `mcp-card-fallback-${server.id}`;
            const index = origIndex !== -1 ? origIndex : fallbackIndex;
            const sortIndex = sortOrder.indexOf(server.id);
            const isExpanded = expandedCards.has(stateKey);

            return (
              <McpServerCard
                key={stateKey}
                server={server}
                index={index}
                isExpanded={isExpanded}
                capabilityState={capabilityStates[stateKey]}
                canMoveUp={sortIndex > 0}
                canMoveDown={sortIndex !== -1 && sortIndex < sortOrder.length - 1}
                activeTab={activeTabs[stateKey] ?? 'tools'}
                toolQuery={toolQueries[stateKey] ?? ''}
                deferredToolQuery={deferredToolQueries[stateKey] ?? ''}
                schemaToolNames={schemaToolNames}
                onToggleExpanded={() => onToggleExpanded(stateKey)}
                onToggleEnabled={(enabled) => onToggleEnabled(server, index, stateKey, enabled)}
                onRemove={() => onRemove(index)}
                onTestCapabilities={() => onTestCapabilities(server, stateKey)}
                onMove={(direction) => onMove(server.id, direction)}
                onUpdateServer={(updates) => onUpdateServer(index, updates)}
                onTabChange={(tab) => onTabChange(stateKey, tab)}
                onToolQueryChange={(query) => onToolQueryChange(stateKey, query)}
                onToggleSchemaTool={onToggleSchemaTool}
                t={t}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
