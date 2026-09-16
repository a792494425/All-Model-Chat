import React, { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import {
  GEMINI_PROVIDER_ID,
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
} from '@/utils/thirdPartyApiProviders';
import { probeThirdPartyConnection, formatLatency } from '@/utils/thirdPartyDiagnostics';
import { toastError, toastSuccess } from '@/stores/toastStore';
import { ProviderList } from './ProviderList';
import { ProviderDetail } from './ProviderDetail';
import { ProviderCreateDrawer } from './ProviderCreateDrawer';
import { GeminiProviderDetail } from './GeminiProviderDetail';
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

  const geminiStatus = useMemo(() => {
    const hasKey = Boolean(settings.apiKey?.trim() || settings.serverManagedApi);
    return {
      isConfigured: hasKey,
      useProxy: Boolean(settings.useApiProxy && settings.apiProxyUrl),
    };
  }, [settings.apiKey, settings.serverManagedApi, settings.useApiProxy, settings.apiProxyUrl]);

  const selectedConnectionId = useMemo(() => {
    if (initialSelectedId) return initialSelectedId;
    if (storedSelectedConnectionId === GEMINI_PROVIDER_ID) return GEMINI_PROVIDER_ID;
    if (storedSelectedConnectionId?.startsWith('preset:')) return storedSelectedConnectionId;
    if (storedSelectedConnectionId && connections.some((c) => c.id === storedSelectedConnectionId)) {
      return storedSelectedConnectionId;
    }
    return connections[0]?.id || GEMINI_PROVIDER_ID;
  }, [initialSelectedId, storedSelectedConnectionId, connections]);

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

  const isGeminiSelected = selectedConnectionId === GEMINI_PROVIDER_ID;

  const updateThirdPartyApi = (next: ThirdPartyApiSettings) => {
    onUpdateSettings({ thirdPartyApi: next });
  };

  const isVirtualPreset = Boolean(selectedConnectionId && selectedConnectionId.startsWith('preset:'));
  const virtualTemplateId = isVirtualPreset
    ? (selectedConnectionId.replace('preset:', '') as ThirdPartyTemplateId)
    : null;

  const draftPresetConnection = useMemo<ThirdPartyConnection | null>(() => {
    if (!virtualTemplateId) return null;
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

  const isDetailVisibleOnMobile = isMobileDetailOpen && (Boolean(selectedConnection) || isGeminiSelected);

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
    if (id.startsWith('preset:')) {
      setSelectedConnectionId(connections[0]?.id || GEMINI_PROVIDER_ID);
      return;
    }
    const target = connections.find((c) => c.id === id);
    updateThirdPartyApi(removeThirdPartyConnection(currentSettings, id));
    if (selectedConnectionId === id) {
      const remaining = connections.filter((c) => c.id !== id);
      setSelectedConnectionId(remaining[0]?.id ?? GEMINI_PROVIDER_ID);
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

  const handleProbe = async (conn: ThirdPartyConnection) => {
    try {
      const res = await probeThirdPartyConnection(conn);
      if (res.status === 'success') {
        toastSuccess(t('thirdPartyTestSuccess', { name: conn.name, latency: formatLatency(res.latencyMs) }));
      } else {
        toastError(t('thirdPartyTestFailed', { name: conn.name, error: res.errorMessage || '' }));
      }
    } catch (probeError: any) {
      toastError(`${conn.name}: ${probeError.message}`);
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
            geminiStatus={geminiStatus}
          />
        </div>
        <div className={`flex-1 min-w-0 h-full flex flex-col ${isDetailVisibleOnMobile ? 'flex' : 'hidden md:flex'}`}>
          {isGeminiSelected ? (
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
              <GeminiProviderDetail
                settings={settings}
                onUpdateSettings={onUpdateSettings}
                onCloseModal={onCloseModal}
              />
            </div>
          ) : selectedConnection ? (
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
