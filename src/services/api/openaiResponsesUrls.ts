import { DEFAULT_OPENAI_COMPATIBLE_BASE_URL } from '@/utils/apiProxyUrl';
import { getThirdPartyProxyBaseUrl } from '@/runtime/runtimeConfig';

export type OpenAIResponsesBaseUrlWarning = 'responses-endpoint' | 'chat-completions-endpoint' | 'models-endpoint';

const getRawBaseUrlPath = (baseUrl?: string | null): string =>
  (baseUrl?.trim() || DEFAULT_OPENAI_COMPATIBLE_BASE_URL).split(/[?#]/, 1)[0].replace(/\/+$/, '').toLowerCase();

export const getOpenAIResponsesBaseUrlWarning = (baseUrl?: string | null): OpenAIResponsesBaseUrlWarning | null => {
  const baseUrlPath = getRawBaseUrlPath(baseUrl);

  if (baseUrlPath.endsWith('/responses')) {
    return 'responses-endpoint';
  }

  if (baseUrlPath.endsWith('/chat/completions')) {
    return 'chat-completions-endpoint';
  }

  if (baseUrlPath.endsWith('/models')) {
    return 'models-endpoint';
  }

  return null;
};

const normalizeOpenAIResponsesBaseUrl = (baseUrl?: string | null): string => {
  const raw = (baseUrl?.trim() || DEFAULT_OPENAI_COMPATIBLE_BASE_URL).replace(/\/+$/, '');
  if (raw.toLowerCase().endsWith('/responses')) {
    return raw.slice(0, -'/responses'.length).replace(/\/+$/, '');
  }
  return raw;
};

const resolveOpenAIResponsesBaseUrl = (baseUrl?: string | null): string | null => {
  const proxyUrl = getThirdPartyProxyBaseUrl();
  if (proxyUrl) {
    return proxyUrl;
  }
  return baseUrl?.trim() || null;
};

export const buildOpenAIResponsesUrl = (baseUrl?: string | null): string => {
  const resolved = resolveOpenAIResponsesBaseUrl(baseUrl);
  if (resolved) {
    if (!/^https?:\/\//i.test(resolved)) {
      return `${resolved.replace(/\/+$/, '')}/responses`;
    }
  }
  return `${normalizeOpenAIResponsesBaseUrl(resolved)}/responses`;
};

export const buildOpenAIResponsesUpstreamUrl = (baseUrl?: string | null): string =>
  `${normalizeOpenAIResponsesBaseUrl(baseUrl)}/responses`;

export const buildOpenAIResponsesModelsUrl = (baseUrl?: string | null): string => {
  const resolved = resolveOpenAIResponsesBaseUrl(baseUrl);
  if (resolved) {
    if (!/^https?:\/\//i.test(resolved)) {
      return `${resolved.replace(/\/+$/, '')}/models`;
    }
  }
  return `${normalizeOpenAIResponsesBaseUrl(resolved)}/models`;
};
