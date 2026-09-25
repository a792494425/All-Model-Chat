import type { ChatMessage } from '@/types';
import type { FunctionCall, Part } from '@google/genai';

const isVisibleChatMessage = (message: ChatMessage): boolean => !message.isInternalToolMessage;

export const getVisibleChatMessages = (messages: ChatMessage[]): ChatMessage[] => messages.filter(isVisibleChatMessage);

/**
 * Checks whether a message represents an internal MCP tool message
 * linked to a parent user message.
 */
export const isMcpInternalMessage = (message: ChatMessage): boolean =>
  Boolean(message.isInternalToolMessage && message.toolParentMessageId);

export interface McpToolPair {
  parentId: string;
  calls: FunctionCall[];
  responses: Part[];
}

/**
 * Extracts and groups MCP function calls and responses by their parent message ID.
 */
export const getMcpToolPairs = (messages: ChatMessage[]): McpToolPair[] => {
  const toolPairsByParent = new Map<string, { calls: FunctionCall[]; responses: Part[] }>();

  for (const message of messages) {
    if (isMcpInternalMessage(message)) {
      const parentMessageId = message.toolParentMessageId!;
      if (!toolPairsByParent.has(parentMessageId)) {
        toolPairsByParent.set(parentMessageId, { calls: [], responses: [] });
      }

      const toolBucket = toolPairsByParent.get(parentMessageId)!;
      for (const apiPart of message.apiParts ?? []) {
        if (apiPart.functionCall) {
          toolBucket.calls.push(apiPart.functionCall);
        }
        if (apiPart.functionResponse) {
          toolBucket.responses.push(apiPart as Part);
        }
      }
    }
  }

  return Array.from(toolPairsByParent.entries()).map(([parentId, toolData]) => ({
    parentId,
    ...toolData,
  }));
};

/**
 * Filters out incomplete internal tool messages (e.g. from aborted or errored tool runs).
 * An internal model tool-call message must have a corresponding internal user tool-response message.
 * If targetParentId is specified, only prunes dangling messages associated with that parent.
 */
export const pruneDanglingInternalToolMessages = (messages: ChatMessage[], targetParentId?: string): ChatMessage[] => {
  const result: ChatMessage[] = [];

  for (let messageIndex = 0; messageIndex < messages.length; messageIndex++) {
    const currentMessage = messages[messageIndex];

    if (
      currentMessage.isInternalToolMessage &&
      (!targetParentId || currentMessage.toolParentMessageId === targetParentId)
    ) {
      if (currentMessage.role === 'model') {
        const nextMessage = messages[messageIndex + 1];
        const hasMatchingResponse =
          nextMessage &&
          nextMessage.isInternalToolMessage &&
          nextMessage.toolParentMessageId === currentMessage.toolParentMessageId &&
          nextMessage.role === 'user';

        if (!hasMatchingResponse) {
          // Dangling function call without matching function response - drop it
          continue;
        }
      } else if (currentMessage.role === 'user') {
        const previousMessage = result[result.length - 1];
        const hasMatchingCall =
          previousMessage &&
          previousMessage.isInternalToolMessage &&
          previousMessage.toolParentMessageId === currentMessage.toolParentMessageId &&
          previousMessage.role === 'model';

        if (!hasMatchingCall) {
          // Dangling function response without preceding function call - drop it
          continue;
        }
      }
    }

    result.push(currentMessage);
  }

  return result;
};
