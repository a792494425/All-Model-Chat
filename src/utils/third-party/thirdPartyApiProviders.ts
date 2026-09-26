import {
  GEMINI_PROVIDER_ID,
  LEGACY_THIRD_PARTY_PROVIDER_IDS,
  THIRD_PARTY_TEMPLATE_IDS,
  type AppSettings,
  type ChatSettings,
  type LegacyThirdPartyProviderId,
  type ModelOption,
  type ThirdPartyApiSettings,
  type ThirdPartyConnection,
  type ThirdPartyTemplateId,
} from '@/types';
import { deduplicateModelsById, sanitizeModelOptions } from '@/utils/model/modelSorting';

import {
  cloneModels,
  getThirdPartyTemplateDefaults,
  getThirdPartyTemplateLinks,
  isThirdPartyProtocol,
  isThirdPartyTemplateId,
  LEGACY_TEMPLATE_ID,
  TEMPLATE_DEFAULTS,
  TEMPLATE_PRESETS,
  type TemplatePresetMeta,
  THIRD_PARTY_PROVIDER_LABELS,
  THIRD_PARTY_TEMPLATE_LABELS,
} from './presets';

export {
  THIRD_PARTY_PROVIDER_LABELS,
  THIRD_PARTY_TEMPLATE_LABELS,
  type TemplatePresetMeta,
  TEMPLATE_PRESETS,
  getThirdPartyTemplateDefaults,
  getThirdPartyTemplateLinks,
};

const cloneConnection = (connection: ThirdPartyConnection): ThirdPartyConnection => ({
  ...connection,
  extraHeaders: { ...connection.extraHeaders },
  models: cloneModels(connection.models),
});

export const createDefaultThirdPartyApiSettings = (): ThirdPartyApiSettings => ({
  connections: [],
});
export const getConnectionDisplayTemplateId = (
  connection: Pick<ThirdPartyConnection, 'templateId' | 'protocol'>,
): ThirdPartyTemplateId => {
  if (
    connection.templateId === 'openai' &&
    (connection.protocol === 'openai-compatible' || connection.protocol === 'openai-responses')
  ) {
    return 'openai';
  }
  const defaultProtocol = TEMPLATE_DEFAULTS[connection.templateId]?.protocol;
  if (!defaultProtocol || connection.protocol === defaultProtocol) {
    return connection.templateId;
  }
  return connection.protocol === 'anthropic' ? 'custom-anthropic' : 'custom-openai';
};

type ThirdPartyConnectionStatusKind = 'disabled' | 'missing-key' | 'missing-url' | 'ready';

export const getThirdPartyConnectionStatus = (
  connection: Pick<ThirdPartyConnection, 'enabled' | 'apiKey' | 'baseUrl'> & { authOptional?: boolean },
): ThirdPartyConnectionStatusKind => {
  if (!connection.enabled) {
    return 'disabled';
  }
  if (!connection.authOptional && !connection.apiKey?.trim()) {
    return 'missing-key';
  }
  if (!connection.baseUrl?.trim()) {
    return 'missing-url';
  }
  return 'ready';
};

export const isThirdPartyConnectionInUse = (
  connectionId: string,
  sessions: Array<{ settings?: { providerId?: string } }>,
  defaultProviderId?: string,
): boolean =>
  defaultProviderId === connectionId || sessions.some((session) => session.settings?.providerId === connectionId);

export const getProxyProviderHeader = (templateId: ThirdPartyTemplateId | string): string => {
  if (templateId === 'custom-openai' || templateId === 'custom-anthropic' || templateId === 'custom') {
    return 'custom';
  }
  if ((THIRD_PARTY_TEMPLATE_IDS as readonly string[]).includes(templateId)) {
    return templateId;
  }
  if ((LEGACY_THIRD_PARTY_PROVIDER_IDS as readonly string[]).includes(templateId as LegacyThirdPartyProviderId)) {
    return templateId;
  }
  return 'custom';
};

