import React, { useRef, useState } from 'react';
import { Activity, ChevronDown, ChevronRight, Download, Loader2, Plus, Upload } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { Toggle } from '@/components/shared/Toggle';
import {
  SETTINGS_OUTLINE_BUTTON_CLASS,
  SETTINGS_PRIMARY_ACTION_BUTTON_CLASS,
} from '@/constants/buttonClasses';
import {
  THIRD_PARTY_TEMPLATE_IDS,
  type AppSettings,
  type ThirdPartyApiSettings,
  type ThirdPartyConnection,
  type ThirdPartyTemplateId,
} from '@/types';
import {
  addThirdPartyConnection,
  createConnectionFromTemplate,
  createConnectionId,
  createDefaultThirdPartyApiSettings,
  getConnectionDisplayTemplateId,
  getThirdPartyConnectionStatus,
  isThirdPartyConnectionInUse,
  removeThirdPartyConnection,
  updateThirdPartyConnection,
} from '@/utils/thirdPartyApiProviders';
import {
  applyImportedProviders,
  exportProvidersBackupFile,
  parseProvidersBackupText,
  type ImportMode,
} from '@/utils/thirdPartyBackup';
import {
  formatLatency,
  getLatencyBadgeStyles,
  probeThirdPartyConnection,
  type ConnectionHealthProbeResult,
} from '@/utils/thirdPartyDiagnostics';
import { toastError, toastSuccess, toastWarning } from '@/stores/toastStore';
import { interpolate } from '@/i18n/interpolate';
import { getThirdPartyTemplateLogo } from '@/components/shared/ModelIcon';
import { useChatStore } from '@/stores/chatStore';
import { ThirdPartyAddConnectionDialog } from './ThirdPartyAddConnectionDialog';
import { ThirdPartyBackupDialog, type ThirdPartyBackupDialogMode } from './ThirdPartyBackupDialog';
import { ThirdPartyConnectionEditor } from './ThirdPartyConnectionEditor';

interface ThirdPartyApiSettingsPanelProps {
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
}

