import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@/test/render/renderer';
import { useChatInputRuntimeValues } from '@/components/layout/chat-runtime/inputRuntimeValues';
import { useChatMessageListRuntimeValues } from '@/components/layout/chat-runtime/messageListRuntimeValues';
import type { AppViewModel } from '@/hooks/app/useApp';
import type { ModelOption } from '@/types';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

// Stable across rerenders, mirroring headerAvailableModels which is cached in a
// useMemo upstream. A fresh `[]` per call would change identity every render
// and defeat the reference-stability assertion.
const EMPTY_MODELS: ModelOption[] = [];

// A background-session churn produces a fresh `chatState` object literal (the
// whole useChat return value) while every other app member — useCallback
// references that do not depend on savedSessions — stays identical. This
// fixture models exactly that: the members below are created once and reused
// across rerenders, so only the chatState object identity changes.
const stableAppMembers = (): DeepPartial<AppViewModel> => ({
  setAppSettings: vi.fn(),
  pipState: {
    togglePip: vi.fn(),
    isPipActive: false,
    isPipSupported: false,
    pipWindow: null,
  },
  handleLoadLiveArtifactsPromptAndSave: vi.fn(),
  handleToggleBBoxMode: vi.fn(),
  handleToggleGuideMode: vi.fn(),
  handleSuggestionClick: vi.fn(),
  handleOpenSidePanel: vi.fn(),
  sessionTitle: 'Test session',
});

const stableChatState = (): DeepPartial<AppViewModel['chatState']> => ({
  handleSendMessage: vi.fn(),
  handleStopGenerating: vi.fn(),
  handleCancelEdit: vi.fn(),
  handleProcessAndAddFiles: vi.fn(),
  handleAddFileById: vi.fn(),
  handleCancelFileUpload: vi.fn(),
  handleTranscribeAudio: vi.fn(),
  handleClearCurrentChat: vi.fn(),
  startNewChat: vi.fn(),
  handleTogglePinCurrentSession: vi.fn(),
  handleRetryLastTurn: vi.fn(),
  handleEditLastUserMessage: vi.fn(),
  setCurrentChatSettings: vi.fn(),
  handleAddUserMessage: vi.fn(),
  handleLiveTranscript: vi.fn(),
  liveClientFunctions: undefined,
  handleUpdateMessageContent: vi.fn(),
  setScrollContainerRef: vi.fn(),
  handleEditMessage: vi.fn(),
  handleDeleteMessage: vi.fn(),
  handleRetryMessage: vi.fn(),
  handleUpdateMessageFile: vi.fn(),
  handleContinueGeneration: vi.fn(),
  handleForkMessage: vi.fn(),
  handleQuickTTS: vi.fn(),
});

// Builds a new app object each call — like useApp's render — with stable member
// references but a fresh chatState object identity.
const makeApp = (appMembers: DeepPartial<AppViewModel>, chatState: DeepPartial<AppViewModel['chatState']>) => ({
  ...appMembers,
  chatState,
});

describe('chat-runtime input values reference stability', () => {
  it('keeps the context value stable when chatState identity changes but members do not', () => {
    const appMembers = stableAppMembers();
    const chatState = stableChatState();
    const onOpenSettings = vi.fn();
    const onSelectModel = vi.fn();
    let app = makeApp(appMembers, chatState);

    const { result, rerender } = renderHook(() =>
      useChatInputRuntimeValues({
        app: app as AppViewModel,
        availableModels: EMPTY_MODELS,
        onOpenSettings,
        onSelectModel,
      }),
    );
    const first = result.current;

    // New chatState object identity, identical member references.
    app = makeApp(appMembers, { ...chatState });
    rerender();

    expect(result.current).toBe(first);
  });

  it('stays stable across multiple churns and keeps onSendMessage identity', () => {
    const appMembers = stableAppMembers();
    const chatState = stableChatState();
    const onOpenSettings = vi.fn();
    const onSelectModel = vi.fn();
    let app = makeApp(appMembers, chatState);

    const { result, rerender } = renderHook(() =>
      useChatInputRuntimeValues({
        app: app as AppViewModel,
        availableModels: EMPTY_MODELS,
        onOpenSettings,
        onSelectModel,
      }),
    );
    const firstSend = result.current.onSendMessage;

    for (let i = 0; i < 3; i += 1) {
      app = makeApp(appMembers, { ...chatState });
      rerender();
    }

    expect(result.current).toBeDefined();
    expect(result.current.onSendMessage).toBe(firstSend);
    expect(result.current.onStopGenerating).toBe(chatState.handleStopGenerating);
  });
});

describe('chat-runtime message list values reference stability', () => {
  it('keeps the context value stable when chatState identity changes but members do not', () => {
    const appMembers = stableAppMembers();
    const chatState = stableChatState();
    let app = makeApp(appMembers, chatState);

    const { result, rerender } = renderHook(() => useChatMessageListRuntimeValues({ app: app as AppViewModel }));
    const first = result.current;

    app = makeApp(appMembers, { ...chatState });
    rerender();

    expect(result.current).toBe(first);
  });
});

