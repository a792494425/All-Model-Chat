import type { UsageMetadata } from '@google/genai';
import type { ModelOption, NonStreamMessageSender, StreamMessageSender } from '@/types';
import { buildOpenAICompatibleRequestBody } from './openaiCompatibleMessages';
import {
  extractOpenAICompatibleMessageText,
  extractOpenAICompatibleReasoningDelta,
  extractOpenAICompatibleReasoningText,
} from './openaiCompatibleResponses';
import { readOpenAICompatibleStreamEvents } from './openaiCompatibleStream';
import {
  asOpenAICompatibleConfig,
  mapOpenAICompatibleUsage,
  type OpenAIResponsePayload,
} from './openaiCompatibleTypes';
import { buildOpenAICompatibleChatCompletionsUrl, buildOpenAICompatibleModelsUrl } from './openaiCompatibleUrls';
import {
  createApiRequestInitFactory,
  executeNonStreamChatRequest,
  executeStreamChatRequest,
  fetchProviderModelOptions,
} from './requestFactory';

const openAiCompatibleAuthHeaders = (apiKey: string): Record<string, string> => ({
  authorization: `Bearer ${apiKey}`,
});

const { createRequestInit, createGetRequestInit } = createApiRequestInitFactory(openAiCompatibleAuthHeaders);

export const fetchOpenAICompatibleModels = async (
  apiKey: string,
  baseUrl: string | null | undefined,
  abortSignal: AbortSignal,
  providerId?: string | null,
  extraHeaders?: Record<string, string> | null,
): Promise<ModelOption[]> =>
  fetchProviderModelOptions({
    url: buildOpenAICompatibleModelsUrl(baseUrl),
    requestInit: createGetRequestInit(apiKey, abortSignal, providerId, baseUrl, extraHeaders),
    errorContextLabel: 'OpenAI-compatible',
  });

export const sendOpenAICompatibleMessageNonStream: NonStreamMessageSender = async (
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
  const compatibleConfig = asOpenAICompatibleConfig(config);
  await executeNonStreamChatRequest<OpenAIResponsePayload>({
    requestUrl: () => buildOpenAICompatibleChatCompletionsUrl(compatibleConfig.baseUrl),
    requestInit: () =>
      createRequestInit(
        apiKey,
        buildOpenAICompatibleRequestBody(modelId, history, parts, compatibleConfig, role, false),
        abortSignal,
        providerId,
        compatibleConfig.baseUrl,
        compatibleConfig.extraHeaders,
      ),
    errorContextLabel: 'OpenAI-compatible',
    failureLogLabel: 'OpenAI-compatible non-stream request failed:',
    abortSignal,
    onError,
    onComplete,
    toCompletionArgs: (payload) => {
      const text = extractOpenAICompatibleMessageText(payload);
      return [
        text ? [{ text }] : [],
        extractOpenAICompatibleReasoningText(payload),
        mapOpenAICompatibleUsage(payload.usage),
      ];
    },
  });
};

export const sendOpenAICompatibleMessageStream: StreamMessageSender = async (
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
  const compatibleConfig = asOpenAICompatibleConfig(config);
  let finalUsage: UsageMetadata | undefined;
  await executeStreamChatRequest({
    requestUrl: () => buildOpenAICompatibleChatCompletionsUrl(compatibleConfig.baseUrl),
    requestInit: () =>
      createRequestInit(
        apiKey,
        buildOpenAICompatibleRequestBody(modelId, history, parts, compatibleConfig, role, true),
        abortSignal,
        providerId,
        compatibleConfig.baseUrl,
        compatibleConfig.extraHeaders,
      ),
    errorContextLabel: 'OpenAI-compatible',
    failureLogLabel: 'OpenAI-compatible stream request failed:',
    abortSignal,
    onError,
    onComplete,
    readStream: async (response) => {
      await readOpenAICompatibleStreamEvents(response, abortSignal, (payload) => {
        const reasoningContent = extractOpenAICompatibleReasoningDelta(payload);
        if (reasoningContent) {
          onThoughtChunk(reasoningContent);
        }

        const content = payload.choices?.[0]?.delta?.content;
        if (content) {
          onPart({ text: content });
        }

        const usage = mapOpenAICompatibleUsage(payload.usage);
        if (usage) {
          finalUsage = usage;
        }
      });
      return finalUsage;
    },
  });
};
