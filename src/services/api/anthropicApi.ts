import type { UsageMetadata } from '@google/genai';
import type { ModelOption, NonStreamMessageSender, StreamMessageSender } from '@/types';
import { buildAnthropicRequestBody } from './anthropicMessages';
import { extractAnthropicMessageText, extractAnthropicMessageThoughts } from './anthropicResponses';
import { readAnthropicStreamEvents } from './anthropicStream';
import {
  asAnthropicChatConfig,
  mapAnthropicUsage,
  type AnthropicResponsePayload,
  type AnthropicStreamEvent,
} from './anthropicTypes';
import { buildAnthropicMessagesUrl, buildAnthropicModelsUrl } from './anthropicUrls';
import {
  createApiRequestInitFactory,
  executeNonStreamChatRequest,
  executeStreamChatRequest,
  fetchProviderModelOptions,
} from './requestFactory';

const ANTHROPIC_VERSION = '2023-06-01';

const anthropicAuthHeaders = (apiKey: string): Record<string, string> => ({
  'x-api-key': apiKey,
  'anthropic-version': ANTHROPIC_VERSION,
});

const { createRequestInit, createGetRequestInit } = createApiRequestInitFactory(anthropicAuthHeaders);

export const fetchAnthropicModels = async (
  apiKey: string,
  baseUrl: string | null | undefined,
  abortSignal: AbortSignal,
  providerId?: string | null,
  extraHeaders?: Record<string, string> | null,
): Promise<ModelOption[]> =>
  fetchProviderModelOptions({
    url: buildAnthropicModelsUrl(baseUrl),
    requestInit: createGetRequestInit(apiKey, abortSignal, providerId, baseUrl, extraHeaders),
    errorContextLabel: 'Anthropic',
  });

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
  await executeNonStreamChatRequest<AnthropicResponsePayload>({
    requestUrl: () => buildAnthropicMessagesUrl(anthropicConfig.baseUrl),
    requestInit: () =>
      createRequestInit(
        apiKey,
        buildAnthropicRequestBody(modelId, history, parts, anthropicConfig, role, false),
        abortSignal,
        providerId,
        anthropicConfig.baseUrl,
        anthropicConfig.extraHeaders,
      ),
    errorContextLabel: 'Anthropic',
    failureLogLabel: 'Anthropic non-stream request failed:',
    abortSignal,
    onError,
    onComplete,
    toCompletionArgs: (payload) => {
      const text = extractAnthropicMessageText(payload);
      return [text ? [{ text }] : [], extractAnthropicMessageThoughts(payload), mapAnthropicUsage(payload.usage)];
    },
  });
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
  await executeStreamChatRequest({
    requestUrl: () => buildAnthropicMessagesUrl(anthropicConfig.baseUrl),
    requestInit: () =>
      createRequestInit(
        apiKey,
        buildAnthropicRequestBody(modelId, history, parts, anthropicConfig, role, true),
        abortSignal,
        providerId,
        anthropicConfig.baseUrl,
        anthropicConfig.extraHeaders,
      ),
    errorContextLabel: 'Anthropic',
    failureLogLabel: 'Anthropic stream request failed:',
    abortSignal,
    onError,
    onComplete,
    readStream: async (response) => {
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
      return finalUsage;
    },
  });
};
