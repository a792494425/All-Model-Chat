import { act } from 'react';
import { setupProviderTestRenderer } from '@/test/render/providerRenderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UploadedFile } from '@/types';

const {
  mockCopyFileToClipboard,
  mockExtractDocxText,
  mockExtractAudioFromVideo,
  mockTranscribeAudioWithGemini,
  mockGetCachedSubtitles,
  mockSaveCachedSubtitles,
  mockToastError,
  mockToastSuccess,
  mockSettingsState,
  mockTextFileViewer,
} = vi.hoisted(() => ({
  mockCopyFileToClipboard: vi.fn(),
  mockExtractDocxText: vi.fn(),
  mockExtractAudioFromVideo: vi.fn(),
  mockTranscribeAudioWithGemini: vi.fn(),
  mockGetCachedSubtitles: vi.fn(),
  mockSaveCachedSubtitles: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockSettingsState: {
    language: 'en',
    appSettings: {
      useCustomApiConfig: true,
      apiKey: 'test-api-key',
      customShortcuts: {},
    },
    currentTheme: {
      id: 'pearl',
    },
  },
  mockTextFileViewer: vi.fn(
    ({ content, renderMode, themeId }: { content?: string | null; renderMode?: string; themeId?: string }) => (
      <div data-testid="text-file-viewer" data-render-mode={renderMode} data-theme-id={themeId}>
        {content ?? 'Preview text content'}
      </div>
    ),
  ),
}));

const { mockCreatedObjectUrls, mockRevokedObjectUrls } = vi.hoisted(() => ({
  mockCreatedObjectUrls: [] as string[],
  mockRevokedObjectUrls: [] as string[],
}));

vi.mock('@/stores/toastStore', () => ({
  toastError: (...args: any[]) => mockToastError(...args),
  toastSuccess: (...args: any[]) => mockToastSuccess(...args),
}));

vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: (selector: (state: typeof mockSettingsState) => unknown) => selector(mockSettingsState),
}));

vi.mock('@/components/shared/Modal', () => ({
  Modal: ({ children }: { children: React.ReactNode }) => <div data-testid="modal-shell">{children}</div>,
}));

vi.mock('@/components/shared/file-preview/FilePreviewHeader', async () => {
  const React = await import('react');

  const FilePreviewHeader = React.forwardRef<{ showCopyFeedback: () => void }>((props: any, ref) => {
    const [isCopied, setIsCopied] = React.useState(false);

    React.useImperativeHandle(
      ref,
      () => ({
        showCopyFeedback: () => setIsCopied(true),
      }),
      [],
    );

    return (
      <div data-testid="mock-file-preview-header">
        <button
          type="button"
          data-testid="file-preview-copy-button"
          data-copied={isCopied ? 'true' : 'false'}
          onClick={() => setIsCopied(true)}
        >
          {isCopied ? 'Copied' : 'Copy'}
        </button>
        {props.extraActions}
      </div>
    );
  });

  FilePreviewHeader.displayName = 'MockFilePreviewHeader';

  return { FilePreviewHeader };
});

vi.mock('@/components/shared/file-preview/TextFileViewer', () => ({
  TextFileViewer: mockTextFileViewer,
}));

vi.mock('@/components/shared/file-preview/DocxViewer', () => ({
  DocxViewer: ({ file }: { file: { name: string } }) => <div data-testid="docx-viewer">{file.name}</div>,
}));

vi.mock('@/utils/file/fileClipboard', () => ({
  copyFileToClipboard: mockCopyFileToClipboard,
}));

vi.mock('@/utils/file/filePreviewUrls', () => ({
  cleanupFilePreviewUrl: (file: { dataUrl?: string }) => {
    if (file.dataUrl) mockRevokedObjectUrls.push(file.dataUrl);
  },
  fileToBlobUrl: () => {
    const url = `blob:modal-preview-${mockCreatedObjectUrls.length + 1}`;
    mockCreatedObjectUrls.push(url);
    return url;
  },
}));

