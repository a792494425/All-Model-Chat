import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { setupProviderTestRenderer } from '@/test/render/providerRenderer';
import { TextSelectionToolbar } from './TextSelectionToolbar';

const createRect = (): DOMRect =>
  ({
    width: 50,
    height: 20,
    top: 100,
    left: 200,
    right: 250,
    bottom: 120,
    x: 200,
    y: 100,
    toJSON: () => ({}),
  }) as DOMRect;

const selectNode = (node: Node) => {
  const range = document.createRange();
  range.selectNode(node);
  range.getBoundingClientRect = () => createRect();

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);

  act(() => {
    document.dispatchEvent(new Event('selectionchange'));
  });
};

const flushAnimationFrame = async () => {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  });
};

describe('TextSelectionToolbar', () => {
  const renderer = setupProviderTestRenderer({ providers: { language: 'en' } });

  it('starts TTS with plain selected text even before markdown extraction finishes', async () => {
    const host = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = 'hello world';
    host.appendChild(strong);
    document.body.appendChild(host);

    const onTTS = vi.fn(async () => ({ url: 'blob:quick-tts' }));

    await act(async () => {
      renderer.render(
        <TextSelectionToolbar onQuote={vi.fn()} onTTS={onTTS} containerRef={host} />,
      );
    });

    selectNode(strong);

    const ttsButton = document.querySelector<HTMLButtonElement>('button[aria-label="Read Aloud (TTS)"]');
    expect(ttsButton).not.toBeNull();

    await act(async () => {
      ttsButton?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    });

    expect(onTTS).toHaveBeenCalledWith('hello world');
    expect(document.querySelector('[aria-label="Text selection audio player"]')).not.toBeNull();
  });

  it('keeps the audio toolbar visible if the selection collapses after TTS is clicked', async () => {
    const host = document.createElement('div');
    const paragraph = document.createElement('p');
    paragraph.textContent = 'read this aloud';
    host.appendChild(paragraph);
    document.body.appendChild(host);

    let resolveTts: ((value: { url: string }) => void) | undefined;
    const onTTS = vi.fn(
      () =>
        new Promise<{ url: string }>((resolve) => {
          resolveTts = resolve;
        }),
    );

    await act(async () => {
      renderer.render(
        <TextSelectionToolbar onQuote={vi.fn()} onTTS={onTTS} containerRef={host} />,
      );
    });

    selectNode(paragraph);

    const ttsButton = document.querySelector<HTMLButtonElement>('button[aria-label="Read Aloud (TTS)"]');
    expect(ttsButton).not.toBeNull();

    await act(async () => {
      ttsButton?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    });

    window.getSelection()?.removeAllRanges();
    act(() => {
      document.dispatchEvent(new Event('selectionchange'));
      document.dispatchEvent(new Event('mouseup'));
    });
    await flushAnimationFrame();

    expect(document.body.textContent).toContain('Generating Audio');

    await act(async () => {
      resolveTts?.({ url: 'blob:quick-tts' });
    });

    expect(document.querySelector('[aria-label="Text selection audio player"]')).not.toBeNull();
  });

  it('sends plain text to TTS after markdown extraction finishes', async () => {
    const host = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = 'hello world';
    host.appendChild(strong);
    document.body.appendChild(host);

    const onTTS = vi.fn(async () => ({ url: 'blob:quick-tts' }));

    await act(async () => {
      renderer.render(
        <TextSelectionToolbar onQuote={vi.fn()} onTTS={onTTS} containerRef={host} />,
      );
    });

    selectNode(strong);

    await vi.waitFor(() => {
      expect(document.querySelector('button[aria-label="Read Aloud (TTS)"]')).not.toBeNull();
    });
    await flushAnimationFrame();

    const ttsButton = document.querySelector<HTMLButtonElement>('button[aria-label="Read Aloud (TTS)"]');
    await act(async () => {
      ttsButton?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    });

    expect(onTTS).toHaveBeenCalledWith('hello world');
    expect(onTTS).not.toHaveBeenCalledWith('**hello world**');
  });
});
