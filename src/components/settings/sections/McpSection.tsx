import React from 'react';
import type { AppSettings } from '@/types';
import { useMcpSectionLogic } from './mcp/useMcpSectionLogic';
import { McpServerListHeader } from './mcp/McpServerListHeader';
import { McpImportAndMarketplaceBar } from './mcp/McpImportAndMarketplaceBar';
import { McpFilterSearchBar } from './mcp/McpFilterSearchBar';
import { VirtualMcpServersSection } from './mcp/VirtualMcpServersSection';
import { ExternalMcpServersSection } from './mcp/ExternalMcpServersSection';
import { McpTrustDialog } from './mcp/McpTrustDialog';

interface McpSectionProps {
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export const McpSection: React.FC<McpSectionProps> = ({ settings, onUpdate }) => {
  const {
    servers,
    filter,
    setFilter,
    search,
    setSearch,
    filteredAndSorted,
    sortOrder,
    cardKeys,
    expandedCards,
    toggleCardExpanded,
    capabilityStates,
    activeTabs,
    toolQueries,
    deferredToolQueries,
    schemaToolNames,
    pendingTrustTarget,
    showMarketplaces,
    setShowMarketplaces,
    showImport,
    setShowImport,
    importJson,
    setImportJson,
    importError,
    setImportError,
    handleImportJson,
    filteredVirtualServers,
    isVirtualServerEnabled,
    setVirtualServerEnabled,
    addServer,
    removeServer,
    updateServer,
    moveServer,
    testServerCapabilities,
    handleToggleServerEnabled,
    handleConfirmTrust,
    handleCancelTrust,
    handleClearFilters,
    handleTabChange,
    handleToolQueryChange,
    handleToggleSchemaTool,
  } = useMcpSectionLogic({ settings, onUpdate });

  return (
    <div className="space-y-4" data-settings-item="mcp-root">
      <McpServerListHeader onAddServer={addServer} />

      <McpImportAndMarketplaceBar
        showImport={showImport}
        setShowImport={setShowImport}
        showMarketplaces={showMarketplaces}
        setShowMarketplaces={setShowMarketplaces}
        importJson={importJson}
        setImportJson={setImportJson}
        importError={importError}
        setImportError={setImportError}
        onImportConfirm={handleImportJson}
      />

      <McpFilterSearchBar filter={filter} onFilterChange={setFilter} search={search} onSearchChange={setSearch} />

      <VirtualMcpServersSection
        virtualServers={filteredVirtualServers}
        expandedCards={expandedCards}
        onToggleExpanded={toggleCardExpanded}
        isVirtualServerEnabled={isVirtualServerEnabled}
        onToggleEnabled={setVirtualServerEnabled}
      />

      <ExternalMcpServersSection
        servers={servers}
        filteredAndSorted={filteredAndSorted}
        sortOrder={sortOrder}
        cardKeys={cardKeys}
        expandedCards={expandedCards}
        capabilityStates={capabilityStates}
        activeTabs={activeTabs}
        toolQueries={toolQueries}
        deferredToolQueries={deferredToolQueries}
        schemaToolNames={schemaToolNames}
        onClearFilters={handleClearFilters}
        onToggleExpanded={toggleCardExpanded}
        onToggleEnabled={handleToggleServerEnabled}
        onRemove={removeServer}
        onTestCapabilities={testServerCapabilities}
        onMove={moveServer}
        onUpdateServer={updateServer}
        onTabChange={handleTabChange}
        onToolQueryChange={handleToolQueryChange}
        onToggleSchemaTool={handleToggleSchemaTool}
      />

      {pendingTrustTarget && (
        <McpTrustDialog
          server={pendingTrustTarget.server}
          onCancel={handleCancelTrust}
          onConfirm={handleConfirmTrust}
        />
      )}
    </div>
  );
};