vi.mock('@/utils/file/fileTypeClassification', () => ({
  getFileKindFlags: (file: { name: string; type: string }) => ({
    isImage: file.type.startsWith('image/'),
    isAudio: file.type.startsWith('audio/'),
    isVideo: file.type.startsWith('video/') && file.type !== 'video/youtube-link',
    isYoutube: file.type === 'video/youtube-link',
    isPdf: file.type === 'application/pdf',
    isText: file.type.startsWith('text/') || /\.(md|markdown|txt|json|js|ts|tsx|jsx|css|html)$/i.test(file.name),
    isMarkdown:
      file.type === 'text/markdown' ||
      file.name.toLowerCase().endsWith('.md') ||
      file.name.toLowerCase().endsWith('.markdown'),
  }),
  isMarkdownFile: (file: { name: string; type: string }) =>
    file.type === 'text/markdown' ||
    file.name.toLowerCase().endsWith('.md') ||
    file.name.toLowerCase().endsWith('.markdown'),
  isTextFile: (file: { name: string; type: string }) =>
    file.type.startsWith('text/') || /\.(md|markdown|txt|json|js|ts|tsx|jsx|css|html)$/i.test(file.name),
  isSpreadsheetFile: (file: { name: string; type: string }) =>
    file.name.toLowerCase().endsWith('.xlsx') ||
    file.name.toLowerCase().endsWith('.xls') ||
    file.name.toLowerCase().endsWith('.csv'),
  isArchiveFile: (file: { name: string; type: string }) =>
    file.name.toLowerCase().endsWith('.zip') ||
    file.name.toLowerCase().endsWith('.tar') ||
    file.name.toLowerCase().endsWith('.gz'),
}));

vi.mock('@/utils/document/docxPreview', () => ({
  extractDocxText: mockExtractDocxText,
  isDocxFile: (file: { name: string; type: string }) =>
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.name.toLowerCase().endsWith('.docx'),
}));

vi.mock('@/utils/video-subtitles/extractAudioFromVideo', () => ({
  extractAudioFromVideo: mockExtractAudioFromVideo,
}));

vi.mock('@/utils/video-subtitles/geminiTranscribeService', () => ({
  transcribeAudioWithGemini: mockTranscribeAudioWithGemini,
}));

vi.mock('@/utils/video-subtitles/subtitleCacheService', () => ({
  getCachedSubtitles: mockGetCachedSubtitles,
  saveCachedSubtitles: mockSaveCachedSubtitles,
}));

const mockTranslateSubtitlesWithGemini = vi.fn();

vi.mock('@/utils/video-subtitles/geminiSubtitleTranslateService', () => ({
  translateSubtitlesWithGemini: (...args: any[]) => mockTranslateSubtitlesWithGemini(...args),
}));

import { FilePreviewModal } from './FilePreviewModal';

