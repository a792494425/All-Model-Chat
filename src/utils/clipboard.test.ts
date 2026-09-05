import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copyTextToClipboard } from './clipboard';

describe('copyTextToClipboard', () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
      writable: true,
    });
  });

  it('returns false when text is empty', async () => {
    const result = await copyTextToClipboard('');
    expect(result).toBe(false);
  });

  it('uses navigator.clipboard.writeText when available and resolves successfully', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    const result = await copyTextToClipboard('hello world');
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('hello world');
  });

  it('falls back to execCommand when navigator.clipboard.writeText rejects', async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    const execCommandMock = vi.fn().mockReturnValue(true);
    document.execCommand = execCommandMock;

    const result = await copyTextToClipboard('fallback text');
    expect(result).toBe(true);
    expect(execCommandMock).toHaveBeenCalledWith('copy');
  });

  it('falls back to execCommand when navigator.clipboard is undefined', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const execCommandMock = vi.fn().mockReturnValue(true);
    document.execCommand = execCommandMock;

    const result = await copyTextToClipboard('fallback without clipboard');
    expect(result).toBe(true);
    expect(execCommandMock).toHaveBeenCalledWith('copy');
  });

  it('supports custom targetDoc for iframe/shadow document fallback', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const mockBody = { appendChild: vi.fn(), removeChild: vi.fn() };
    const mockEl = { style: {}, value: '', select: vi.fn(), remove: vi.fn() };
    const customDoc = {
      createElement: vi.fn().mockReturnValue(mockEl),
      execCommand: vi.fn().mockReturnValue(true),
      body: mockBody,
    } as unknown as Document;

    const result = await copyTextToClipboard('targetDoc text', customDoc);
    expect(result).toBe(true);
    expect(customDoc.createElement).toHaveBeenCalledWith('textarea');
    expect(mockEl.value).toBe('targetDoc text');
    expect(mockBody.appendChild).toHaveBeenCalledWith(mockEl);
    expect(mockEl.select).toHaveBeenCalled();
    expect(customDoc.execCommand).toHaveBeenCalledWith('copy');
    expect(mockEl.remove).toHaveBeenCalled();
  });

  it('returns false when both clipboard and execCommand fail', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockRejectedValue(new Error('Failed')),
      },
      configurable: true,
      writable: true,
    });

    document.execCommand = vi.fn().mockReturnValue(false);

    const result = await copyTextToClipboard('will fail');
    expect(result).toBe(false);
  });
});
