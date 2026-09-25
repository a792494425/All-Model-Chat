import type { Part } from '@google/genai';
import type { ChatHistoryItem, ThinkingLevel } from '@/types';
import { isAudioMimeType, isImageMimeType, isTextMimeType } from '@/utils/file/fileTypeClassification';
import { base64ToUtf8 } from '@/utils/file/fileEncoding';
import { getInlineAudioFormat } from '@/features/audio/audioProcessing';
import type {
  OpenAIResponsesChatConfig,
  OpenAIResponsesContentPart,
  OpenAIResponsesInputItem,
  OpenAIResponsesRequestBody,
} from './openaiResponsesTypes';
import { collapseOnlyTextContent, hasNonEmptyMessageContent } from '@/services/api/chatMessageContent';
import { isOpenAIGpt5FamilyModel, isOpenAIReasoningModel } from '@/utils/model/modelCapabilities';

const OPENAI_RESPONSES_FILE_DATA_ERROR = 'OpenAI Responses mode cannot send Gemini Files API file references.';

const mapThinkingLevelToOpenAIReasoningEffort = (level: ThinkingLevel | undefined): string => {
  switch (level) {
    case 'NONE':
      return 'none';
    case 'MINIMAL':
      return 'minimal';
    case 'LOW':
      return 'low';
    case 'MEDIUM':
      return 'medium';
    case 'HIGH':
      return 'high';
    case 'XHIGH':
    case 'MAX':
      return 'xhigh';
    default:
      return 'medium';
  }
};

const partToOpenAIResponsesContentItems = (part: Part): OpenAIResponsesContentPart[] => {
  const partWithMedia = part as Part & {
    inlineData?: {
      mimeType?: string;
      data?: string;
    };
    fileData?: {
      mimeType?: string;
      fileUri?: string;
    };
  };

  if (typeof part.text === 'string') {
    return part.text ? [{ type: 'input_text', text: part.text }] : [];
  }

  if (partWithMedia.fileData) {
    throw new Error(OPENAI_RESPONSES_FILE_DATA_ERROR);
  }

  const inlineData = partWithMedia.inlineData;
  const mimeType = inlineData?.mimeType;
  if (inlineData?.data && mimeType && isImageMimeType(mimeType)) {
    return [
      {
        type: 'input_image',
        image_url: `data:${mimeType};base64,${inlineData.data}`,
      },
    ];
  }

  if (inlineData?.data && mimeType && isAudioMimeType(mimeType)) {
    return [
      {
        type: 'input_audio',
        input_audio: {
          data: inlineData.data,
          format: getInlineAudioFormat(mimeType),
        },
      },
    ];
  }

  if (inlineData?.data && mimeType && isTextMimeType(mimeType)) {
    return [
      {
        type: 'input_text',
        text: base64ToUtf8(inlineData.data),
      },
    ];
  }

  if (inlineData?.data) {
    throw new Error(`OpenAI Responses mode cannot send inline ${mimeType || 'media'} attachments.`);
  }

  return [];
};

const partsToOpenAIResponsesContent = (parts: Part[]): string | OpenAIResponsesContentPart[] =>
  collapseOnlyTextContent(parts.flatMap(partToOpenAIResponsesContentItems), (item) =>
    item.type === 'input_text' ? item.text : null,
  );