describe('FilePreviewModal', () => {
  const renderer = setupProviderTestRenderer();

  const createDocxFile = (): UploadedFile => ({
    id: 'docx-1',
    name: 'report.docx',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 512,
    rawFile: new File(['fake-docx'], 'report.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
    uploadState: 'active',
  });

  const createMarkdownFile = (): UploadedFile => ({
    id: 'md-1',
    name: 'README.md',
    type: '',
    size: 256,
    dataUrl: 'blob:markdown-preview',
    uploadState: 'active',
  });

  const createAudioFile = (): UploadedFile => ({
    id: 'audio-1',
    name: 'clip.mp3',
    type: 'audio/mpeg',
    size: 1024,
    dataUrl: 'blob:audio-preview',
    rawFile: new File(['fake-audio-bytes'], 'clip.mp3', { type: 'audio/mpeg' }),
    uploadState: 'active',
  });

  const createPdfFile = (): UploadedFile => ({
    id: 'pdf-1',
    name: 'document.pdf',
    type: 'application/pdf',
    size: 2048,
    dataUrl: 'blob:pdf-preview',
    uploadState: 'active',
  });

  const createVideoFile = (): UploadedFile => ({
    id: 'vid-1',
    name: 'video.mp4',
    type: 'video/mp4',
    size: 4096,
    dataUrl: 'blob:video-preview',
    rawFile: new File(['fake-video-bytes'], 'video.mp4', { type: 'video/mp4' }),
    uploadState: 'active',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatedObjectUrls.length = 0;
    mockRevokedObjectUrls.length = 0;
    mockSettingsState.appSettings.customShortcuts = {};
    mockGetCachedSubtitles.mockResolvedValue(null);
    mockSaveCachedSubtitles.mockResolvedValue(undefined);
  });

  it('renders extracted docx text in the text preview surface', async () => {
    mockExtractDocxText.mockResolvedValue({
      text: 'Quarterly document preview',
      messages: [],
    });

    await act(async () => {
      renderer.root.render(<FilePreviewModal file={createDocxFile()} onClose={() => {}} />);
    });

    expect(document.querySelector('[data-testid="docx-viewer"]')).not.toBeNull();

    const toggleBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('切换至纯文本模式') || b.textContent?.includes('Switch to plain text mode'),
    );
    await act(async () => {
      toggleBtn?.click();
    });

    await vi.waitFor(() => {
      expect(mockExtractDocxText).toHaveBeenCalledTimes(1);
      expect(document.querySelector('[data-testid="text-file-viewer"]')?.textContent).toContain(
        'Quarterly document preview',
      );
    });
  });

  it('shows a readable error when docx preview extraction fails', async () => {
    mockExtractDocxText.mockRejectedValue(new Error('preview failed'));

    await act(async () => {
      renderer.root.render(<FilePreviewModal file={createDocxFile()} onClose={() => {}} />);
    });

    const toggleBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('切换至纯文本模式') || b.textContent?.includes('Switch to plain text mode'),
    );
    await act(async () => {
      toggleBtn?.click();
    });

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('Unable to preview this Word document.');
    });
  });

  it('uses configured file navigation shortcuts instead of hard-coded arrows', async () => {
    mockSettingsState.appSettings.customShortcuts = {
      'global.prevFile': 'a',
      'global.nextFile': 'd',
    };

    const onPrev = vi.fn();
    const onNext = vi.fn();

    await act(async () => {
      renderer.root.render(
        <FilePreviewModal file={createDocxFile()} onClose={() => {}} onPrev={onPrev} onNext={onNext} hasPrev hasNext />,
      );
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    });

    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('routes .md uploads into markdown preview mode with the active theme id', async () => {
    await act(async () => {
      renderer.root.render(<FilePreviewModal file={createMarkdownFile()} onClose={() => {}} />);
    });

    const viewer = document.querySelector('[data-testid="text-file-viewer"]');

    expect(viewer).not.toBeNull();
    expect(viewer?.getAttribute('data-render-mode')).toBe('markdown');
    expect(viewer?.getAttribute('data-theme-id')).toBe('pearl');
  });

  it('creates a temporary preview URL for Files API attachments that only have a local raw file', async () => {
    const file: UploadedFile = {
      id: 'txt-files-api-1',
      name: 'notes.txt',
      type: 'text/plain',
      size: 5,
      rawFile: new File(['hello'], 'notes.txt', { type: 'text/plain' }),
      fileApiName: 'files/abc123',
      fileUri: 'https://generativelanguage.googleapis.com/v1beta/files/abc123',
      transferStrategy: 'files-api',
      uploadState: 'active',
    };

    await act(async () => {
      renderer.root.render(<FilePreviewModal file={file} onClose={() => {}} />);
      await Promise.resolve();
    });

    await vi.waitFor(() => {
      expect(mockTextFileViewer.mock.lastCall?.[0]).toEqual(
        expect.objectContaining({
          file: expect.objectContaining({ dataUrl: 'blob:modal-preview-1' }),
        }),
      );
    });

    act(() => {
      renderer.root.render(<FilePreviewModal file={null} onClose={() => {}} />);
    });

    expect(mockRevokedObjectUrls).toContain('blob:modal-preview-1');
  });

  it('does not hijack copy shortcuts when the user has selected preview text', async () => {
    await act(async () => {
      renderer.root.render(<FilePreviewModal file={createMarkdownFile()} onClose={() => {}} />);
    });

    const previewNode = document.querySelector('[data-testid="text-file-viewer"]');
    const textNode = previewNode?.firstChild;

    expect(textNode).not.toBeNull();

    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(textNode as Text, 0);
    range.setEnd(textNode as Text, 6);
    selection?.removeAllRanges();
    selection?.addRange(range);

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'c',
          ctrlKey: true,
          bubbles: true,
        }),
      );
    });

    expect(mockCopyFileToClipboard).not.toHaveBeenCalled();
  });

  it('shows copy button feedback when the file is copied with the keyboard shortcut', async () => {
    await act(async () => {
      renderer.root.render(<FilePreviewModal file={createMarkdownFile()} onClose={() => {}} />);
    });

    expect(document.querySelector('[data-testid="file-preview-copy-button"]')?.getAttribute('data-copied')).toBe(
      'false',
    );

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'c',
          ctrlKey: true,
          bubbles: true,
        }),
      );
    });

    expect(mockCopyFileToClipboard).toHaveBeenCalledTimes(1);

    await vi.waitFor(() => {
      expect(document.querySelector('[data-testid="file-preview-copy-button"]')?.getAttribute('data-copied')).toBe(
        'true',
      );
    });
  });

  it('keeps audio previews constrained on narrow screens', async () => {
    await act(async () => {
      renderer.root.render(<FilePreviewModal file={createAudioFile()} onClose={() => {}} />);
    });

    const audio = document.querySelector('audio');
    const shell = audio?.parentElement;

    expect(audio?.className).toContain('max-w-full');
    expect(audio?.className).not.toContain('w-[300px]');
    expect(shell?.className).toContain('max-w-[calc(100vw-2rem)]');
  });

  it('renders a YouTube iframe preview for youtube-link files', async () => {
    const youtubeFile: UploadedFile = {
      id: 'youtube-preview-1',
      name: 'youtube.com/watch?v=MkaZ4OrbQn8',
      type: 'video/youtube-link',
      fileUri: 'https://www.youtube.com/watch?v=MkaZ4OrbQn8',
      size: 0,
      transferStrategy: 'remote-file-id',
      uploadState: 'active',
    };

    await act(async () => {
      renderer.root.render(<FilePreviewModal file={youtubeFile} onClose={() => {}} />);
    });

    const iframe = document.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('src')).toBe('https://www.youtube.com/embed/MkaZ4OrbQn8');
  });

  it('does not trigger prev/next file navigation when an editable input is focused', async () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();

    await act(async () => {
      renderer.root.render(
        <FilePreviewModal
          file={createMarkdownFile()}
          onClose={() => {}}
          onPrev={onPrev}
          onNext={onNext}
          hasPrev={true}
          hasNext={true}
        />,
      );
    });

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });

    expect(onPrev).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('does not hijack unmodified ArrowLeft/ArrowRight when previewing a PDF file', async () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();

    await act(async () => {
      renderer.root.render(
        <FilePreviewModal
          file={createPdfFile()}
          onClose={() => {}}
          onPrev={onPrev}
          onNext={onNext}
          hasPrev={true}
          hasNext={true}
        />,
      );
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });

    expect(onPrev).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
  });

  it('does not hijack unmodified ArrowLeft/ArrowRight when previewing a video file', async () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();

    await act(async () => {
      renderer.root.render(
        <FilePreviewModal
          file={createVideoFile()}
          onClose={() => {}}
          onPrev={onPrev}
          onNext={onNext}
          hasPrev={true}
          hasNext={true}
        />,
      );
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });

    expect(onPrev).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
  });

  it('triggers onPrev and onNext when previewing markdown file with unmodified ArrowLeft/ArrowRight', async () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();

    await act(async () => {
      renderer.root.render(
        <FilePreviewModal
          file={createMarkdownFile()}
          onClose={() => {}}
          onPrev={onPrev}
          onNext={onNext}
          hasPrev={true}
          hasNext={true}
        />,
      );
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    });
    expect(onPrev).toHaveBeenCalledTimes(1);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  describe('video subtitle extraction', () => {
    it('renders extract subtitles button for video files with high-contrast classes', async () => {
      await act(async () => {
        renderer.root.render(<FilePreviewModal file={createVideoFile()} onClose={() => {}} />);
      });

      const extractBtn = document.querySelector('[data-testid="extract-subtitles-btn"]');
      expect(extractBtn).not.toBeNull();
      expect(extractBtn).toHaveClass('text-sky-200');
      expect(extractBtn?.textContent?.trim()).toBe('Extract Subtitles');
    });

    it('extracts audio, transcribes with Gemini, and displays subtitles drawer', async () => {
      mockExtractAudioFromVideo.mockResolvedValue({
        audioBlob: new Blob(['wav-bytes'], { type: 'audio/wav' }),
        durationSeconds: 5,
      });
      mockTranscribeAudioWithGemini.mockResolvedValue([
        {
          text: 'Hello world',
          start_offset: '1.000s',
          end_offset: '2.500s',
        },
      ]);

      await act(async () => {
        renderer.root.render(
          <FilePreviewModal
            file={createVideoFile()}
            onClose={() => {}}
            hasPrev={true}
            onPrev={vi.fn()}
            hasNext={true}
            onNext={vi.fn()}
          />,
        );
      });

      const nextBtnBefore = document.querySelector('[data-testid="file-preview-next-btn"]');
      expect(nextBtnBefore?.className).toContain('opacity-100');
      expect(nextBtnBefore?.className).not.toContain('opacity-0 pointer-events-none');

      const extractBtn = document.querySelector('[data-testid="extract-subtitles-btn"]') as HTMLButtonElement;
      expect(extractBtn).not.toBeNull();

      await act(async () => {
        extractBtn.click();
      });

      await vi.waitFor(() => {
        expect(mockExtractAudioFromVideo).toHaveBeenCalledTimes(1);
        expect(mockTranscribeAudioWithGemini).toHaveBeenCalledTimes(1);
        expect(document.querySelector('[data-testid="video-subtitles-drawer"]')).not.toBeNull();
      });

      const nextBtnWithDrawer = document.querySelector('[data-testid="file-preview-next-btn"]');
      const prevBtnWithDrawer = document.querySelector('[data-testid="file-preview-prev-btn"]');
      expect(nextBtnWithDrawer?.className).toContain('opacity-0 pointer-events-none');
      expect(prevBtnWithDrawer?.className).toContain('opacity-0 pointer-events-none');

      // Toggle drawer closed
      const toggleBtn = document.querySelector('[data-testid="toggle-subtitles-drawer-btn"]') as HTMLButtonElement;
      expect(toggleBtn).not.toBeNull();

      await act(async () => {
        toggleBtn.click();
      });

      expect(document.querySelector('[data-testid="video-subtitles-drawer"]')).toBeNull();
      const nextBtnClosed = document.querySelector('[data-testid="file-preview-next-btn"]');
      expect(nextBtnClosed?.className).toContain('opacity-100');

      // Toggle drawer open again
      await act(async () => {
        toggleBtn.click();
      });

      expect(document.querySelector('[data-testid="video-subtitles-drawer"]')).not.toBeNull();
      const nextBtnReopened = document.querySelector('[data-testid="file-preview-next-btn"]');
      expect(nextBtnReopened?.className).toContain('opacity-0 pointer-events-none');
    });

    it('shows error state when transcription throws', async () => {
      mockExtractAudioFromVideo.mockResolvedValue({
        audioBlob: new Blob(['wav-bytes'], { type: 'audio/wav' }),
        durationSeconds: 5,
      });
      mockTranscribeAudioWithGemini.mockRejectedValue(new Error('Quota exceeded'));

      await act(async () => {
        renderer.root.render(<FilePreviewModal file={createVideoFile()} onClose={() => {}} />);
      });

      const extractBtn = document.querySelector('[data-testid="extract-subtitles-btn"]') as HTMLButtonElement;
      await act(async () => {
        extractBtn.click();
      });

      await vi.waitFor(() => {
        expect(mockExtractAudioFromVideo).toHaveBeenCalledTimes(1);
        // After failure, extract button should be available again to retry
        expect(document.querySelector('[data-testid="extract-subtitles-btn"]')).not.toBeNull();
      });
    });

    it('shows error toast and does not save cache when transcription yields 0 cues', async () => {
      mockExtractAudioFromVideo.mockResolvedValue({
        audioBlob: new Blob(['wav-bytes'], { type: 'audio/wav' }),
        durationSeconds: 5,
      });
      mockTranscribeAudioWithGemini.mockResolvedValue([]);

      await act(async () => {
        renderer.root.render(<FilePreviewModal file={createVideoFile()} onClose={() => {}} />);
      });

      const extractBtn = document.querySelector('[data-testid="extract-subtitles-btn"]') as HTMLButtonElement;
      expect(extractBtn).not.toBeNull();

      await act(async () => {
        extractBtn.click();
      });

      await vi.waitFor(() => {
        expect(mockExtractAudioFromVideo).toHaveBeenCalledTimes(1);
        expect(mockTranscribeAudioWithGemini).toHaveBeenCalledTimes(1);
        expect(mockToastError).toHaveBeenCalledWith('No speech detected in audio.');
        expect(mockToastSuccess).not.toHaveBeenCalled();
        expect(mockSaveCachedSubtitles).not.toHaveBeenCalled();
        expect(document.querySelector('[data-testid="video-subtitles-drawer"]')).toBeNull();
      });
    });

    it('loads cached subtitles automatically on mount and displays ready toggle button', async () => {
      mockGetCachedSubtitles.mockResolvedValueOnce({
        cues: [
          {
            id: 1,
            startSeconds: 0,
            endSeconds: 3,
            startTimeSrt: '00:00:00,000',
            endTimeSrt: '00:00:03,000',
            startTimeVtt: '00:00:00.000',
            endTimeVtt: '00:00:03.000',
            text: 'Cached Subtitle',
          },
        ],
        srtContent: '1\n00:00:00,000 --> 00:00:03,000\nCached Subtitle\n',
        vttContent: 'WEBVTT\n\n1\n00:00:00.000 --> 00:00:03.000\nCached Subtitle\n',
        durationSeconds: 10,
        createdAt: Date.now(),
      });

      await act(async () => {
        renderer.root.render(<FilePreviewModal file={createVideoFile()} onClose={() => {}} />);
      });

      await vi.waitFor(() => {
        const toggleBtn = document.querySelector('[data-testid="toggle-subtitles-drawer-btn"]');
        expect(toggleBtn).not.toBeNull();
        expect(toggleBtn?.getAttribute('title')).toContain('Loaded from cache');
      });

      // Does not call extractAudio or Gemini API because it was loaded from cache
      expect(mockExtractAudioFromVideo).not.toHaveBeenCalled();
      expect(mockTranscribeAudioWithGemini).not.toHaveBeenCalled();
    });

    it('saves extracted subtitles to cache upon completion', async () => {
      mockExtractAudioFromVideo.mockResolvedValue({
        audioBlob: new Blob(['wav-bytes'], { type: 'audio/wav' }),
        durationSeconds: 12,
      });
      mockTranscribeAudioWithGemini.mockResolvedValue([
        {
          text: 'Saved Subtitle',
          start_offset: '0.000s',
          end_offset: '2.000s',
        },
      ]);

      await act(async () => {
        renderer.root.render(<FilePreviewModal file={createVideoFile()} onClose={() => {}} />);
      });

      const extractBtn = document.querySelector('[data-testid="extract-subtitles-btn"]') as HTMLButtonElement;
      await act(async () => {
        extractBtn.click();
      });

      await vi.waitFor(() => {
        expect(mockSaveCachedSubtitles).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'video.mp4' }),
          expect.objectContaining({
            durationSeconds: 12,
            srtContent: expect.stringContaining('Saved Subtitle'),
            vttContent: expect.stringContaining('Saved Subtitle'),
          }),
        );
      });
    });

    it('translates subtitles and saves bilingual cache when translate button is clicked', async () => {
      mockGetCachedSubtitles.mockResolvedValueOnce({
        cues: [
          {
            id: 1,
            startSeconds: 0,
            endSeconds: 3,
            startTimeSrt: '00:00:00,000',
            endTimeSrt: '00:00:03,000',
            startTimeVtt: '00:00:00.000',
            endTimeVtt: '00:00:03.000',
            text: 'Original English line',
          },
        ],
        srtContent: '...',
        vttContent: '...',
        durationSeconds: 5,
        createdAt: Date.now(),
      });

      mockTranslateSubtitlesWithGemini.mockResolvedValueOnce([
        {
          id: 1,
          startSeconds: 0,
          endSeconds: 3,
          startTimeSrt: '00:00:00,000',
          endTimeSrt: '00:00:03,000',
          startTimeVtt: '00:00:00.000',
          endTimeVtt: '00:00:03.000',
          text: 'Original English line',
          translation: '翻译后的中文台词',
        },
      ]);

      await act(async () => {
        renderer.root.render(<FilePreviewModal file={createVideoFile()} onClose={() => {}} />);
      });

      // Open drawer
      await vi.waitFor(() => {
        const toggleBtn = document.querySelector('[data-testid="toggle-subtitles-drawer-btn"]') as HTMLButtonElement;
        expect(toggleBtn).not.toBeNull();
      });

      const toggleBtn = document.querySelector('[data-testid="toggle-subtitles-drawer-btn"]') as HTMLButtonElement;
      await act(async () => {
        toggleBtn.click();
      });

      const translateBtn = document.querySelector('[data-testid="translate-subtitles-btn"]') as HTMLButtonElement;
      expect(translateBtn).not.toBeNull();

      await act(async () => {
        translateBtn.click();
      });

      await vi.waitFor(() => {
        expect(mockTranslateSubtitlesWithGemini).toHaveBeenCalledTimes(1);
        expect(mockSaveCachedSubtitles).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'video.mp4' }),
          expect.objectContaining({
            bilingualVttContent: expect.stringContaining('翻译后的中文台词'),
            translatedVttContent: expect.stringContaining('翻译后的中文台词'),
          }),
        );
      });
    });

    it('closes subtitle drawer on Escape key without closing the entire modal', async () => {
      const onCloseMock = vi.fn();
      mockGetCachedSubtitles.mockResolvedValue({
        cues: [
          {
            id: 1,
            startSeconds: 0,
            endSeconds: 3,
            startTimeSrt: '00:00:00,000',
            endTimeSrt: '00:00:03,000',
            startTimeVtt: '00:00:00.000',
            endTimeVtt: '00:00:03.000',
            text: 'Test line',
          },
        ],
        srtContent: '...',
        vttContent: '...',
        durationSeconds: 5,
        createdAt: Date.now(),
      });

      await act(async () => {
        renderer.root.render(<FilePreviewModal file={createVideoFile()} onClose={onCloseMock} />);
      });

      await vi.waitFor(() => {
        const toggleBtn = document.querySelector('[data-testid="toggle-subtitles-drawer-btn"]') as HTMLButtonElement;
        expect(toggleBtn).not.toBeNull();
      });

      // Open drawer
      const toggleBtn = document.querySelector('[data-testid="toggle-subtitles-drawer-btn"]') as HTMLButtonElement;
      await act(async () => {
        toggleBtn.click();
      });
      expect(document.querySelector('[data-testid="video-subtitles-drawer"]')).not.toBeNull();

      // Press Escape
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });

      // Subtitle drawer should be closed, but modal onClose should NOT have been called
      expect(document.querySelector('[data-testid="video-subtitles-drawer"]')).toBeNull();
      expect(onCloseMock).not.toHaveBeenCalled();
    });

    it('resets subtitle state when switching to a different file without cached subtitles', async () => {
      mockGetCachedSubtitles.mockImplementation(async (file: UploadedFile) => {
        if (file.name === 'video1.mp4') {
          return {
            cues: [
              {
                id: 1,
                startSeconds: 0,
                endSeconds: 3,
                startTimeSrt: '00:00:00,000',
                endTimeSrt: '00:00:03,000',
                startTimeVtt: '00:00:00.000',
                endTimeVtt: '00:00:03.000',
                text: 'Video 1 Subtitle',
              },
            ],
            srtContent: '...',
            vttContent: 'WEBVTT',
            durationSeconds: 5,
            createdAt: Date.now(),
          };
        }
        return null;
      });

      const video1 = createVideoFile();
      video1.name = 'video1.mp4';
      video1.id = 'video1';

      const video2 = createVideoFile();
      video2.name = 'video2.mp4';
      video2.id = 'video2';

      await act(async () => {
        renderer.root.render(<FilePreviewModal file={video1} onClose={() => {}} />);
      });

      await vi.waitFor(() => {
        expect(document.querySelector('[data-testid="toggle-subtitles-drawer-btn"]')).not.toBeNull();
      });

      // Switch to video2 (which has no cache)
      await act(async () => {
        renderer.root.render(<FilePreviewModal file={video2} onClose={() => {}} />);
      });

      await vi.waitFor(() => {
        // Ready button should be gone, extract button should be shown for video2
        expect(document.querySelector('[data-testid="toggle-subtitles-drawer-btn"]')).toBeNull();
        expect(document.querySelector('[data-testid="extract-subtitles-btn"]')).not.toBeNull();
        expect(document.querySelector('[data-testid="video-subtitles-drawer"]')).toBeNull();
      });
    });

    it('supports subtitle extraction and drawer for audio files', async () => {
      mockExtractAudioFromVideo.mockResolvedValue({
        audioBlob: new Blob(['wav-bytes'], { type: 'audio/wav' }),
        durationSeconds: 8,
      });
      mockTranscribeAudioWithGemini.mockResolvedValue([
        {
          text: 'Audio podcast subtitle',
          start_offset: '0.500s',
          end_offset: '2.500s',
        },
      ]);

      const audioFile = createAudioFile();
      await act(async () => {
        renderer.root.render(<FilePreviewModal file={audioFile} onClose={() => {}} />);
      });

      const extractBtn = document.querySelector('[data-testid="extract-subtitles-btn"]') as HTMLButtonElement;
      expect(extractBtn).not.toBeNull();
      expect(extractBtn?.textContent?.trim()).toBe('Extract Subtitles');

      await act(async () => {
        extractBtn.click();
      });

      await vi.waitFor(() => {
        expect(mockExtractAudioFromVideo).toHaveBeenCalledTimes(1);
        expect(mockTranscribeAudioWithGemini).toHaveBeenCalledTimes(1);
        expect(document.querySelector('[data-testid="video-subtitles-drawer"]')).not.toBeNull();
      });
    });
  });
});
