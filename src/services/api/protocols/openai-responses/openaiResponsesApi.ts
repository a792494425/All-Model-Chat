import type { FunctionCall, Part, UsageMetadata } from '@google/genai';
import type { ChatHistoryItem, ModelOption, NonStreamMessageSender, StreamMessageSender } from '@/types';
import type { TurnStreamCallbacks } from '@/features/standard-chat/standardToolLoop';
import { readResponseErrorMessage } from '@/utils/errorMessage';
import { buildOpenAIResponsesRequestBody } from './openaiResponsesMessages';
import {
  extractOpenAIResponsesFinishReason,
  extractOpenAIResponsesMessageText,
  extractOpenAIResponsesMessageThoughts,
} from './openaiResponsesResponses';
import { readOpenAIResponsesStreamEvents } from './openaiResponsesStream';
import {
  asOpenAIResponsesConfig,
  mapOpenAIResponsesUsage,
  type OpenAIResponsesResponsePayload,
} from './openaiResponsesTypes';
import { buildOpenAIResponsesModelsUrl, buildOpenAIResponsesUrl } from './openaiResponsesUrls';
import { isAuthOptionalApiKey } from '../../../../../shared/serverManagedApiKey';
import {
  createApiRequestInitFactory,
  executeNonStreamChatRequest,
  executeStreamChatRequest,
  fetchProviderModelOptions,
} from '@/services/api/requestFactory';

// Omits the auth header for the authOptional sentinel (local engines that take
// unauthenticated requests) instead of sending `Bearer auth-optional`.
const openAiResponsesAuthHeaders = (apiKey: string): Record<string, string> =>
  isAuthOptionalApiKey(apiKey) ? {} : { authorization: `Bearer ${apiKey}` };

const TRUNCATION_NOTICE = '\n\n[Output truncated: the response hit max_output_tokens.]';

const appendTruncationNotice = (text: string): string => `${text}${TRUNCATION_NOTICE}`;

const { createRequestInit, createGetRequestInit } = createApiRequestInitFactory(openAiResponsesAuthHeaders);

export const fetchOpenAIResponsesModels = async (
  apiKey: string,
  baseUrl: string | null | undefined,
  abortSignal: AbortSignal,
  providerId?: string | null,
  extraHeaders?: Record<string, string> | null,
): Promise<ModelOption[]> =>
  fetchProviderModelOptions({
    url: buildOpenAIResponsesModelsUrl(baseUrl),
    requestInit: createGetRequestInit(apiKey, abortSignal, providerId, baseUrl, extraHeaders),
    errorContextLabel: 'OpenAI Responses',
  });

export const sendOpenAIResponsesNonStream: NonStreamMessageSender = async (
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
  const responsesConfig = asOpenAIResponsesConfig(config);
  await executeNonStreamChatRequest<OpenAIResponsesResponsePayload>({
    requestUrl: () => buildOpenAIResponsesUrl(responsesConfig.baseUrl),
    requestInit: () =>
      createRequestInit(
        apiKey,
        buildOpenAIResponsesRequestBody(modelId, history, parts, responsesConfig, role, false),
        abortSignal,
        providerId,
        responsesConfig.baseUrl,
        responsesConfig.extraHeaders,
      ),
    errorContextLabel: 'OpenAI Responses',
    failureLogLabel: 'OpenAI Responses non-stream request failed:',
    abortSignal,
    onError,
    onComplete,
    toCompletionArgs: (payload) => {
      const finishReason = extractOpenAIResponsesFinishReason(payload);
      const text = extractOpenAIResponsesMessageText(payload);

      if (finishReason === 'content_filter' && !text) {
        throw new Error('The model returned no content because generation was filtered (reason: content_filter).');
      }

      return [
        text ? [{ text: finishReason === 'length' ? appendTruncationNotice(text) : text }] : [],
        extractOpenAIResponsesMessageThoughts(payload),
        mapOpenAIResponsesUsage(payload.usage),
      ];
    },
  });
};