export const ThirdPartyApiSettingsPanel: React.FC<ThirdPartyApiSettingsPanelProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const { t } = useI18n();
  const connections = settings.thirdPartyApi?.connections ?? [];
  const [expandedConnectionId, setExpandedConnectionId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [backupDialogMode, setBackupDialogMode] = useState<ThirdPartyBackupDialogMode>('export');
  const [pendingImportedConnections, setPendingImportedConnections] = useState<ThirdPartyConnection[]>([]);
  const [healthResults, setHealthResults] = useState<Record<string, ConnectionHealthProbeResult>>({});
  const [probingConnectionIds, setProbingConnectionIds] = useState<Set<string>>(new Set());
  const [isTestingAll, setIsTestingAll] = useState(false);

  const updateThirdPartyApi = (next: ThirdPartyApiSettings) => {
    onUpdateSettings({ thirdPartyApi: next });
  };

  const currentSettings = settings.thirdPartyApi ?? createDefaultThirdPartyApiSettings();

  const handleToggleEnabled = (connection: ThirdPartyConnection) => {
    updateThirdPartyApi(updateThirdPartyConnection(currentSettings, connection.id, { enabled: !connection.enabled }));
  };

  const handleAddTemplate = (templateId: ThirdPartyTemplateId) => {
    const connection = createConnectionFromTemplate(templateId, currentSettings.connections, createConnectionId());
    updateThirdPartyApi(addThirdPartyConnection(currentSettings, connection));
    setExpandedConnectionId(connection.id);
    setIsAddOpen(false);
  };

  const handleExportClick = () => {
    if (connections.length === 0) {
      toastWarning(t('thirdPartyExportEmpty'));
      return;
    }
    setBackupDialogMode('export');
    setIsBackupOpen(true);
  };

  const handleConfirmExport = (includeApiKeys: boolean) => {
    exportProvidersBackupFile(connections, { includeApiKeys });
  };

  const handleFileSelected = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (reader.result ?? e.target?.result) as string;
      const parsed = parseProvidersBackupText(text);
      if (parsed.validCount === 0) {
        toastError(t('thirdPartyImportError'));
        return;
      }

      if (connections.length === 0) {
        const next = applyImportedProviders([], parsed.connections, 'overwrite');
        updateThirdPartyApi({ ...currentSettings, connections: next });
        toastSuccess(interpolate(t('thirdPartyImportSuccess'), { count: parsed.validCount }));
        if (next.length > 0) {
          setExpandedConnectionId(next[0].id);
        }
      } else {
        setPendingImportedConnections(parsed.connections);
        setBackupDialogMode('import-confirm');
        setIsBackupOpen(true);
      }
    };
    reader.onerror = () => {
      toastError(t('thirdPartyImportError'));
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = (mode: ImportMode) => {
    const next = applyImportedProviders(connections, pendingImportedConnections, mode);
    updateThirdPartyApi({ ...currentSettings, connections: next });
    toastSuccess(interpolate(t('thirdPartyImportSuccess'), { count: pendingImportedConnections.length }));
    if (next.length > 0 && !expandedConnectionId) {
      setExpandedConnectionId(next[0].id);
    }
  };

  const handleProbeConnection = async (connection: ThirdPartyConnection) => {
    if (probingConnectionIds.has(connection.id)) return;
    setProbingConnectionIds((prev) => new Set(prev).add(connection.id));
    try {
      const result = await probeThirdPartyConnection(connection);
      setHealthResults((prev) => ({ ...prev, [connection.id]: result }));
      if (result.status === 'success') {
        toastSuccess(`${connection.name}: ${t('apiConfigTestSuccess')} (${formatLatency(result.latencyMs)})`);
      } else {
        toastError(
          `${connection.name}: ${t('apiConfigTestFailed')}${result.errorMessage ? ` - ${result.errorMessage}` : ''}`,
        );
      }
    } finally {
      setProbingConnectionIds((prev) => {
        const next = new Set(prev);
        next.delete(connection.id);
        return next;
      });
    }
  };

  const handleTestAllConnections = async () => {
    const targetConnections = connections.filter((c) => c.enabled && Boolean(c.baseUrl));
    if (targetConnections.length === 0) {
      toastWarning(t('thirdPartyExportEmpty'));
      return;
    }

    setIsTestingAll(true);
    setProbingConnectionIds((prev) => {
      const next = new Set(prev);
      targetConnections.forEach((c) => next.add(c.id));
      return next;
    });

    try {
      const results = await Promise.allSettled(
        targetConnections.map(async (conn) => {
          const result = await probeThirdPartyConnection(conn);
          setHealthResults((prev) => ({ ...prev, [conn.id]: result }));
          setProbingConnectionIds((prev) => {
            const next = new Set(prev);
            next.delete(conn.id);
            return next;
          });
          return result;
        }),
      );

      const successCount = results.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 'success',
      ).length;
      const failCount = targetConnections.length - successCount;

      if (failCount === 0) {
        toastSuccess(`${t('apiConfigTestSuccess')}: ${successCount}/${targetConnections.length}`);
      } else {
        toastWarning(`${t('apiConfigTestSuccess')}: ${successCount}, ${t('apiConfigTestFailed')}: ${failCount}`);
      }
    } finally {
      setIsTestingAll(false);
      setProbingConnectionIds(new Set());
    }
  };

  const connectionStatus = (connection: ThirdPartyConnection) => {
    const status = getThirdPartyConnectionStatus(connection);
    if (status === 'disabled') {
      return {
        label: t('thirdPartyConnectionDisabled'),
        className: 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)]',
      };
    }
    if (status === 'missing-key') {
      return {
        label: t('thirdPartyApiKeyMissing'),
        className: 'bg-[var(--theme-bg-warning)] text-[var(--theme-text-warning)]',
      };
    }
    if (status === 'missing-url') {
      return {
        label: t('thirdPartyApiUrlMissing'),
        className: 'bg-[var(--theme-bg-warning)] text-[var(--theme-text-warning)]',
      };
    }
    return {
      label: t('thirdPartyApiReady'),
      className: 'bg-[var(--theme-bg-success)] text-[var(--theme-text-success)]',
    };
  };

  return (
    <div className="space-y-3" data-settings-item="api-provider">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--theme-text-primary)]">{t('settingsApiModeThirdParty')}</h3>
          <p className="text-xs text-[var(--theme-text-secondary)] mt-0.5">{t('settingsOpenAICompatibleToggleHelp')}</p>
        </div>
        {connections.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileSelected(file);
                  e.target.value = '';
                }
              }}
            />
            <button
              type="button"
              data-testid="third-party-test-all-btn"
              className={SETTINGS_OUTLINE_BUTTON_CLASS}
              onClick={handleTestAllConnections}
              disabled={connections.length === 0 || isTestingAll}
              title={t('apiConfigTestAllConnections')}
            >
              {isTestingAll ? <Loader2 size={13} className="animate-spin" /> : <Activity size={13} />}
              {isTestingAll ? t('apiConfigTestingAll') : t('apiConfigTestAllConnections')}
            </button>
            <button
              type="button"
              data-testid="third-party-import-btn"
              className={SETTINGS_OUTLINE_BUTTON_CLASS}
              onClick={() => fileInputRef.current?.click()}
              title={t('thirdPartyImport')}
            >
              <Upload size={13} />
              {t('thirdPartyImport')}
            </button>
            <button
              type="button"
              data-testid="third-party-export-btn"
              className={SETTINGS_OUTLINE_BUTTON_CLASS}
              onClick={handleExportClick}
              disabled={connections.length === 0}
              title={t('thirdPartyExport')}
            >
              <Download size={13} />
              {t('thirdPartyExport')}
            </button>
            <button
              type="button"
              data-testid="third-party-add-connection"
              className={SETTINGS_PRIMARY_ACTION_BUTTON_CLASS}
              onClick={() => setIsAddOpen(true)}
            >
              <Plus size={14} />
              {t('thirdPartyAddConnection')}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-1.5" data-settings-item="api-third-party">
        <ThirdPartyAddConnectionDialog
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onSelectTemplate={handleAddTemplate}
          templates={THIRD_PARTY_TEMPLATE_IDS}
        />

        <ThirdPartyBackupDialog
          isOpen={isBackupOpen}
          onClose={() => setIsBackupOpen(false)}
          dialogMode={backupDialogMode}
          connectionsCount={connections.length}
          importedConnections={pendingImportedConnections}
          onConfirmExport={handleConfirmExport}
          onConfirmImport={handleConfirmImport}
        />

        {connections.length === 0 && !isAddOpen ? (
          <div className="rounded-lg border border-dashed border-[var(--theme-border-secondary)] px-3 py-6 text-center space-y-3">
            <p className="text-sm text-[var(--theme-text-secondary)]">{t('thirdPartyConnectionsEmpty')}</p>
            <button
              type="button"
              data-testid="third-party-add-connection"
              className={SETTINGS_PRIMARY_ACTION_BUTTON_CLASS}
              onClick={() => setIsAddOpen(true)}
            >
              <Plus size={14} />
              {t('thirdPartyAddConnection')}
            </button>
          </div>
        ) : (
          connections.map((connection) => {
            const isExpanded = expandedConnectionId === connection.id;
            const status = connectionStatus(connection);
            const displayTemplateId = getConnectionDisplayTemplateId(connection);
            const health = healthResults[connection.id];
            const isProbing = probingConnectionIds.has(connection.id);

            return (
              <div
                key={connection.id}
                data-testid={`connection-${connection.id}-card`}
                className={`rounded-lg border transition-all ${
                  connection.enabled
                    ? 'border-[var(--theme-border-focus)] bg-[var(--theme-bg-tertiary)]/30'
                    : 'border-[var(--theme-border-secondary)]/40 bg-[var(--theme-bg-tertiary)]/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2 p-2.5">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <Toggle
                        checked={connection.enabled}
                        onChange={() => handleToggleEnabled(connection)}
                        ariaLabel={`${connection.name} ${t('enable')}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedConnectionId(isExpanded ? null : connection.id)}
                      className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-[var(--theme-text-secondary)] flex-shrink-0" strokeWidth={2} />
                      ) : (
                        <ChevronRight size={14} className="text-[var(--theme-text-secondary)] flex-shrink-0" strokeWidth={2} />
                      )}
                      <img
                        src={getThirdPartyTemplateLogo(displayTemplateId)}
                        alt=""
                        width={18}
                        height={18}
                        draggable={false}
                        className="flex-shrink-0 object-contain"
                        style={{ width: 18, height: 18 }}
                      />
                      <span className="text-sm font-medium text-[var(--theme-text-primary)] truncate">
                        {connection.name}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-[var(--theme-bg-secondary)] text-[var(--theme-text-secondary)] flex-shrink-0">
                        {connection.protocol === 'anthropic'
                          ? t('thirdPartyProtocolAnthropic')
                          : connection.protocol === 'openai-responses'
                            ? t('thirdPartyProtocolOpenAIResponses')
                            : t('thirdPartyProtocolOpenAI')}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${status.className}`}>{status.label}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {health && (
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono font-medium transition-all ${
                          getLatencyBadgeStyles(health.grade).badge
                        }`}
                        title={
                          health.status === 'success'
                            ? `${t('apiConfigTestSuccess')}: ${formatLatency(health.latencyMs)} (${health.modelId})`
                            : `${t('apiConfigTestFailed')}${health.errorMessage ? `: ${health.errorMessage}` : ''}`
                        }
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${getLatencyBadgeStyles(health.grade).dot}`} />
                        <span>
                          {health.status === 'success'
                            ? formatLatency(health.latencyMs)
                            : t('apiConfigTestFailed')}
                        </span>
                      </span>
                    )}

                    <button
                      type="button"
                      data-testid={`quick-test-${connection.id}-btn`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProbeConnection(connection);
                      }}
                      disabled={isProbing}
                      className="p-1.5 rounded-md text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--theme-border-focus)] disabled:opacity-50"
                      title={t('apiConfigQuickTestTooltip')}
                      aria-label={`${t('apiConfigQuickTestTooltip')}: ${connection.name}`}
                    >
                      {isProbing ? (
                        <Loader2 size={13} className="animate-spin text-[var(--theme-text-primary)]" />
                      ) : (
                        <Activity size={13} />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <ThirdPartyConnectionEditor
                    connection={connection}
                    isInUse={isThirdPartyConnectionInUse(
                      connection.id,
                      useChatStore.getState().savedSessions,
                      settings.providerId,
                    )}
                    healthResult={health}
                    onHealthResult={(res) => setHealthResults((prev) => ({ ...prev, [connection.id]: res }))}
                    onChange={(updates) =>
                      updateThirdPartyApi(updateThirdPartyConnection(currentSettings, connection.id, updates))
                    }
                    onRemove={() => {
                      updateThirdPartyApi(removeThirdPartyConnection(currentSettings, connection.id));
                      setExpandedConnectionId((current) => (current === connection.id ? null : current));
                    }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
