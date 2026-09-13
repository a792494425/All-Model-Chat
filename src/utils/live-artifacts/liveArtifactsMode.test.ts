import { describe, expect, it } from 'vitest';
import { isLiveArtifactsModeFromSettings } from './liveArtifactsMode';

describe('isLiveArtifactsModeFromSettings', () => {
  it('returns true when isVisualFormattingActive is true regardless of isLiveArtifactsEnabled', () => {
    expect(
      isLiveArtifactsModeFromSettings({
        isVisualFormattingActive: true,
        isLiveArtifactsEnabled: false,
      }),
    ).toBe(true);

    expect(
      isLiveArtifactsModeFromSettings({
        isVisualFormattingActive: true,
        isLiveArtifactsEnabled: true,
      }),
    ).toBe(true);

    expect(
      isLiveArtifactsModeFromSettings({
        isVisualFormattingActive: true,
      }),
    ).toBe(true);
  });

  it('returns true when isLiveArtifactsEnabled is true', () => {
    expect(
      isLiveArtifactsModeFromSettings({
        isLiveArtifactsEnabled: true,
      }),
    ).toBe(true);
  });

  it('returns false when isLiveArtifactsEnabled is false and isVisualFormattingActive is false/absent', () => {
    expect(
      isLiveArtifactsModeFromSettings({
        isLiveArtifactsEnabled: false,
        isVisualFormattingActive: false,
      }),
    ).toBe(false);

    expect(
      isLiveArtifactsModeFromSettings({
        isLiveArtifactsEnabled: false,
      }),
    ).toBe(false);
  });

  it('detects live artifacts system prompt markers in systemInstruction', () => {
    expect(
      isLiveArtifactsModeFromSettings({
        systemInstruction: 'Prefix\n\n[Live Artifacts Inline Protocol]\nRules...',
      }),
    ).toBe(true);

    expect(
      isLiveArtifactsModeFromSettings({
        systemInstruction: 'Just a normal assistant persona',
      }),
    ).toBe(false);
  });
});