export const sendOpenAIResponsesStream: StreamMessageSender = async (
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
  const responsesConfig = asOpenAIResponsesConfig(config);
  let finalUsage: UsageMetadata | undefined;

  await executeStreamChatRequest({
    requestUrl: () => buildOpenAIResponsesUrl(responsesConfig.baseUrl),
    requestInit: () =>
      createRequestInit(
        apiKey,
        buildOpenAIResponsesRequestBody(modelId, history, parts, responsesConfig, role, true),
        abortSignal,
        providerId,
        responsesConfig.baseUrl,
        responsesConfig.extraHeaders,
      ),
    errorContextLabel: 'OpenAI Responses',
    failureLogLabel: 'OpenAI Responses stream request failed:',
    abortSignal,
    onError,
    onComplete,
    readStream: async (response) => {
      let contentFiltered = false;
      let truncationNoticeSent = false;
      let streamErrorMessage: string | null = null;

      await readOpenAIResponsesStreamEvents(response, abortSignal, (event) => {
        if (!streamErrorMessage && event.error?.message) {
          streamErrorMessage = event.error.message;
        }

        if (event.type === 'response.failed' && event.response?.error?.message) {
          streamErrorMessage = event.response.error.message;
        }

        if ((event.type === 'response.text.delta' || event.type === 'response.output_text.delta') && event.delta) {
          onPart({ text: event.delta });
        }

        if (
          (event.type === 'response.reasoning_text.delta' ||
            event.type === 'response.reasoning.delta' ||
            event.type === 'response.thought.delta') &&
          event.delta
        ) {
          onThoughtChunk(event.delta);
        }

        if (event.type === 'response.completed' && event.response) {
          const finishReason = extractOpenAIResponsesFinishReason(event.response);
          if (finishReason === 'content_filter') {
            contentFiltered = true;
          }
          if (finishReason === 'length' && !truncationNoticeSent) {
            truncationNoticeSent = true;
            onPart({ text: TRUNCATION_NOTICE });
          }
          const usage = mapOpenAIResponsesUsage(event.response.usage);
          if (usage) {
            finalUsage = usage;
          }
        }
      });

      if (streamErrorMessage) {
        throw new Error(streamErrorMessage);
      }
      if (contentFiltered) {
        throw new Error('The model returned no content because generation was filtered (reason: content_filter).');
      }
      return finalUsage;
    },
  });
};

export const generateOpenAIResponsesTurnApi = async (
  apiKey: string,
  modelId: string,
  contents: ChatHistoryItem[],
  config: unknown,
  abortSignal: AbortSignal,
  providerId?: string | null,
) => {
  const abortError = new Error('aborted');
  abortError.name = 'AbortError';

  if (abortSignal.aborted) {
    throw abortError;
  }

  const responsesConfig = asOpenAIResponsesConfig(config);
  const url = buildOpenAIResponsesUrl(responsesConfig.baseUrl);
  const requestBody = buildOpenAIResponsesRequestBody(modelId, contents, [], responsesConfig, 'user', false);
  const requestInit = createRequestInit(
    apiKey,
    requestBody,
    abortSignal,
    providerId,
    responsesConfig.baseUrl,
    responsesConfig.extraHeaders,
  );

  const response = await fetch(url, requestInit);
  if (!response.ok) {
    throw new Error(await readResponseErrorMessage(response, 'OpenAI Responses'));
  }

  if (abortSignal.aborted) {
    throw abortError;
  }

  const payload = (await response.json()) as OpenAIResponsesResponsePayload;
  const finishReason = extractOpenAIResponsesFinishReason(payload);
  const rawText = extractOpenAIResponsesMessageText(payload);
  const text = rawText && finishReason === 'length' ? appendTruncationNotice(rawText) : rawText;
  const thoughts = extractOpenAIResponsesMessageThoughts(payload);
  const usage = mapOpenAIResponsesUsage(payload.usage);

  const toolCalls: FunctionCall[] = (payload.output ?? [])
    .filter((item) => item.type === 'function_call')
    .map((item, idx) => {
      let parsedArgs: Record<string, unknown> = {};
      if (item.arguments) {
        try {
          parsedArgs =
            typeof item.arguments === 'string'
              ? JSON.parse(item.arguments)
              : (item.arguments as Record<string, unknown>);
        } catch {
          parsedArgs = { raw: item.arguments };
        }
      }
      return {
        id: item.call_id || item.id || `call_${idx}`,
        name: item.name || '',
        args: parsedArgs,
      };
    });

  if (finishReason === 'content_filter' && !text && toolCalls.length === 0) {
    throw new Error('The model returned no content because generation was filtered (reason: content_filter).');
  }

  const parts: Part[] = [];
  if (text) {
    parts.push({ text });
  }
  for (const call of toolCalls) {
    parts.push({
      functionCall: call,
    });
  }

  if (parts.length === 0 && !thoughts) {
    throw new Error('The model returned an empty response.');
  }

  return {
    modelContent: {
      role: 'model' as const,
      parts,
    },
    parts,
    thoughts,
    usage,
    grounding: undefined,
    urlContext: undefined,
    functionCalls: toolCalls,
  };
};