export const createConnectionId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `connection-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
};

const modelsKey = (models: ModelOption[]): string =>
  models.map((model) => `${model.id}\0${model.name}\0${model.isPinned ? '1' : '0'}`).join('\n');

const sanitizeExtraHeaders = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const headers: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(value as Record<string, unknown>)) {
    const key = rawKey.trim();
    if (!/^[A-Za-z0-9-]+$/.test(key) || typeof rawValue !== 'string') {
      continue;
    }
    const headerValue = rawValue.trim();
    if (!headerValue) {
      continue;
    }
    headers[key] = headerValue;
  }
  return headers;
};

export const sanitizeThirdPartyConnection = (
  value: Partial<ThirdPartyConnection> | undefined,
  fallbackTemplateId: ThirdPartyTemplateId = 'custom-openai',
): ThirdPartyConnection | null => {
  const templateId = isThirdPartyTemplateId(value?.templateId) ? value.templateId : fallbackTemplateId;
  const defaults = TEMPLATE_DEFAULTS[templateId];
  const candidateModels = Array.isArray(value?.models) ? value.models : defaults.models;
  const sanitizedModels = sanitizeModelOptions(candidateModels);
  const models = Array.isArray(value?.models) ? sanitizedModels : cloneModels(defaults.models);
  const defaultModelId =
    models.find((model) => model.isPinned)?.id ?? models[0]?.id ?? (models.length === 0 ? '' : defaults.modelId);
  const modelId = typeof value?.modelId === 'string' ? value.modelId.trim() || defaultModelId : defaultModelId;
  const id = typeof value?.id === 'string' && value.id.trim() ? value.id.trim() : '';
  if (!id) {
    return null;
  }

  const name = typeof value?.name === 'string' && value.name.trim() ? value.name.trim() : defaults.name;

  return {
    id,
    name,
    templateId,
    apiKey: typeof value?.apiKey === 'string' ? value.apiKey : null,
    baseUrl: typeof value?.baseUrl === 'string' ? value.baseUrl : defaults.baseUrl,
    extraHeaders: sanitizeExtraHeaders(value?.extraHeaders),
    modelId,
    models,
    protocol: isThirdPartyProtocol(value?.protocol) ? value.protocol : defaults.protocol,
    enabled: value?.enabled === true,
    authOptional: typeof value?.authOptional === 'boolean' ? value.authOptional : defaults.authOptional,
    icon: typeof value?.icon === 'string' && value.icon.trim() ? value.icon.trim() : undefined,
    notes: typeof value?.notes === 'string' && value.notes.trim() ? value.notes.trim() : undefined,
  };
};

const isLegacyProviderRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const shouldMigrateLegacyProvider = (
  providerId: LegacyThirdPartyProviderId,
  value: Record<string, unknown> | undefined,
): boolean => {
  const defaults = TEMPLATE_DEFAULTS[LEGACY_TEMPLATE_ID[providerId]];
  if (!value) {
    return false;
  }
  if (value.enabled) {
    return true;
  }
  if (typeof value.apiKey === 'string' && value.apiKey.trim()) {
    return true;
  }
  if (typeof value.baseUrl === 'string' && value.baseUrl !== defaults.baseUrl) {
    return true;
  }
  if (typeof value.modelId === 'string' && value.modelId.trim() && value.modelId.trim() !== defaults.modelId) {
    return true;
  }
  if (Array.isArray(value.models) && modelsKey(sanitizeModelOptions(value.models)) !== modelsKey(defaults.models)) {
    return true;
  }
  return false;
};

const migrateLegacyProviders = (providers: Record<string, unknown>): ThirdPartyConnection[] => {
  const connections: ThirdPartyConnection[] = [];

  for (const providerId of LEGACY_THIRD_PARTY_PROVIDER_IDS) {
    const raw = isLegacyProviderRecord(providers[providerId]) ? providers[providerId] : undefined;
    if (!shouldMigrateLegacyProvider(providerId, raw)) {
      continue;
    }

    const templateId = LEGACY_TEMPLATE_ID[providerId];
    const connection = sanitizeThirdPartyConnection(
      {
        ...(raw as Partial<ThirdPartyConnection>),
        id: providerId,
        name: typeof raw?.name === 'string' ? raw.name : THIRD_PARTY_PROVIDER_LABELS[providerId],
        templateId,
      },
      templateId,
    );
    if (connection) {
      connections.push(connection);
    }
  }

  return connections;
};

export const sanitizeThirdPartyApiSettings = (value: unknown): ThirdPartyApiSettings => {
  const record = isLegacyProviderRecord(value) ? value : {};
  if (Array.isArray(record.connections)) {
    const seen = new Set<string>();
    const connections: ThirdPartyConnection[] = [];
    for (const item of record.connections) {
      const connection = sanitizeThirdPartyConnection(
        item && typeof item === 'object' ? (item as Partial<ThirdPartyConnection>) : undefined,
      );
      if (!connection || seen.has(connection.id)) {
        continue;
      }
      seen.add(connection.id);
      connections.push(connection);
    }
    return { connections };
  }

  if (isLegacyProviderRecord(record.providers)) {
    return { connections: migrateLegacyProviders(record.providers) };
  }

  return createDefaultThirdPartyApiSettings();
};

const getThirdPartyConnections = (settings: Pick<AppSettings, 'thirdPartyApi'>): ThirdPartyConnection[] =>
  settings.thirdPartyApi?.connections ?? [];

export const findThirdPartyConnection = (
  settings: Pick<AppSettings, 'thirdPartyApi'>,
  connectionId: string | undefined,
): ThirdPartyConnection | undefined => {
  if (!connectionId) {
    return undefined;
  }
  return getThirdPartyConnections(settings).find((connection) => connection.id === connectionId);
};

/**
 * Returns enabled third-party connections as { id, config } pairs.
 */
export const getEnabledThirdPartyProviders = (
  settings: Pick<AppSettings, 'thirdPartyApi'>,
): { id: string; config: ThirdPartyConnection }[] =>
  getThirdPartyConnections(settings)
    .filter((connection) => connection.enabled)
    .map((connection) => ({ id: connection.id, config: connection }));

export const resolveProviderForModelId = (
  settings: Pick<AppSettings, 'thirdPartyApi'>,
  modelId: string,
): { id: string; config: ThirdPartyConnection } | undefined =>
  getEnabledThirdPartyProviders(settings).find(({ config }) => config.models.some((model) => model.id === modelId));

export const buildProviderAwareModelList = (
  appSettings: Pick<AppSettings, 'thirdPartyApi'>,
  baseModels: ModelOption[],
  session?: Pick<ChatSettings, 'modelId' | 'providerId'>,
): ModelOption[] => {
  const thirdPartyModels = getEnabledThirdPartyProviders(appSettings).flatMap(({ id, config }) =>
    deduplicateModelsById(config.models)
      .filter((model) => {
        if (model.visibleInSelector === false) {
          return session?.providerId === id && session?.modelId === model.id;
        }
        return true;
      })
      .map((model) => ({
        ...model,
        apiMode: 'third-party' as const,
        providerId: id,
        templateId: getConnectionDisplayTemplateId(config),
        connectionName: config.notes ? `${config.name} [${config.notes}]` : config.name,
        ...(config.authOptional || config.apiKey?.trim() ? {} : { missingApiKey: true as const }),
      })),
  );

  const isCurrentGeminiSession =
    !session?.providerId || session?.providerId === GEMINI_PROVIDER_ID || session?.providerId === 'gemini';
  const filteredBaseModels = deduplicateModelsById(baseModels).filter((model) => {
    if (model.visibleInSelector === false) {
      return isCurrentGeminiSession && session?.modelId === model.id;
    }
    return true;
  });

  const models = [...filteredBaseModels, ...thirdPartyModels];
  const sessionProviderId = session?.providerId;
  if (!sessionProviderId || sessionProviderId === GEMINI_PROVIDER_ID || sessionProviderId === 'gemini') {
    return models;
  }

  const alreadyPresent = models.some((model) => model.providerId === sessionProviderId && model.id === session.modelId);
  if (alreadyPresent) {
    return models;
  }

  const connection = findThirdPartyConnection(appSettings, sessionProviderId);
  return [
    ...models,
    {
      id: session.modelId,
      name: session.modelId,
      apiMode: 'third-party',
      providerId: sessionProviderId,
      templateId: connection?.templateId,
      connectionName: connection?.name ?? sessionProviderId,
      unavailable: true,
    },
  ];
};

export const nextConnectionName = (connections: ThirdPartyConnection[], baseName: string): string => {
  const names = new Set(connections.map((connection) => connection.name));
  if (!names.has(baseName)) {
    return baseName;
  }

  let suffix = 2;
  while (names.has(`${baseName} ${suffix}`)) {
    suffix += 1;
  }
  return `${baseName} ${suffix}`;
};

export const createConnectionFromTemplate = (
  templateId: ThirdPartyTemplateId,
  existing: ThirdPartyConnection[],
  id: string,
): ThirdPartyConnection => {
  const defaults = getThirdPartyTemplateDefaults(templateId);
  return {
    id,
    name: nextConnectionName(existing, defaults.name),
    templateId,
    protocol: defaults.protocol,
    apiKey: null,
    baseUrl: defaults.baseUrl,
    extraHeaders: {},
    modelId: defaults.modelId,
    models: defaults.models,
    enabled: true,
    authOptional: defaults.authOptional,
  };
};

export const updateThirdPartyConnection = (
  thirdPartyApi: ThirdPartyApiSettings,
  connectionId: string,
  updates: Partial<ThirdPartyConnection>,
): ThirdPartyApiSettings => ({
  connections: thirdPartyApi.connections.map((connection) => {
    if (connection.id !== connectionId) {
      return connection;
    }
    return (
      sanitizeThirdPartyConnection({ ...connection, ...updates, id: connection.id }, connection.templateId) ??
      connection
    );
  }),
});

export const addThirdPartyConnection = (
  thirdPartyApi: ThirdPartyApiSettings,
  connection: ThirdPartyConnection,
): ThirdPartyApiSettings => ({
  connections: [...thirdPartyApi.connections, cloneConnection(connection)],
});

export const removeThirdPartyConnection = (
  thirdPartyApi: ThirdPartyApiSettings,
  connectionId: string,
): ThirdPartyApiSettings => ({
  connections: thirdPartyApi.connections.filter((connection) => connection.id !== connectionId),
});

export const duplicateThirdPartyConnection = (
  connection: ThirdPartyConnection,
  existingConnections: ThirdPartyConnection[],
  copySuffixPattern: string = '{name} (Copy)',
): ThirdPartyConnection => {
  const newId = createConnectionId();
  const baseCopyName = copySuffixPattern.replace('{name}', connection.name);
  const newName = nextConnectionName(existingConnections, baseCopyName);

  const clonedModels: ModelOption[] = (connection.models || []).map((model) => ({
    ...model,
    providerId: newId,
    connectionName: newName,
    parameters: model.parameters ? { ...model.parameters } : undefined,
    capabilities: model.capabilities ? { ...model.capabilities } : undefined,
  }));

  return {
    ...connection,
    id: newId,
    name: newName,
    extraHeaders: { ...(connection.extraHeaders || {}) },
    models: clonedModels,
  };
};

export const isDeepSeekOfficialEndpoint = (templateId?: string | null, baseUrl?: string | null): boolean => {
  if (templateId === 'deepseek') return true;
  if (!baseUrl) return false;
  return baseUrl.toLowerCase().includes('api.deepseek.com');
};

export const isDashScopeOfficialEndpoint = (templateId?: string | null, baseUrl?: string | null): boolean => {
  if (templateId === 'qwen') return true;
  if (!baseUrl) return false;
  // Both the mainland (`dashscope.aliyuncs.com`) and Singapore
  // (`dashscope-intl.aliyuncs.com`) hosts are DashScope. The intl form does
  // NOT contain the mainland host as a substring, so a single-host check
  // silently disabled the app's own Qwen preset.
  return /dashscope(?:-intl)?\.aliyuncs\.com/i.test(baseUrl);
};

export const isLocalEngineEndpoint = (templateId?: string | null, baseUrl?: string | null): boolean => {
  if (templateId === 'ollama' || templateId === 'lmstudio') return true;
  if (!baseUrl) return false;
  const lower = baseUrl.toLowerCase();
  return (
    lower.includes('localhost:11434') ||
    lower.includes('127.0.0.1:11434') ||
    lower.includes('localhost:1234') ||
    lower.includes('127.0.0.1:1234')
  );
};

export const reorderThirdPartyConnections = (
  thirdPartyApi: ThirdPartyApiSettings,
  orderedIds: string[],
): ThirdPartyApiSettings => {
  const connectionMap = new Map(thirdPartyApi.connections.map((connection) => [connection.id, connection]));
  const reordered: ThirdPartyConnection[] = [];

  orderedIds.forEach((id) => {
    const connection = connectionMap.get(id);
    if (connection) {
      reordered.push(connection);
      connectionMap.delete(id);
    }
  });

  // Append any connections that weren't in orderedIds
  connectionMap.forEach((remainingConnection) => {
    reordered.push(remainingConnection);
  });

  return {
    ...thirdPartyApi,
    connections: reordered,
  };
};

export function generateColorFromChar(text: string): string {
  if (!text) return '#475569';
  let hash = 0;
  for (let charIndex = 0; charIndex < text.length; charIndex++) {
    hash = text.charCodeAt(charIndex) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 38%)`;
}

export function getFirstCharacter(text: string): string {
  if (!text) return '?';
  const trimmed = text.trim();
  if (!trimmed) return '?';
  return trimmed.slice(0, 1).toUpperCase();
}
