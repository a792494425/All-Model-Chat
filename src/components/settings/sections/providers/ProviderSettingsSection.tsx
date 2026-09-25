import React, { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import {
  type AppSettings,
  type ThirdPartyApiSettings,
  type ThirdPartyConnection,
  type ThirdPartyTemplateId,
} from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import {
  createDefaultThirdPartyApiSettings,
  addThirdPartyConnection,
  removeThirdPartyConnection,
  updateThirdPartyConnection,
  reorderThirdPartyConnections,
  duplicateThirdPartyConnection,
  createConnectionFromTemplate,
  createConnectionId,
  TEMPLATE_PRESETS,
} from '@/utils/third-party/thirdPartyApiProviders';
import { probeThirdPartyConnection, formatLatency } from '@/utils/third-party/thirdPartyDiagnostics';
import { toastError, toastSuccess } from '@/stores/toastStore';
import { ProviderList } from './ProviderList';
import { ProviderDetail } from './ProviderDetail';
import { ProviderCreateDrawer } from './ProviderCreateDrawer';
import { useProviderUiStore } from '@/stores/providerUiStore';

interface ProviderSettingsSectionProps {
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onCloseModal?: () => void;
  initialSelectedId?: string;
}

export const ProviderSettingsSection: React.FC<ProviderSettingsSectionProps> = ({
  settings,
  onUpdateSettings,
  onCloseModal,
  initialSelectedId,
}) => {
  const { t } = useI18n();
  const currentSettings = settings.thirdPartyApi ?? createDefaultThirdPartyApiSettings();
  const connections = useMemo(() => currentSettings.connections ?? [], [currentSettings.connections]);

  const storedSelectedConnectionId = useProviderUiStore((s) => s.selectedConnectionId);
  const setSelectedConnectionId = useProviderUiStore((s) => s.setSelectedConnectionId);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(true);

  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  const configuredTemplateIds = useMemo(() => new Set(connections.map((c) => c.templateId)), [connections]);
  const unconfiguredPresets = useMemo(() => {
    return TEMPLATE_PRESETS.filter((p) => !configuredTemplateIds.has(p.id));
  }, [configuredTemplateIds]);

  const selectedConnectionId = useMemo(() => {
    if (initialSelectedId && initialSelectedId !== 'gemini') return initialSelectedId;
    if (storedSelectedConnectionId && storedSelectedConnectionId !== 'gemini') {
      if (storedSelectedConnectionId.startsWith('preset:')) return storedSelectedConnectionId;
      if (connections.some((c) => c.id === storedSelectedConnectionId)) {
        return storedSelectedConnectionId;
      }
    }
    return connections[0]?.id || (unconfiguredPresets[0] ? `preset:${unconfiguredPresets[0].id}` : null);
  }, [initialSelectedId, storedSelectedConnectionId, connections, unconfiguredPresets]);

  React.useEffect(() => {
    if (initialSelectedId) {
      setSelectedConnectionId(initialSelectedId);
      setIsMobileDetailOpen(true);
    }
  }, [initialSelectedId, setSelectedConnectionId]);

  React.useEffect(() => {
    if (selectedConnectionId !== storedSelectedConnectionId) {
      setSelectedConnectionId(selectedConnectionId);
    }
  }, [selectedConnectionId, storedSelectedConnectionId, setSelectedConnectionId]);

  const updateThirdPartyApi = (next: ThirdPartyApiSettings) => {
    onUpdateSettings({ thirdPartyApi: next });
  };

  const isVirtualPreset = Boolean(selectedConnectionId && selectedConnectionId.startsWith('preset:'));
  const virtualTemplateId =
    isVirtualPreset && selectedConnectionId
      ? (selectedConnectionId.replace('preset:', '') as ThirdPartyTemplateId)
      : null;

  const draftPresetConnection = useMemo<ThirdPartyConnection | null>(() => {
    if (!virtualTemplateId || !selectedConnectionId) return null;
    const templateConn = createConnectionFromTemplate(virtualTemplateId, connections, selectedConnectionId);
    return {
      ...templateConn,
      enabled: false,
      apiKey: null,
    };
  }, [virtualTemplateId, selectedConnectionId, connections]);

  const selectedConnection = useMemo(() => {
    if (isVirtualPreset) return draftPresetConnection;
    return connections.find((c) => c.id === selectedConnectionId) ?? null;
  }, [isVirtualPreset, draftPresetConnection, connections, selectedConnectionId]);

  const isDetailVisibleOnMobile = isMobileDetailOpen && Boolean(selectedConnection);

  const handleSelectConnection = (id: string) => {
    setSelectedConnectionId(id);
    setIsMobileDetailOpen(true);
  };

  const handleBackToListOnMobile = () => {
    setIsMobileDetailOpen(false);
  };

  const handleCreateComplete = (newConnection: ThirdPartyConnection) => {
    updateThirdPartyApi(addThirdPartyConnection(currentSettings, newConnection));
    setSelectedConnectionId(newConnection.id);
    setIsMobileDetailOpen(true);
    setIsCreateDrawerOpen(false);
    toastSuccess(t('thirdPartyProviderAdded', { name: newConnection.name }));
  };

  const handleDuplicate = (conn: ThirdPartyConnection) => {
    const copySuffix = t('thirdPartyCopySuffix', { name: conn.name });
    const duplicated = duplicateThirdPartyConnection(conn, connections, copySuffix);
    updateThirdPartyApi(addThirdPartyConnection(currentSettings, duplicated));
    setSelectedConnectionId(duplicated.id);
    setIsMobileDetailOpen(true);
    toastSuccess(t('thirdPartyCopyCreated', { name: duplicated.name }));
  };

  const handleDelete = (id: string) => {
    const fallbackPresetId = unconfiguredPresets[0] ? `preset:${unconfiguredPresets[0].id}` : null;
    if (id.startsWith('preset:')) {
      setSelectedConnectionId(connections[0]?.id || fallbackPresetId);
      return;
    }
    const target = connections.find((c) => c.id === id);
    updateThirdPartyApi(removeThirdPartyConnection(currentSettings, id));
    if (selectedConnectionId === id) {
      const remaining = connections.filter((c) => c.id !== id);
      const nextId = remaining[0]?.id || (target?.templateId ? `preset:${target.templateId}` : fallbackPresetId);
      setSelectedConnectionId(nextId);
    }
    useProviderUiStore.getState().cleanupConnectionUi(id);
    if (target) {
      toastSuccess(t('thirdPartyProviderRemoved', { name: target.name }));
    }
  };

  const handleUpdateConnection = (updates: Partial<ThirdPartyConnection>) => {
    if (isVirtualPreset && draftPresetConnection && virtualTemplateId) {
      // User is editing or enabling the virtual preset
      const newId = createConnectionId();
      const newConnection: ThirdPartyConnection = {
        ...draftPresetConnection,
        ...updates,
        id: newId,
      };
      if (newConnection.models) {
        newConnection.models = newConnection.models.map((m) => ({
          ...m,
          providerId: newId,
          connectionName: newConnection.name,
        }));
      }
      updateThirdPartyApi(addThirdPartyConnection(currentSettings, newConnection));
      setSelectedConnectionId(newId);
      setIsMobileDetailOpen(true);
      if (updates.enabled) {
        toastSuccess(t('thirdPartyProviderAdded', { name: newConnection.name }));
      }
      return;
    }

    if (selectedConnection) {
      updateThirdPartyApi(updateThirdPartyConnection(currentSettings, selectedConnection.id, updates));
    }
  };

  const handleReorder = (orderedIds: string[]) => {
    updateThirdPartyApi(reorderThirdPartyConnections(currentSettings, orderedIds));
  };

  const handleProbe = async (connection: ThirdPartyConnection) => {
    try {
      const probeResult = await probeThirdPartyConnection(connection);
      if (probeResult.status === 'success') {
        toastSuccess(
          t('thirdPartyTestSuccess', { name: connection.name, latency: formatLatency(probeResult.latencyMs) }),
        );
      } else {
        toastError(t('thirdPartyTestFailed', { name: connection.name, error: probeResult.errorMessage || '' }));
      }
    } catch (probeError) {
      const errorMsg = probeError instanceof Error ? probeError.message : String(probeError);
      toastError(`${connection.name}: ${errorMsg}`);
    }
  };

  return (
    <div
      data-settings-item="providers-root"
      className="flex flex-col h-full w-full bg-[var(--theme-bg-primary)] overflow-hidden"
    >
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        <div
          className={`w-full md:w-64 lg:w-72 h-full flex-shrink-0 ${
            isDetailVisibleOnMobile ? 'hidden md:flex' : 'flex'
          }`}
        >
          <ProviderList
            connections={connections}
            selectedConnectionId={selectedConnectionId}
            onSelectConnection={handleSelectConnection}
            onReorder={handleReorder}
            onAddConnection={() => setIsCreateDrawerOpen(true)}
            onEditConnection={() => {}}
            onDuplicateConnection={handleDuplicate}
            onDeleteConnection={handleDelete}
            onProbeConnection={handleProbe}
          />
        </div>
        <div className={`flex-1 min-w-0 h-full flex flex-col ${isDetailVisibleOnMobile ? 'flex' : 'hidden md:flex'}`}>
          {selectedConnection ? (
            <div className="flex-1 flex flex-col h-full min-h-0">
              <div className="md:hidden p-2 border-b border-[var(--theme-border-secondary)]/30 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleBackToListOnMobile}
                  className="flex items-center gap-1 text-xs text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
                >
                  <ChevronLeft size={14} />
                  <span>{t('thirdPartyBackToList')}</span>
                </button>
              </div>

              <ProviderDetail
                key={selectedConnection.id}
                connection={selectedConnection}
                onUpdateConnection={handleUpdateConnection}
                onDeleteConnection={() => handleDelete(selectedConnection.id)}
                onDuplicateConnection={() => handleDuplicate(selectedConnection)}
                onCloseModal={onCloseModal}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-[var(--theme-text-secondary)]">
              <p>{t('thirdPartySelectConnectionHelp')}</p>
            </div>
          )}
        </div>
      </div>
      <ProviderCreateDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        existingConnections={connections}
        onComplete={handleCreateComplete}
      />
    </div>
  );
};