export const generateOpenAIResponsesTurnStreamApi = async (
  apiKey: string,
  modelId: string,
  contents: ChatHistoryItem[],
  config: unknown,
  abortSignal: AbortSignal,
  providerId?: string | null,
  streamCallbacks?: TurnStreamCallbacks,
) => {
  const abortError = new Error('aborted');
  abortError.name = 'AbortError';

  if (abortSignal.aborted) {
    throw abortError;
  }

  const responsesConfig = asOpenAIResponsesConfig(config);
  const url = buildOpenAIResponsesUrl(responsesConfig.baseUrl);
  const requestBody = buildOpenAIResponsesRequestBody(modelId, contents, [], responsesConfig, 'user', true);
  const requestInit = createRequestInit(
    apiKey,
    requestBody,
    abortSignal,
    providerId,
    responsesConfig.baseUrl,
    responsesConfig.extraHeaders,
  );

  const response = await fetch(url, requestInit);
  if (!response.ok) {
    throw new Error(await readResponseErrorMessage(response, 'OpenAI Responses'));
  }

  if (abortSignal.aborted) {
    throw abortError;
  }

  let text = '';
  let thoughts = '';
  let finishReason: string | undefined;
  let contentFiltered = false;
  let streamErrorMessage: string | null = null;
  let finalUsage: UsageMetadata | undefined;
  let completedResponse: OpenAIResponsesResponsePayload | undefined;
  const streamFunctionCalls: Record<string, { call_id: string; name: string; arguments: string }> = {};

  await readOpenAIResponsesStreamEvents(response, abortSignal, (event) => {
    if (!streamErrorMessage && event.error?.message) {
      streamErrorMessage = event.error.message;
    }

    if (event.type === 'response.failed' && event.response?.error?.message) {
      streamErrorMessage = event.response.error.message;
    }

    if ((event.type === 'response.text.delta' || event.type === 'response.output_text.delta') && event.delta) {
      text += event.delta;
      streamCallbacks?.onPart?.({ text: event.delta });
    }

    if (
      (event.type === 'response.reasoning_text.delta' ||
        event.type === 'response.reasoning.delta' ||
        event.type === 'response.thought.delta') &&
      event.delta
    ) {
      thoughts += event.delta;
      streamCallbacks?.onThoughtChunk?.(event.delta);
    }

    if (event.type === 'response.output_item.added' && event.item?.type === 'function_call') {
      const key = event.item.id || event.item.call_id || `fc_${Object.keys(streamFunctionCalls).length}`;
      streamFunctionCalls[key] = {
        call_id: event.item.call_id || event.item.id || key,
        name: event.item.name || '',
        arguments: typeof event.item.arguments === 'string' ? event.item.arguments : '',
      };
    }

    const findFunctionCallEntry = (itemId?: string, callId?: string) => {
      if (itemId && streamFunctionCalls[itemId]) {
        return streamFunctionCalls[itemId];
      }
      if (callId && streamFunctionCalls[callId]) {
        return streamFunctionCalls[callId];
      }
      if (callId) {
        return Object.values(streamFunctionCalls).find((entry) => entry.call_id === callId);
      }
      return undefined;
    };

    if (event.type === 'response.function_call_arguments.delta' && event.delta) {
      const entry = findFunctionCallEntry(event.item_id, event.call_id);
      if (entry) {
        entry.arguments += event.delta;
      }
    }

    if (event.type === 'response.function_call_arguments.done' && event.arguments) {
      const entry = findFunctionCallEntry(event.item_id, event.call_id);
      if (entry) {
        entry.arguments = event.arguments;
      }
    }

    if (event.type === 'response.completed' && event.response) {
      completedResponse = event.response;
      const rFinishReason = extractOpenAIResponsesFinishReason(event.response);
      if (rFinishReason) {
        finishReason = rFinishReason;
      }
      if (finishReason === 'content_filter') {
        contentFiltered = true;
      }
      const usage = mapOpenAIResponsesUsage(event.response.usage);
      if (usage) {
        finalUsage = usage;
      }
    }
  });

  if (streamErrorMessage) {
    throw new Error(streamErrorMessage);
  }

  let toolCalls: FunctionCall[];
  if (completedResponse?.output && Array.isArray(completedResponse.output)) {
    toolCalls = completedResponse.output
      .filter((item) => item.type === 'function_call')
      .map((item, idx) => {
        let parsedArgs: Record<string, unknown> = {};
        if (item.arguments) {
          try {
            parsedArgs =
              typeof item.arguments === 'string'
                ? JSON.parse(item.arguments)
                : (item.arguments as Record<string, unknown>);
          } catch {
            parsedArgs = { raw: item.arguments };
          }
        }
        return {
          id: item.call_id || item.id || `call_${idx}`,
          name: item.name || '',
          args: parsedArgs,
        };
      });
  } else {
    toolCalls = Object.values(streamFunctionCalls).map((item, idx) => {
      let parsedArgs: Record<string, unknown> = {};
      if (item.arguments) {
        try {
          parsedArgs = JSON.parse(item.arguments);
        } catch {
          parsedArgs = { raw: item.arguments };
        }
      }
      return {
        id: item.call_id || `call_${idx}`,
        name: item.name || '',
        args: parsedArgs,
      };
    });
  }

  if (contentFiltered && !text && toolCalls.length === 0) {
    throw new Error('The model returned no content because generation was filtered (reason: content_filter).');
  }

  if (finishReason === 'length' && text) {
    text = appendTruncationNotice(text);
    streamCallbacks?.onPart?.({ text: TRUNCATION_NOTICE });
  }

  const parts: Part[] = [];
  if (text) {
    parts.push({ text });
  }
  for (const call of toolCalls) {
    parts.push({
      functionCall: call,
    });
  }

  if (parts.length === 0 && !thoughts) {
    throw new Error('The model returned an empty response.');
  }

  return {
    modelContent: {
      role: 'model' as const,
      parts,
    },
    parts,
    thoughts: thoughts || undefined,
    usage: finalUsage,
    grounding: undefined,
    urlContext: undefined,
    functionCalls: toolCalls,
  };
};
