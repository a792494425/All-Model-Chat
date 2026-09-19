import type { ChatMessage } from '@/types';

/**
 * Collect text-based input files from previous user messages in the chat session
 * and format them into a dictionary of { [fileName]: fileContent } for the JS sandbox.
 */
export const collectLocalJsInputFiles = (messages: ChatMessage[], targetMessageId?: string): Record<string, string> => {
  const targetIndex = targetMessageId ? messages.findIndex((m) => m.id === targetMessageId) : -1;
  const contextMessages = targetIndex === -1 ? messages : messages.slice(0, targetIndex);
  const filesMap: Record<string, string> = {};

  for (const message of contextMessages) {
    if (message.role !== 'user' || !message.files?.length) {
      continue;
    }

    for (const file of message.files) {
      const isGeneratedOutput = file.name.startsWith('generated-') || file.name.startsWith('edited-');
      const isActive = file.uploadState === undefined || file.uploadState === 'active';
      if (!isActive || file.error || isGeneratedOutput) {
        continue;
      }

      if (typeof file.textContent === 'string') {
        filesMap[file.name] = file.textContent;
      }
    }
  }

  return filesMap;
};