const buildOpenAIResponsesInput = (
  history: ChatHistoryItem[],
  parts: Part[],
  role: 'user' | 'model',
): OpenAIResponsesInputItem[] => {
  const input: OpenAIResponsesInputItem[] = [];

  for (const item of history) {
    const functionCalls = item.parts
      .filter((part) => Boolean(part.functionCall))
      .map((part, idx) => ({
        type: 'function_call' as const,
        call_id: part.functionCall?.id || `call_${idx}`,
        name: part.functionCall?.name || '',
        arguments:
          typeof part.functionCall?.args === 'string'
            ? part.functionCall.args
            : JSON.stringify(part.functionCall?.args ?? {}),
      }));

    const functionResponses = item.parts.filter((part) => Boolean(part.functionResponse));

    if (item.role === 'model' && functionCalls.length > 0) {
      const nonCallParts = item.parts.filter((part) => !part.functionCall);
      const textContent = partsToOpenAIResponsesContent(nonCallParts);
      if (hasNonEmptyMessageContent(textContent)) {
        input.push({
          role: 'assistant',
          content: textContent,
        });
      }
      for (const callItem of functionCalls) {
        input.push(callItem);
      }
      continue;
    }

    if (functionResponses.length > 0) {
      for (let idx = 0; idx < functionResponses.length; idx++) {
        const resp = functionResponses[idx].functionResponse!;
        const rawContent = resp.response;
        const contentStr =
          typeof rawContent === 'string'
            ? rawContent
            : typeof (rawContent as Record<string, unknown>)?.response === 'string'
              ? ((rawContent as Record<string, unknown>).response as string)
              : JSON.stringify(rawContent ?? {});
        input.push({
          type: 'function_call_output',
          call_id: resp.id || `call_${idx}`,
          output: contentStr,
        });
      }
      continue;
    }

    const content = partsToOpenAIResponsesContent(item.parts);
    if (!hasNonEmptyMessageContent(content)) {
      continue;
    }

    input.push({
      role: item.role === 'model' ? 'assistant' : 'user',
      content,
    });
  }

  const currentFunctionCalls = parts
    .filter((part) => Boolean(part.functionCall))
    .map((part, idx) => ({
      type: 'function_call' as const,
      call_id: part.functionCall?.id || `call_${idx}`,
      name: part.functionCall?.name || '',
      arguments:
        typeof part.functionCall?.args === 'string'
          ? part.functionCall.args
          : JSON.stringify(part.functionCall?.args ?? {}),
    }));

  const currentFunctionResponses = parts.filter((part) => Boolean(part.functionResponse));

  if (role === 'model' && currentFunctionCalls.length > 0) {
    const nonCallParts = parts.filter((part) => !part.functionCall);
    const textContent = partsToOpenAIResponsesContent(nonCallParts);
    if (hasNonEmptyMessageContent(textContent)) {
      input.push({
        role: 'assistant',
        content: textContent,
      });
    }
    for (const fc of currentFunctionCalls) {
      input.push(fc);
    }
  } else if (currentFunctionResponses.length > 0) {
    for (let idx = 0; idx < currentFunctionResponses.length; idx++) {
      const resp = currentFunctionResponses[idx].functionResponse!;
      const rawContent = resp.response;
      const contentStr =
        typeof rawContent === 'string'
          ? rawContent
          : typeof (rawContent as Record<string, unknown>)?.response === 'string'
            ? ((rawContent as Record<string, unknown>).response as string)
            : JSON.stringify(rawContent ?? {});
      input.push({
        type: 'function_call_output',
        call_id: resp.id || `call_${idx}`,
        output: contentStr,
      });
    }
  } else {
    const currentContent = partsToOpenAIResponsesContent(parts);
    if (hasNonEmptyMessageContent(currentContent)) {
      input.push({
        role: role === 'model' ? 'assistant' : 'user',
        content: currentContent,
      });
    }
  }

  return input;
};

export const buildOpenAIResponsesRequestBody = (
  modelId: string,
  history: ChatHistoryItem[],
  parts: Part[],
  config: OpenAIResponsesChatConfig,
  role: 'user' | 'model',
  stream: boolean,
): OpenAIResponsesRequestBody => {
  const body: OpenAIResponsesRequestBody = {
    model: modelId,
    input: buildOpenAIResponsesInput(history, parts, role),
    stream,
  };

  const systemInstruction = config.systemInstruction?.trim();
  if (systemInstruction) {
    body.instructions = systemInstruction;
  }

  if (typeof config.temperature === 'number') {
    body.temperature = config.temperature;
  }
  if (typeof config.topP === 'number') {
    body.top_p = config.topP;
  }
  if (typeof config.maxOutputTokens === 'number' && config.maxOutputTokens > 0) {
    body.max_output_tokens = config.maxOutputTokens;
  }

  if (config.thinkingLevel && (isOpenAIReasoningModel(modelId) || isOpenAIGpt5FamilyModel(modelId))) {
    body.reasoning = {
      effort: mapThinkingLevelToOpenAIReasoningEffort(config.thinkingLevel),
    };
  }

  if (Array.isArray(config.tools) && config.tools.length > 0) {
    body.tools = config.tools;
  }

  if (config.previousResponseId) {
    body.previous_response_id = config.previousResponseId;
  }

  return body;
};
