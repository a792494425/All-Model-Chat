import { describe, expect, it } from 'vitest';
import { getChatInputPlaceholder } from './chatInputPlaceholder';

describe('getChatInputPlaceholder', () => {
  const mockT = (key: string) => `translated:${key}`;

  it('returns transcribe placeholder when isTranscribeModel is true', () => {
    const result = getChatInputPlaceholder({
      isTranscribeModel: true,
      taskSuggestionMode: 'translate',
      isLiveArtifactsPromptActive: true,
      t: mockT as any,
    });
    expect(result).toBe('translated:chatInputPlaceholderTranscribe');
  });

  it('returns combined placeholder when both live artifacts and a task mode are active', () => {
    const result = getChatInputPlaceholder({
      isTranscribeModel: false,
      taskSuggestionMode: 'translate',
      isLiveArtifactsPromptActive: true,
      t: mockT as any,
    });
    expect(result).toBe('translated:chatInputPlaceholderLiveArtifactsTranslate');
  });

  it('returns task-specific placeholder when only task mode is active', () => {
    const resultTranslate = getChatInputPlaceholder({
      taskSuggestionMode: 'translate',
      t: mockT as any,
    });
    expect(resultTranslate).toBe('translated:chatInputPlaceholderTranslate');

    const resultOcr = getChatInputPlaceholder({
      taskSuggestionMode: 'ocr',
      t: mockT as any,
    });
    expect(resultOcr).toBe('translated:chatInputPlaceholderOcr');

    const resultSummarize = getChatInputPlaceholder({
      taskSuggestionMode: 'summarize',
      t: mockT as any,
    });
    expect(resultSummarize).toBe('translated:chatInputPlaceholderSummarize');
  });

  it('returns live artifacts placeholder when only live artifacts is active', () => {
    const result = getChatInputPlaceholder({
      isLiveArtifactsPromptActive: true,
      t: mockT as any,
    });
    expect(result).toBe('translated:chatInputPlaceholderLiveArtifacts');
  });

  it('returns media nav placeholder when activeMediaNavKind is active', () => {
    const resultVideo = getChatInputPlaceholder({
      activeMediaNavKind: 'video',
      t: mockT as any,
    });
    expect(resultVideo).toBe('translated:chatInputPlaceholderVideoNav');

    const resultPdf = getChatInputPlaceholder({
      activeMediaNavKind: 'pdf',
      t: mockT as any,
    });
    expect(resultPdf).toBe('translated:chatInputPlaceholderPdfNav');

    const resultImage = getChatInputPlaceholder({
      activeMediaNavKind: 'image',
      t: mockT as any,
    });
    expect(resultImage).toBe('translated:chatInputPlaceholderImageNav');

    const resultAudio = getChatInputPlaceholder({
      activeMediaNavKind: 'audio',
      t: mockT as any,
    });
    expect(resultAudio).toBe('translated:chatInputPlaceholderAudioNav');
  });

  it('returns combined live artifacts + media nav placeholder when both are active', () => {
    const resultVideo = getChatInputPlaceholder({
      activeMediaNavKind: 'video',
      isLiveArtifactsPromptActive: true,
      t: mockT as any,
    });
    expect(resultVideo).toBe('translated:chatInputPlaceholderLiveArtifactsVideoNav');

    const resultPdf = getChatInputPlaceholder({
      activeMediaNavKind: 'pdf',
      isLiveArtifactsPromptActive: true,
      t: mockT as any,
    });
    expect(resultPdf).toBe('translated:chatInputPlaceholderLiveArtifactsPdfNav');
  });

  it('returns default placeholder when no special modes are active', () => {
    const result = getChatInputPlaceholder({
      t: mockT as any,
    });
    expect(result).toBe('translated:chatInputPlaceholder');
  });
});
