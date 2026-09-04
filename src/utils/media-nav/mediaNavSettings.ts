import type { ChatSettings } from '@/types';
import type { MediaNavKind } from '@/stores/mediaNavStore';
import { isLiveArtifactsSystemInstruction } from '@/features/prompts/promptRegistry';
import { DEFAULT_SYSTEM_INSTRUCTION } from '@/constants/settingsDefaults';

/**
 * Returns true if any media navigation mode is currently enabled in settings.
 */
export const hasActiveMediaNavSettings = (settings: Partial<ChatSettings>): boolean =>
  Boolean(
    settings.isPdfNavEnabled || settings.isVideoNavEnabled || settings.isAudioNavEnabled || settings.isImageNavEnabled,
  );

/**
 * Immutably updates ChatSettings with a single active media navigation kind (or none if null),
 * clearing mutually exclusive modes and resetting live artifacts system instruction if active.
 */
export const applyMediaNavKindToSettings = <T extends ChatSettings>(prev: T, kind: MediaNavKind | null): T => ({
  ...prev,
  isPdfNavEnabled: kind === 'pdf',
  isVideoNavEnabled: kind === 'video',
  isAudioNavEnabled: kind === 'audio',
  isImageNavEnabled: kind === 'image',
  ...(kind !== null && isLiveArtifactsSystemInstruction(prev.systemInstruction)
    ? { systemInstruction: DEFAULT_SYSTEM_INSTRUCTION }
    : {}),
});
