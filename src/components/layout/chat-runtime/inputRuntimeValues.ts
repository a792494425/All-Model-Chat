import { useCallback, useMemo } from 'react';

import type { AppViewModel } from '@/hooks/app/useApp';
import { useChatStore } from '@/stores/chatStore';
import { closeMediaNavPanel } from '@/stores/mediaNavStore';
import type { ModelOption, TaskSuggestionMode, UploadedFile } from '@/types';
import type { ChatInputRuntimeValue } from './chatRuntimeTypes';

interface InputRuntimeValuesOptions {
  app: AppViewModel;
  availableModels: ModelOption[];
  onOpenSettings: () => void;
  onSelectModel: (modelId: string) => void;
}

export const useChatInputRuntimeValues = ({
  app,
  availableModels,
  onOpenSettings,
  onSelectModel,
}: InputRuntimeValuesOptions) => {
  const { setAppSettings, chatState, pipState, handleToggleBBoxMode, handleToggleGuideMode, handleSuggestionClick } =
    app;

  // Destructure the chatState members used below into local constants. The
  // members are stable useCallback references (their deps — activeMessages,
  // selectedFiles, currentChatSettings, appSettings, store actions — do not
  // change while a background session churns the savedSessions array). Keeping
  // the destructured members as the only deps prevents the whole chatState
  // object (a new literal every render) from invalidating this context value
  // and, downstream, the markdown renderer's components map.
  const {
    handleSendMessage,
    handleStopGenerating,
    handleCancelEdit,
    handleProcessAndAddFiles,
    handleAddFileById,
    handleAddFilesFromCloud,
    handleCancelFileUpload,
    handleTranscribeAudio,
    handleClearCurrentChat,
    startNewChat,
    handleTogglePinCurrentSession,
    handleRetryLastTurn,
    handleEditLastUserMessage,
    setCurrentChatSettings,
    currentChatSettings,
    handleAddUserMessage,
    handleLiveTranscript,
    liveClientFunctions,
    handleUpdateMessageContent,
  } = chatState;

  const onMessageSent = useCallback(() => {
    useChatStore.getState().setCommandedInput(null);
  }, []);

  const onSendMessage = useCallback(
    (text: string, options?: { isFastMode?: boolean; files?: UploadedFile[] }) => {
      handleSendMessage({ text, ...options });
    },
    [handleSendMessage],
  );

  const onToggleQuadImages = useCallback(() => {
    setAppSettings((prev) => ({
      ...prev,
      generateQuadImages: !prev.generateQuadImages,
    }));
  }, [setAppSettings]);

  const onSuggestionClick = useCallback(
    (text: string) => {
      handleSuggestionClick('homepage', text);
    },
    [handleSuggestionClick],
  );

  const onOrganizeInfoClick = useCallback(
    (text: string) => {
      handleSuggestionClick('organize', text);
    },
    [handleSuggestionClick],
  );

  const onToggleTaskSuggestion = useCallback(
    (mode: TaskSuggestionMode) => {
      setCurrentChatSettings((prev) => {
        const nextMode = prev.taskSuggestionMode === mode ? null : mode;
        if (nextMode) {
          closeMediaNavPanel();
        }
        return {
          ...prev,
          taskSuggestionMode: nextMode,
          ...(nextMode
            ? {
                isVisualFormattingActive: false,
                isPdfNavEnabled: false,
                isVideoNavEnabled: false,
                isAudioNavEnabled: false,
                isImageNavEnabled: false,
                visionPromptMode: null,
              }
            : {}),
        };
      });
    },
    [setCurrentChatSettings],
  );

  const isVisualFormattingActive = Boolean(currentChatSettings?.isVisualFormattingActive);

  const handleToggleVisualFormatting = useCallback(() => {
    let nextValue = false;
    setCurrentChatSettings((prev) => {
      const next = !prev.isVisualFormattingActive;
      nextValue = next;
      if (next) {
        closeMediaNavPanel();
      }
      return {
        ...prev,
        isVisualFormattingActive: next,
        ...(next
          ? {
              isLiveArtifactsEnabled: true,
              taskSuggestionMode: null,
              isPdfNavEnabled: false,
              isVideoNavEnabled: false,
              isAudioNavEnabled: false,
              isImageNavEnabled: false,
              visionPromptMode: null,
            }
          : {}),
      };
    });
    setAppSettings((prev) => ({
      ...prev,
      isVisualFormattingActive: nextValue,
      ...(nextValue
        ? {
            isLiveArtifactsEnabled: true,
            isPdfNavEnabled: false,
            isVideoNavEnabled: false,
            isAudioNavEnabled: false,
            isImageNavEnabled: false,
          }
        : {}),
    }));
  }, [setCurrentChatSettings, setAppSettings]);

  const handleDeactivateVisualFormatting = useCallback(() => {
    setCurrentChatSettings((prev) => ({
      ...prev,
      isVisualFormattingActive: false,
    }));
    setAppSettings((prev) => ({
      ...prev,
      isVisualFormattingActive: false,
    }));
  }, [setCurrentChatSettings, setAppSettings]);

  return useMemo<ChatInputRuntimeValue>(
    () => ({
      onMessageSent,
      onSendMessage,
      onStopGenerating: handleStopGenerating,
      onCancelEdit: handleCancelEdit,
      onProcessFiles: handleProcessAndAddFiles,
      onAddFileById: handleAddFileById,
      onAddFilesFromCloud: handleAddFilesFromCloud,
      onCancelUpload: handleCancelFileUpload,
      onTranscribeAudio: handleTranscribeAudio,
      onClearChat: handleClearCurrentChat,
      onNewChat: startNewChat,
      onOpenSettings,
      onToggleLiveArtifactsPrompt: handleToggleVisualFormatting,
      onDeactivateLiveArtifactsPrompt: handleDeactivateVisualFormatting,
      onTogglePinCurrentSession: handleTogglePinCurrentSession,
      onRetryLastTurn: handleRetryLastTurn,
      onSelectModel,
      availableModels,
      onEditLastUserMessage: handleEditLastUserMessage,
      onTogglePip: pipState.togglePip,
      isPipActive: pipState.isPipActive,
      onToggleQuadImages,
      setCurrentChatSettings,
      onSuggestionClick,
      onOrganizeInfoClick,
      onAddUserMessage: handleAddUserMessage,
      onLiveTranscript: handleLiveTranscript,
      liveClientFunctions,
      onEditMessageContent: handleUpdateMessageContent,
      onToggleBBox: handleToggleBBoxMode,
      onToggleGuide: handleToggleGuideMode,
      isLiveArtifactsPromptActive: isVisualFormattingActive,
      onToggleTaskSuggestion,
      taskSuggestionMode: currentChatSettings?.taskSuggestionMode ?? null,
    }),
    [
      availableModels,
      handleAddFileById,
      handleAddFilesFromCloud,
      handleAddUserMessage,
      handleCancelEdit,
      handleCancelFileUpload,
      handleClearCurrentChat,
      handleDeactivateVisualFormatting,
      handleEditLastUserMessage,
      handleLiveTranscript,
      handleProcessAndAddFiles,
      handleRetryLastTurn,
      handleStopGenerating,
      handleToggleBBoxMode,
      handleToggleGuideMode,
      handleTogglePinCurrentSession,
      handleToggleVisualFormatting,
      handleTranscribeAudio,
      handleUpdateMessageContent,
      isVisualFormattingActive,
      liveClientFunctions,
      onMessageSent,
      onOpenSettings,
      onOrganizeInfoClick,
      onSelectModel,
      onSendMessage,
      onSuggestionClick,
      onToggleQuadImages,
      onToggleTaskSuggestion,
      currentChatSettings?.taskSuggestionMode,
      pipState.isPipActive,
      pipState.togglePip,
      setCurrentChatSettings,
      startNewChat,
    ],
  );
};
