import { describe, expect, it, vi } from 'vitest';
import { composeSystemInstruction, stripLegacyFeatureMarkers } from './promptCompositor';

vi.mock('./promptRegistry', async () => {
  const actual = await vi.importActual<typeof import('./promptRegistry')>('./promptRegistry');
  return {
    ...actual,
    loadLiveArtifactsSystemPrompt: vi.fn(async (_lang, mode = 'inline') => `[MOCK_LA_${mode.toUpperCase()}]`),
    loadBboxSystemPrompt: vi.fn(async () => '[MOCK_BBOX]'),
    loadHdGuideSystemPrompt: vi.fn(async () => '[MOCK_HD_GUIDE]'),
    loadDeepSearchSystemPrompt: vi.fn(async () => '[MOCK_DEEP_SEARCH]'),
    loadLocalPythonSystemPrompt: vi.fn(async () => '[MOCK_LOCAL_PYTHON]'),
    loadTaskSuggestionSystemPrompt: vi.fn(async (mode: string) => `[MOCK_TASK_${mode.toUpperCase()}]`),
  };
});

describe('stripLegacyFeatureMarkers', () => {
  it('returns plain user instruction unchanged', () => {
    expect(stripLegacyFeatureMarkers('You are a helpful assistant.')).toBe('You are a helpful assistant.');
  });

  it('strips legacy Live Artifacts protocol if the entire instruction is the protocol', () => {
    expect(stripLegacyFeatureMarkers('[LiveUI Inline Protocol]\nSome rules...')).toBe('');
  });

  it('strips legacy BBox marker if the entire instruction is bbox prompt', () => {
    expect(stripLegacyFeatureMarkers('**任务：** 请作为一位计算机视觉专家\nDetails...')).toBe('');
  });

  it('preserves user instruction when followed by legacy Live Artifacts protocol', () => {
    expect(stripLegacyFeatureMarkers('You are a financial analyst.\n\n[LiveUI Inline Protocol]\nSome rules...')).toBe(
      'You are a financial analyst.',
    );
  });

  it('preserves user instruction when followed by legacy BBox prompt', () => {
    expect(
      stripLegacyFeatureMarkers('Answer in traditional Chinese.\n\n**任务：** 请作为一位计算机视觉专家\nDetails...'),
    ).toBe('Answer in traditional Chinese.');
  });

  it('handles empty or null values', () => {
    expect(stripLegacyFeatureMarkers('')).toBe('');
    expect(stripLegacyFeatureMarkers(null)).toBe('');
    expect(stripLegacyFeatureMarkers(undefined)).toBe('');
  });
});

describe('composeSystemInstruction', () => {
  it('returns undefined when no prompt or mode is active', async () => {
    const result = await composeSystemInstruction({});
    expect(result).toBeUndefined();
  });

  it('returns only the user instruction when no tools/modes are enabled', async () => {
    const result = await composeSystemInstruction({
      userInstruction: 'You are a helpful assistant.',
    });
    expect(result).toBe('You are a helpful assistant.');
  });

  it('layers user instruction before Live Artifacts protocol', async () => {
    const result = await composeSystemInstruction({
      userInstruction: 'You are a helpful assistant.',
      isLiveArtifactsEnabled: true,
      liveArtifactsPromptMode: 'inline',
    });
    expect(result).toBe('You are a helpful assistant.\n\n[MOCK_LA_INLINE]');
  });

  it('uses custom Live Artifacts prompt override when provided', async () => {
    const result = await composeSystemInstruction({
      userInstruction: 'You are a helpful assistant.',
      isLiveArtifactsEnabled: true,
      customLiveArtifactsPrompt: 'Custom Artifact Rules',
    });
    expect(result).toBe('You are a helpful assistant.\n\nCustom Artifact Rules');
  });

  it('layers user instruction, vision mode, and tool directives in order', async () => {
    const result = await composeSystemInstruction({
      userInstruction: 'Custom Persona',
      visionPromptMode: 'bbox',
      isDeepSearchEnabled: true,
      isLocalPythonEnabled: true,
    });
    expect(result).toBe('Custom Persona\n\n[MOCK_BBOX]\n\n[MOCK_DEEP_SEARCH]\n\n[MOCK_LOCAL_PYTHON]');
  });

  it('omits deep search prompt for Gemma models', async () => {
    const result = await composeSystemInstruction({
      userInstruction: 'Custom Persona',
      isDeepSearchEnabled: true,
      isGemmaModel: true,
    });
    expect(result).toBe('Custom Persona');
  });

  it('includes Live Artifacts and media citation directive when media locate directives are active', async () => {
    const result = await composeSystemInstruction({
      userInstruction: 'My Custom Prompt',
      isLiveArtifactsEnabled: true,
      locateDirectives: ['[PDF_LOCATE: page 5]', '[VIDEO_LOCATE: 01:23]'],
    });
    expect(result).toContain('My Custom Prompt');
    expect(result).toContain('[MOCK_LA_INLINE]');
    expect(result).toContain('Live UI 媒体引用与跳转交互规范');
    expect(result).not.toContain('[PDF_LOCATE: page 5]');
  });

  it('emits raw media locate directives when Live Artifacts is disabled', async () => {
    const result = await composeSystemInstruction({
      userInstruction: 'My Custom Prompt',
      isLiveArtifactsEnabled: false,
      locateDirectives: ['[PDF_LOCATE: page 5]', '[VIDEO_LOCATE: 01:23]'],
    });
    expect(result).toBe('My Custom Prompt\n\n[PDF_LOCATE: page 5]\n\n[VIDEO_LOCATE: 01:23]');
    expect(result).not.toContain('[MOCK_LA_INLINE]');
  });

  it('includes Live Artifacts when locateDirectives is empty', async () => {
    const result = await composeSystemInstruction({
      userInstruction: 'My Custom Prompt',
      isLiveArtifactsEnabled: true,
      locateDirectives: [],
    });
    expect(result).toBe('My Custom Prompt\n\n[MOCK_LA_INLINE]');
  });

  it('supports HD Guide vision mode', async () => {
    const result = await composeSystemInstruction({
      visionPromptMode: 'hdGuide',
    });
    expect(result).toBe('[MOCK_HD_GUIDE]');
  });

  it('layers task suggestion directive when taskSuggestionMode is active', async () => {
    const result = await composeSystemInstruction({
      userInstruction: 'You are an AI assistant.',
      taskSuggestionMode: 'translate',
    });
    expect(result).toBe('You are an AI assistant.\n\n[MOCK_TASK_TRANSLATE]');
  });

  it('layers both Live Artifacts and Task Suggestion directive concurrently', async () => {
    const result = await composeSystemInstruction({
      userInstruction: 'You are an AI assistant.',
      isLiveArtifactsEnabled: true,
      taskSuggestionMode: 'translate',
    });
    expect(result).toBe('You are an AI assistant.\n\n[MOCK_LA_INLINE]\n\n[MOCK_TASK_TRANSLATE]');
  });

  it('strips legacy task directive marker from user instruction if present', () => {
    expect(
      stripLegacyFeatureMarkers('You are an assistant.\n\n[Task Directive - translate]\n### Bilingual Translation'),
    ).toBe('You are an assistant.');
  });
});
