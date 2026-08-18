import type { UsageMetadata } from '@google/genai';
import { readResponseErrorMessage, toError } from '@/utils/errorMessage';
import { deduplicateModelsById } from '@/utils/model/modelSorting';
import type { ModelOption, NonStreamMessageSender, StreamMessageSender } from '@/types';
import { logService } from '@/services/logService';
import { buildAnthropicRequestBody } from './anthropicMessages';
import { extractAnthropicMessageText, extractAnthropicMessageThoughts } from './anthropicResponses';
import { readAnthropicStreamEvents } from './anthropicStream';
import {
  asAnthropicChatConfig,
  mapAnthropicUsage,
  type AnthropicModelsResponsePayload,
  type AnthropicResponsePayload,
  type AnthropicStreamEvent,
} from './anthropicTypes';
import { buildAnthropicMessagesUrl, buildAnthropicModelsUrl } from './anthropicUrls';
import { buildThirdPartyForwardHeaders } from './thirdPartyRequestHeaders';

const ANTHROPIC_VERSION = '2023-06-01';

const createRequestInit = (
  apiKey: string,
  body: Record<string, unknown>,
  abortSignal: AbortSignal,
  providerId?: string | null,
  baseUrl?: string | null,
  extraHeaders?: Record<string, string> | null,
): RequestInit => ({
  method: 'POST',
  headers: {
    'x-api-key': apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
    'content-type': 'application/json',
    ...buildThirdPartyForwardHeaders({ proxyProviderId: providerId, baseUrl, extraHeaders }),
  },
  body: JSON.stringify(body),
  signal: abortSignal,
});

const createGetRequestInit = (
  apiKey: string,
  abortSignal: AbortSignal,
  providerId?: string | null,
  baseUrl?: string | null,
  extraHeaders?: Record<string, string> | null,
): RequestInit => ({
  method: 'GET',
  headers: {
    'x-api-key': apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
    ...buildThirdPartyForwardHeaders({ proxyProviderId: providerId, baseUrl, extraHeaders }),
  },
  signal: abortSignal,
});

export const fetchAnthropicModels = async (
  apiKey: string,
  baseUrl: string | null | undefined,
  abortSignal: AbortSignal,
  providerId?: string | null,
  extraHeaders?: Record<string, string> | null,
): Promise<ModelOption[]> => {
  const response = await fetch(
    buildAnthropicModelsUrl(baseUrl),
    createGetRequestInit(apiKey, abortSignal, providerId, baseUrl, extraHeaders),
  );
  if (!response.ok) {
    throw new Error(await readResponseErrorMessage(response, 'Anthropic'));
  }
  const payload = (await response.json()) as AnthropicModelsResponsePayload;
  const rawModels = (payload.data ?? [])
    .map((item) => (typeof item.id === 'string' ? item.id.trim() : ''))
    .filter((id) => id.length > 0)
    .map((id) => ({ id, name: id }));
  return deduplicateModelsById(rawModels);
};

export const sendAnthropicMessageNonStream: NonStreamMessageSender = async (
  apiKey,
  modelId,
  history,
  parts,
  config,
  abortSignal,
  onError,
  onComplete,
  role = 'user',
  providerId,
) => {
  const anthropicConfig = asAnthropicChatConfig(config);
  try {
    if (abortSignal.aborted) {
      onComplete([], undefined, undefined, undefined, undefined);
      return;
    }
    const response = await fetch(
      buildAnthropicMessagesUrl(anthropicConfig.baseUrl),
      createRequestInit(
        apiKey,
        buildAnthropicRequestBody(modelId, history, parts, anthropicConfig, role, false),
        abortSignal,
        providerId,
        anthropicConfig.baseUrl,
        anthropicConfig.extraHeaders,
      ),
    );
    if (!response.ok) {
      throw new Error(await readResponseErrorMessage(response, 'Anthropic'));
    }
    const payload = (await response.json()) as AnthropicResponsePayload;
    if (abortSignal.aborted) {
      onComplete([], undefined, undefined, undefined, undefined);
      return;
    }
    const text = extractAnthropicMessageText(payload);
    const thoughts = extractAnthropicMessageThoughts(payload);
    onComplete(text ? [{ text }] : [], thoughts, mapAnthropicUsage(payload.usage), undefined, undefined);
  } catch (error) {
    logService.error('Anthropic non-stream request failed:', error);
    onError(toError(error));
  }
};

export const sendAnthropicMessageStream: StreamMessageSender = async (
  apiKey,
  modelId,
  history,
  parts,
  config,
  abortSignal,
  onPart,
  onThoughtChunk,
  onError,
  onComplete,
  role = 'user',
  providerId,
) => {
  const anthropicConfig = asAnthropicChatConfig(config);
  let finalUsage: UsageMetadata | undefined;
  try {
    if (abortSignal.aborted) {
      onComplete(undefined, undefined, undefined);
      return;
    }
    const response = await fetch(
      buildAnthropicMessagesUrl(anthropicConfig.baseUrl),
      createRequestInit(
        apiKey,
        buildAnthropicRequestBody(modelId, history, parts, anthropicConfig, role, true),
        abortSignal,
        providerId,
        anthropicConfig.baseUrl,
        anthropicConfig.extraHeaders,
      ),
    );
    if (!response.ok) {
      throw new Error(await readResponseErrorMessage(response, 'Anthropic'));
    }
    await readAnthropicStreamEvents(response, abortSignal, (event: AnthropicStreamEvent) => {
      if (event.type === 'content_block_delta' && event.delta?.text) {
        onPart({ text: event.delta.text });
      }
      if (event.type === 'content_block_delta' && event.delta?.type === 'thinking_delta' && event.delta.thinking) {
        onThoughtChunk(event.delta.thinking);
      }
      if (event.usage) {
        const usage = mapAnthropicUsage(event.usage);
        if (usage) finalUsage = usage;
      }
      if (event.type === 'message_delta' && event.usage) {
        const usage = mapAnthropicUsage(event.usage);
        if (usage) finalUsage = usage;
      }
    });
    onComplete(finalUsage, undefined, undefined);
  } catch (error) {
    logService.error('Anthropic stream request failed:', error);
    onError(toError(error));
  }
};
