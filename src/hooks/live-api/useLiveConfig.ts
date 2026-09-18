import { useMemo } from 'react';
import { type ChatSettings, type LiveClientFunctions, type ThinkingLevel } from '@/types';
import type { Tool } from '@google/genai';
import { LOCAL_PYTHON_SYSTEM_PROMPT } from '@/features/prompts/localPython';
import { stripLegacyFeatureMarkers } from '@/features/prompts/promptCompositor';
import { getCachedModelCapabilities } from '@/stores/modelCapabilitiesStore';
import { buildLiveTranslateConfig } from './useLiveTranslateConfig';

interface UseLiveConfigProps {
  chatSettings: ChatSettings;
  sessionHandle: string | null;
  clientFunctions?: LiveClientFunctions;
  liveTranslateConfig?: {
    targetLanguageCode: string;
    echoTargetLanguage: boolean;
  };
  isPushToTalk?: boolean;
  allowBargeIn?: boolean;
}

export interface LiveConfig {
  responseModalities: ['AUDIO'];
  speechConfig: {
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: string;
      };
    };
  };
  systemInstruction?: { parts: Array<{ text: string }> };
  tools?: Tool[];
  inputAudioTranscription: Record<string, never>;
  outputAudioTranscription: Record<string, never>;
  contextWindowCompression: {
    slidingWindow: Record<string, never>;
  };
  sessionResumption: { handle: string } | Record<string, never>;
  mediaResolution?: ChatSettings['mediaResolution'];
  thinkingConfig?: {
    includeThoughts: boolean;
    thinkingLevel?: ThinkingLevel;
    thinkingBudget?: number;
  };
  realtimeInputConfig?: {
    automaticActivityDetection?: {
      disabled?: boolean;
    };
    activityHandling?: 'START_OF_ACTIVITY_INTERRUPTS' | 'NO_INTERRUPTION';
  };
}

export const useLiveConfig = ({
  chatSettings,
  sessionHandle,
  clientFunctions,
  liveTranslateConfig,
  isPushToTalk,
  allowBargeIn,
}: UseLiveConfigProps) => {
  return useMemo(() => {
    const capabilities = getCachedModelCapabilities(chatSettings.modelId);

    // Live Translate models use a dedicated config (translationConfig + transcription);
    // voiceConfig / tools / compression / thinking do not apply.
    if (capabilities.isLiveTranslate) {
      const { targetLanguageCode, echoTargetLanguage } = liveTranslateConfig ?? {
        targetLanguageCode: 'en',
        echoTargetLanguage: false,
      };
      return {
        liveConfig: buildLiveTranslateConfig({ targetLanguageCode, echoTargetLanguage }),
        tools: [] as Tool[],
      };
    }

    // Live Transcribe models are streaming speech-to-text only (TEXT response modality);
    // voiceConfig / tools / systemInstruction / thinking do not apply.
    if (capabilities.isLiveTranscribe) {
      return {
        liveConfig: {
          responseModalities: ['TEXT'],
          inputAudioTranscription: {},
        },
        tools: [] as Tool[],
      };
    }

    const isGemini38Live = capabilities.isGemini38LiveModel;

    // Construct Tools Configuration
    const tools: Tool[] = [];

    // Server-side tools
    if (chatSettings.isGoogleSearchEnabled || chatSettings.isDeepSearchEnabled) {
      tools.push({ googleSearch: {} });
    }

    const functionDeclarations = Object.values(clientFunctions ?? {}).map(({ declaration }) =>
      capabilities.isGemini38LiveExtendedThinkingModel
        ? ({ ...declaration, behavior: 'NON_BLOCKING' } as typeof declaration)
        : declaration,
    );
    if (functionDeclarations.length > 0) {
      tools.push({ functionDeclarations });
    }

    const hasLocalPythonTool = functionDeclarations.some((declaration) => declaration.name === 'run_local_python');
    const cleanUserInstruction = stripLegacyFeatureMarkers(chatSettings.systemInstruction);
    const effectiveSystemInstruction = hasLocalPythonTool
      ? cleanUserInstruction
        ? `${cleanUserInstruction}\n\n${LOCAL_PYTHON_SYSTEM_PROMPT}`
        : LOCAL_PYTHON_SYSTEM_PROMPT
      : cleanUserInstruction || undefined;

    const liveConfig: LiveConfig = {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: chatSettings.ttsVoice || 'Zephyr' } },
      },
      systemInstruction: effectiveSystemInstruction ? { parts: [{ text: effectiveSystemInstruction }] } : undefined,
      tools: tools.length > 0 ? tools : undefined,
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      contextWindowCompression: {
        slidingWindow: {},
      },
      // Enable session resumption from the first connection so the server
      // can start issuing handle updates immediately.
      sessionResumption: sessionHandle ? { handle: sessionHandle } : {},
      mediaResolution: chatSettings.mediaResolution,
    };

    // Configure Thinking for Native Audio models if enabled in settings.
    // Gemini 3.8 Live Extended Thinking requires background reasoning via thinkingConfig.
    // Gemini 3.8 Live uses native interleaved reasoning; thinking_level / thinkingConfig must be omitted.
    // Gemini 2.5 native audio/live models still use thinkingBudget.
    if (capabilities.isGemini38LiveExtendedThinkingModel) {
      const rawLevel = chatSettings.thinkingLevel?.toUpperCase();
      const thinkingLevel = (rawLevel === 'MEDIUM' || rawLevel === 'HIGH' ? rawLevel : 'LOW') as
        'LOW' | 'MEDIUM' | 'HIGH';
      liveConfig.thinkingConfig = {
        thinkingLevel,
        includeThoughts: true,
      };
    } else if (isGemini38Live) {
      // Per Gemini 3.8 Live specification: thinking_level is not supported; omit thinkingConfig.
    } else if (chatSettings.thinkingBudget !== 0) {
      const thinkingConfig: NonNullable<LiveConfig['thinkingConfig']> = {
        includeThoughts: true,
      };
      if (chatSettings.thinkingBudget > 0) {
        thinkingConfig.thinkingBudget = chatSettings.thinkingBudget;
      }
      liveConfig.thinkingConfig = thinkingConfig;
    }

    if (isPushToTalk || allowBargeIn === false) {
      liveConfig.realtimeInputConfig = {
        automaticActivityDetection: isPushToTalk ? { disabled: true } : undefined,
        activityHandling: allowBargeIn === false ? 'NO_INTERRUPTION' : 'START_OF_ACTIVITY_INTERRUPTS',
      };
    }

    return { liveConfig, tools };
  }, [chatSettings, sessionHandle, clientFunctions, liveTranslateConfig, isPushToTalk, allowBargeIn]);
};