describe('chat-runtime input visual formatting mode decoupling', () => {
  it('reflects isVisualFormattingActive and not isLiveArtifactsEnabled alone', () => {
    const appMembers = stableAppMembers();
    const chatState = {
      ...stableChatState(),
      currentChatSettings: {
        isLiveArtifactsEnabled: true,
        isVisualFormattingActive: false,
      },
    };
    const app = makeApp(appMembers, chatState);

    const { result } = renderHook(() =>
      useChatInputRuntimeValues({
        app: app as unknown as AppViewModel,
        availableModels: EMPTY_MODELS,
        onOpenSettings: vi.fn(),
        onSelectModel: vi.fn(),
      }),
    );

    expect(result.current.isLiveArtifactsPromptActive).toBe(false);
  });

  it('toggles isVisualFormattingActive and enables isLiveArtifactsEnabled when activating', () => {
    const setCurrentChatSettings = vi.fn();
    const appMembers = stableAppMembers();
    const chatState = {
      ...stableChatState(),
      currentChatSettings: {
        isLiveArtifactsEnabled: false,
        isVisualFormattingActive: false,
      },
      setCurrentChatSettings,
    };
    const app = makeApp(appMembers, chatState);

    const { result } = renderHook(() =>
      useChatInputRuntimeValues({
        app: app as unknown as AppViewModel,
        availableModels: EMPTY_MODELS,
        onOpenSettings: vi.fn(),
        onSelectModel: vi.fn(),
      }),
    );

    result.current.onToggleLiveArtifactsPrompt();
    expect(setCurrentChatSettings).toHaveBeenCalled();

    const updater = setCurrentChatSettings.mock.calls[0][0];
    const nextState = updater({ isVisualFormattingActive: false, isLiveArtifactsEnabled: false });
    expect(nextState.isVisualFormattingActive).toBe(true);
    expect(nextState.isLiveArtifactsEnabled).toBe(true);
  });

  it('deactivates isVisualFormattingActive via onDeactivateLiveArtifactsPrompt while retaining engine state', () => {
    const setCurrentChatSettings = vi.fn();
    const appMembers = stableAppMembers();
    const chatState = {
      ...stableChatState(),
      currentChatSettings: {
        isLiveArtifactsEnabled: true,
        isVisualFormattingActive: true,
      },
      setCurrentChatSettings,
    };
    const app = makeApp(appMembers, chatState);

    const { result } = renderHook(() =>
      useChatInputRuntimeValues({
        app: app as unknown as AppViewModel,
        availableModels: EMPTY_MODELS,
        onOpenSettings: vi.fn(),
        onSelectModel: vi.fn(),
      }),
    );

    expect(result.current.isLiveArtifactsPromptActive).toBe(true);
    expect(result.current.onDeactivateLiveArtifactsPrompt).toBeDefined();
    result.current.onDeactivateLiveArtifactsPrompt?.();
    expect(setCurrentChatSettings).toHaveBeenCalled();

    const updater = setCurrentChatSettings.mock.calls[0][0];
    const nextState = updater({ isVisualFormattingActive: true, isLiveArtifactsEnabled: true });
    expect(nextState.isVisualFormattingActive).toBe(false);
    expect(nextState.isLiveArtifactsEnabled).toBe(true);
  });

  it('mutually excludes other modes when visual formatting is activated', () => {
    const setCurrentChatSettings = vi.fn();
    const appMembers = stableAppMembers();
    const chatState = {
      ...stableChatState(),
      currentChatSettings: {
        isLiveArtifactsEnabled: false,
        isVisualFormattingActive: false,
        taskSuggestionMode: 'translate' as const,
        isPdfNavEnabled: true,
      },
      setCurrentChatSettings,
    };
    const app = makeApp(appMembers, chatState);

    const { result } = renderHook(() =>
      useChatInputRuntimeValues({
        app: app as unknown as AppViewModel,
        availableModels: EMPTY_MODELS,
        onOpenSettings: vi.fn(),
        onSelectModel: vi.fn(),
      }),
    );

    result.current.onToggleLiveArtifactsPrompt();
    expect(setCurrentChatSettings).toHaveBeenCalled();

    const updater = setCurrentChatSettings.mock.calls[0][0];
    const nextState = updater({
      isVisualFormattingActive: false,
      isLiveArtifactsEnabled: false,
      taskSuggestionMode: 'translate',
      isPdfNavEnabled: true,
      isVideoNavEnabled: true,
      isAudioNavEnabled: true,
      isImageNavEnabled: true,
      visionPromptMode: 'bbox',
    });

    expect(nextState.isVisualFormattingActive).toBe(true);
    expect(nextState.isLiveArtifactsEnabled).toBe(true);
    expect(nextState.taskSuggestionMode).toBeNull();
    expect(nextState.isPdfNavEnabled).toBe(false);
    expect(nextState.isVideoNavEnabled).toBe(false);
    expect(nextState.isAudioNavEnabled).toBe(false);
    expect(nextState.isImageNavEnabled).toBe(false);
    expect(nextState.visionPromptMode).toBeNull();
  });

  it('deactivates visual formatting when a task suggestion mode is toggled on', () => {
    const setCurrentChatSettings = vi.fn();
    const appMembers = stableAppMembers();
    const chatState = {
      ...stableChatState(),
      currentChatSettings: {
        isLiveArtifactsEnabled: true,
        isVisualFormattingActive: true,
        taskSuggestionMode: null,
      },
      setCurrentChatSettings,
    };
    const app = makeApp(appMembers, chatState);

    const { result } = renderHook(() =>
      useChatInputRuntimeValues({
        app: app as unknown as AppViewModel,
        availableModels: EMPTY_MODELS,
        onOpenSettings: vi.fn(),
        onSelectModel: vi.fn(),
      }),
    );

    result.current.onToggleTaskSuggestion?.('translate');
    expect(setCurrentChatSettings).toHaveBeenCalled();

    const updater = setCurrentChatSettings.mock.calls[0][0];
    const nextState = updater({
      isVisualFormattingActive: true,
      taskSuggestionMode: null,
      isPdfNavEnabled: true,
    });

    expect(nextState.taskSuggestionMode).toBe('translate');
    expect(nextState.isVisualFormattingActive).toBe(false);
    expect(nextState.isPdfNavEnabled).toBe(false);
  });
});
