import { useMemo, type Dispatch, type RefObject, type SetStateAction } from 'react';
import type { AttachmentAction, ThinkingLevel } from '@/types';
import type { SlashCommand as Command } from '@/types/slashCommands';
import type { ChatToolToggleStates } from '@/types/chatTools';
import { getCachedModelCapabilities } from '@/stores/modelCapabilitiesStore';
import { useMultimodalSearchStore } from '@/stores/multimodalSearchStore';
import { useUIStore } from '@/stores/uiStore';
import { TOOL_COMMAND_ACTIONS } from './slashCommandCursor';

export interface CommandDefinition {
  name: string;
  description: string;
  icon: string;
}

interface UseSlashCommandActionsProps {
  commandDefinitions: CommandDefinition[];
  currentModelId: string;
  toolStates: ChatToolToggleStates;
  onClearChat: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onToggleLiveArtifactsPrompt: () => void;
  onTogglePinCurrentSession: () => void;
  onRetryLastTurn: () => void;
  onAttachmentAction: (action: AttachmentAction) => void;
  setIsHelpModalOpen: (isOpen: boolean) => void;
  textareaRef: RefObject<HTMLTextAreaElement>;
  onEditLastUserMessage: () => void;
  onTogglePip: () => void;
  setInputText: Dispatch<SetStateAction<string>>;
  onSetThinkingLevel: (level: ThinkingLevel) => void;
  thinkingLevel?: ThinkingLevel;
}

export const useSlashCommandActions = ({
  commandDefinitions,
  currentModelId,
  toolStates,
  onClearChat,
  onNewChat,
  onOpenSettings,
  onToggleLiveArtifactsPrompt,
  onTogglePinCurrentSession,
  onRetryLastTurn,
  onAttachmentAction,
  setIsHelpModalOpen,
  textareaRef,
  onEditLastUserMessage,
  onTogglePip,
  setInputText,
  onSetThinkingLevel,
  thinkingLevel,
}: UseSlashCommandActionsProps) => {
  const commands = useMemo<Command[]>(
    () =>
      commandDefinitions.map(({ name, description, icon }) => {
        switch (name) {
          case 'model':
            return {
              name,
              description,
              icon,
              action: () => {
                setInputText('/model ');
                setTimeout(() => {
                  const textarea = textareaRef.current;
                  if (textarea) {
                    textarea.focus();
                    const textLength = textarea.value.length;
                    textarea.setSelectionRange(textLength, textLength);
                  }
                }, 0);
              },
            };
          case 'help':
            return { name, description, icon, action: () => setIsHelpModalOpen(true) };
          case 'edit':
            return { name, description, icon, action: onEditLastUserMessage };
          case 'pin':
            return { name, description, icon, action: onTogglePinCurrentSession };
          case 'retry':
            return { name, description, icon, action: onRetryLastTurn };
          case 'online':
          case 'maps':
          case 'deep':
          case 'code':
          case 'url':
            return {
              name,
              description,
              icon,
              action: toolStates[TOOL_COMMAND_ACTIONS[name]]?.onToggle ?? (() => undefined),
            };
          case 'file':
            return { name, description, icon, action: () => onAttachmentAction('upload') };
          case 'find':
            return {
              name,
              description,
              icon,
              action: () => {
                useMultimodalSearchStore.getState().openModal();
              },
            };
          case 'library':
            return {
              name,
              description,
              icon,
              action: () => {
                useUIStore.getState().setActiveView('library');
              },
            };
          case 'clear':
            return { name, description, icon, action: onClearChat };
          case 'new':
            return { name, description, icon, action: onNewChat };
          case 'settings':
            return { name, description, icon, action: onOpenSettings };
          case 'artifacts':
            return { name, description, icon, action: onToggleLiveArtifactsPrompt };
          case 'pip':
            return { name, description, icon, action: onTogglePip };
          case 'fast': {
            const capabilities = getCachedModelCapabilities(currentModelId);
            // gemini-3.7-flash / gemini-3.8-flash rejects MINIMAL with an API error — fall back to LOW there.
            const targetLevel =
              (capabilities.isGemini3FlashModel || capabilities.isGeminiRoboticsModel) &&
              capabilities.supportsMinimalThinkingLevel
                ? 'MINIMAL'
                : 'LOW';
            const isActive = thinkingLevel === targetLevel;
            return {
              name,
              description,
              icon,
              isSelected: isActive,
              action: () => {
                onSetThinkingLevel(isActive ? 'HIGH' : targetLevel);
              },
            };
          }
          default:
            return {
              name,
              description,
              icon,
              action: () => undefined,
            };
        }
      }),
    [
      commandDefinitions,
      currentModelId,
      onAttachmentAction,
      onClearChat,
      onEditLastUserMessage,
      onNewChat,
      onOpenSettings,
      onRetryLastTurn,
      onSetThinkingLevel,
      onToggleLiveArtifactsPrompt,
      onTogglePinCurrentSession,
      onTogglePip,
      setInputText,
      setIsHelpModalOpen,
      textareaRef,
      thinkingLevel,
      toolStates,
    ],
  );

  const allCommandsForHelp = useMemo(
    () =>
      commandDefinitions.map(({ name, description, icon }) => ({
        name: `/${name}`,
        description,
        icon,
      })),
    [commandDefinitions],
  );

  return {
    commands,
    allCommandsForHelp,
  };
};
