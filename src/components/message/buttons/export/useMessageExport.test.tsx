import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '@/types';
import { renderHook } from '@/test/render/renderer';
import { useMessageExport } from './useMessageExport';

const generateSnapshotPng = vi.fn();
const prepareElementForExport = vi.fn(async (element: HTMLElement) => element.cloneNode(true) as HTMLElement);
const exportHtmlStringAsFile = vi.fn();
const exportTextStringAsFile = vi.fn();
const buildHtmlDocument = vi.fn(async (_args?: any) => '<html></html>');
const buildTextDocument = vi.fn((_args?: any) => 'message txt');

vi.mock('@/utils/export/runtime', () => ({
  buildMessageExportFilenameBase: vi.fn(() => 'message-export'),
  createExportDateMeta: vi.fn(() => ({ dateStr: '2026-05-09 10:00', isoDate: '2026-05-09' })),
  loadExportRuntime: vi.fn(async () => ({
    generateSnapshotPng,
    prepareElementForExport,
    exportHtmlStringAsFile,
    exportTextStringAsFile,
    buildHtmlDocument,
    buildTextDocument,
  })),
}));

const message: ChatMessage = {
  id: 'message-123456',
  role: 'model',
  content: 'hello',
  timestamp: new Date('2026-05-09T02:00:00.000Z'),
};

describe('useMessageExport', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    generateSnapshotPng.mockReset();
    generateSnapshotPng.mockResolvedValue(undefined);
    prepareElementForExport.mockClear();
    exportHtmlStringAsFile.mockClear();
    exportTextStringAsFile.mockClear();
    buildHtmlDocument.mockClear();
    buildTextDocument.mockClear();
  });

  it('does not report PNG success when snapshot generation cannot download the image', async () => {
    document.body.innerHTML = `
      <div data-message-id="message-123456">
        <div class="message-content-container">hello</div>
      </div>
    `;
    generateSnapshotPng.mockResolvedValueOnce(false);
    const onSuccess = vi.fn();

    const { result, unmount } = renderHook(() =>
      useMessageExport({
        message,
        themeId: 'pearl',
      }),
    );

    await act(async () => {
      await result.current.handleExport('png', onSuccess);
    });

    expect(onSuccess).not.toHaveBeenCalled();
    unmount();
  });

  it('exports PNG with message content only and omits title, time, and model header metadata', async () => {
    document.body.innerHTML = `
      <div data-message-id="message-123456">
        <div class="message-content-container">hello content</div>
      </div>
    `;
    generateSnapshotPng.mockResolvedValueOnce(true);
    const onSuccess = vi.fn();

    const { result, unmount } = renderHook(() =>
      useMessageExport({
        message,
        sessionTitle: 'My Chat Session',
        themeId: 'pearl',
      }),
    );

    await act(async () => {
      await result.current.handleExport('png', onSuccess);
    });

    expect(generateSnapshotPng).toHaveBeenCalledTimes(1);
    const [, , , headerConfig] = generateSnapshotPng.mock.calls[0];
    expect(headerConfig).toBeNull();
    expect(onSuccess).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('exports TXT with message content and thoughts', async () => {
    const messageWithThoughts: ChatMessage = {
      ...message,
      content: 'Here is the code',
      thoughts: 'Thinking steps...',
    };
    const onSuccess = vi.fn();

    const { result, unmount } = renderHook(() =>
      useMessageExport({
        message: messageWithThoughts,
        themeId: 'pearl',
      }),
    );

    await act(async () => {
      await result.current.handleExport('txt', onSuccess);
    });

    expect(buildTextDocument).toHaveBeenCalledTimes(1);
    const passedMessages = buildTextDocument.mock.calls[0][0].messages;
    expect(passedMessages).toHaveLength(1);
    expect(passedMessages[0].content).toBe('Here is the code');
    expect(passedMessages[0].thoughts).toBe('Thinking steps...');
    expect(exportTextStringAsFile).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('exports HTML with sessionTitle as document title', async () => {
    document.body.innerHTML = `
      <div data-message-id="message-123456">
        <div class="message-content-container"><p>hello world</p></div>
      </div>
    `;
    const onSuccess = vi.fn();

    const { result, unmount } = renderHook(() =>
      useMessageExport({
        message,
        sessionTitle: 'My Technical Document',
        themeId: 'pearl',
      }),
    );

    await act(async () => {
      await result.current.handleExport('html', onSuccess);
    });

    expect(buildHtmlDocument).toHaveBeenCalledTimes(1);
    expect(buildHtmlDocument.mock.calls[0]![0].title).toBe('My Technical Document');
    expect(exportHtmlStringAsFile).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);

    unmount();
  });
});
