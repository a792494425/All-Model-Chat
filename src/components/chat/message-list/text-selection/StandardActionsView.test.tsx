import { act } from 'react';
import { setupTestRenderer } from '@/test/render/renderer';
import { describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '@/stores/settingsStore';
import { StandardActionsView } from './StandardActionsView';

describe('StandardActionsView', () => {
  const renderer = setupTestRenderer();

  it('renders localized Chinese action labels', () => {
    useSettingsStore.setState({ language: 'zh' });

    act(() => {
      renderer.root.render(
        <StandardActionsView
          onQuote={vi.fn()}
          onInsert={vi.fn()}
          onCopy={vi.fn()}
          onSearch={vi.fn()}
          isCopied={false}
        />,
      );
    });

    expect(renderer.container.textContent).toContain('引用');
    expect(renderer.container.textContent).toContain('插入');
    expect(renderer.container.textContent).toContain('复制');
    expect(renderer.container.textContent).toContain('搜索');
  });

  it('renders Insert instead of Input in English', () => {
    useSettingsStore.setState({ language: 'en' });

    act(() => {
      renderer.root.render(
        <StandardActionsView
          onQuote={vi.fn()}
          onInsert={vi.fn()}
          onCopy={vi.fn()}
          onSearch={vi.fn()}
          isCopied={false}
        />,
      );
    });

    expect(renderer.container.textContent).toContain('Quote');
    expect(renderer.container.textContent).toContain('Insert');
    expect(renderer.container.textContent).toContain('Copy');
    expect(renderer.container.textContent).toContain('Search');
    expect(renderer.container.textContent).not.toContain('Input');
  });

  it('keeps selection action buttons free of scale transforms', () => {
    useSettingsStore.setState({ language: 'en' });

    act(() => {
      renderer.root.render(
        <StandardActionsView
          onQuote={vi.fn()}
          onInsert={vi.fn()}
          onCopy={vi.fn()}
          onSearch={vi.fn()}
          isCopied={false}
        />,
      );
    });

    const quoteButton = renderer.container.querySelector('button[aria-label="Quote"]');
    expect(quoteButton?.className).not.toContain('scale');
  });

  it('renders Ask action as the first button when onAsk is provided and groups buttons logically', () => {
    useSettingsStore.setState({ language: 'zh' });

    act(() => {
      renderer.root.render(
        <StandardActionsView
          onQuote={vi.fn()}
          onInsert={vi.fn()}
          onCopy={vi.fn()}
          onSearch={vi.fn()}
          onAsk={vi.fn()}
          onTTS={vi.fn()}
          isCopied={false}
        />,
      );
    });

    const buttons = renderer.container.querySelectorAll('button');
    expect(buttons[0]?.textContent).toBe('询问');
    expect(buttons[1]?.textContent).toBe('引用');
    expect(buttons[2]?.textContent).toBe('插入');
    expect(buttons[3]?.textContent).toBe('复制');
    expect(buttons[4]?.textContent).toBe('搜索');
    expect(buttons[5]?.textContent).toBe('TTS');

    // Only 2 group dividers: one after Ask, one between Edit group and Utility group
    const dividers = renderer.container.querySelectorAll('div.h-3\\.5');
    expect(dividers.length).toBe(2);
  });
});
