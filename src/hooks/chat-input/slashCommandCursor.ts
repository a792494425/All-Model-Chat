import type { Dispatch, SetStateAction } from 'react';
import type { ModelOption } from '@/types';
import type { SlashCommand as Command } from '@/types/slashCommands';
import type { ToggleableChatToolId } from '@/types/chatTools';
import { isImageGenerationModel } from '@/utils/model/modelCapabilities';

export type SlashCommandState = {
  isOpen: boolean;
  query: string;
  filteredCommands: Command[];
  selectedIndex: number;
};

export const CLOSED_SLASH_COMMAND_STATE: SlashCommandState = {
  isOpen: false,
  query: '',
  filteredCommands: [],
  selectedIndex: 0,
};

export const INPUT_POPULATING_COMMANDS = new Set(['model', 'edit']);

export const TOOL_COMMAND_ACTIONS: Record<string, ToggleableChatToolId> = {
  deep: 'deepSearch',
  online: 'googleSearch',
  maps: 'googleMaps',
  code: 'codeExecution',
  url: 'urlContext',
};

// Cherry-style grouping priority for Web UI display order
const SLASH_GROUP_PRIORITY: Record<string, number> = {
  model: 0,
  clear: 0,
  new: 0,
  pin: 0,
  retry: 0,
  library: 0,
  deep: 1,
  online: 1,
  maps: 1,
  code: 1,
  url: 1,
  file: 1,
  find: 1,
};

const getSlashGroupPriority = (name: string): number => SLASH_GROUP_PRIORITY[name] ?? 2;

export const sortSlashCommandsByGroup = (list: Command[]): Command[] =>
  [...list].sort((commandA, commandB) => getSlashGroupPriority(commandA.name) - getSlashGroupPriority(commandB.name));

export const getSlashCursor = (textarea: HTMLTextAreaElement | null, text: string): number => {
  if (!textarea || typeof textarea.selectionStart !== 'number') return text.length;
  // In tests the textarea value may not be synced with the new inputText yet (selectionStart stays 0)
  if (textarea.value !== text) return text.length;
  return textarea.selectionStart;
};

export const findSlashAnchor = (text: string, cursor: number): number => {
  for (let index = Math.min(cursor - 1, text.length - 1); index >= 0; index--) {
    if (text[index] !== '/') continue;
    const prevChar = index === 0 ? '' : text[index - 1];
    if (index === 0 || /\s/.test(prevChar)) return index;
  }
  return -1;
};

export const buildModelCommands = (
  models: ModelOption[],
  onSelectModel: (modelId: string) => void,
  setInputText: Dispatch<SetStateAction<string>>,
  onMessageSent: () => void,
): Command[] =>
  models.map((model) => ({
    name: model.name,
    description: model.isPinned ? 'Pinned Model' : `ID: ${model.id}`,
    icon: isImageGenerationModel(model.id) ? 'image' : model.isPinned ? 'pin' : 'bot',
    action: () => {
      onSelectModel(model.id);
      setInputText('');
      onMessageSent();
    },
  }));
