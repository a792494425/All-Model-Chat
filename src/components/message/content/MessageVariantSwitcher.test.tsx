import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { setupProviderTestRenderer } from '@/test/render/providerRenderer';
import { type ChatMessage } from '@/types';
import { MessageVariantSwitcher } from './MessageVariantSwitcher';

describe('MessageVariantSwitcher', () => {
  const renderer = setupProviderTestRenderer({ providers: { language: 'en' } });

  const dummyMessage: ChatMessage = {
    id: 'msg-1',
    role: 'model',
    content: 'Hello world',
    timestamp: new Date(),
  };

  it('renders nothing when variants is undefined or length <= 1', () => {
    act(() => {
      renderer.render(<MessageVariantSwitcher message={dummyMessage} />);
    });
    expect(renderer.container.querySelector('[data-testid="message-variant-switcher"]')).toBeNull();

    act(() => {
      renderer.render(
        <MessageVariantSwitcher
          message={{
            ...dummyMessage,
            variants: [dummyMessage],
            currentVariantIndex: 0,
          }}
        />,
      );
    });
    expect(renderer.container.querySelector('[data-testid="message-variant-switcher"]')).toBeNull();
  });

  it('renders variant switcher with correct current/total text and handles navigation', () => {
    const onSwitchVariant = vi.fn();
    const v1: ChatMessage = { ...dummyMessage, id: 'v1', content: 'V1' };
    const v2: ChatMessage = { ...dummyMessage, id: 'v2', content: 'V2' };
    const v3: ChatMessage = { ...dummyMessage, id: 'v3', content: 'V3' };

    act(() => {
      renderer.render(
        <MessageVariantSwitcher
          message={{
            ...dummyMessage,
            variants: [v1, v2, v3],
            currentVariantIndex: 1,
          }}
          onSwitchVariant={onSwitchVariant}
        />,
      );
    });

    const switcher = renderer.container.querySelector('[data-testid="message-variant-switcher"]');
    expect(switcher).not.toBeNull();
    expect(switcher?.textContent).toContain('2 / 3');

    const prevBtn = switcher?.querySelector<HTMLButtonElement>('button[aria-label="Previous version"]');
    const nextBtn = switcher?.querySelector<HTMLButtonElement>('button[aria-label="Next version"]');

    expect(prevBtn).not.toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    act(() => {
      prevBtn?.click();
    });
    expect(onSwitchVariant).toHaveBeenCalledWith('msg-1', 0);

    act(() => {
      nextBtn?.click();
    });
    expect(onSwitchVariant).toHaveBeenCalledWith('msg-1', 2);
  });

  it('disables previous button on first variant and next button on last variant', () => {
    const v1: ChatMessage = { ...dummyMessage, id: 'v1', content: 'V1' };
    const v2: ChatMessage = { ...dummyMessage, id: 'v2', content: 'V2' };

    // First variant (0 of 2)
    act(() => {
      renderer.render(
        <MessageVariantSwitcher
          message={{
            ...dummyMessage,
            variants: [v1, v2],
            currentVariantIndex: 0,
          }}
        />,
      );
    });

    let switcher = renderer.container.querySelector('[data-testid="message-variant-switcher"]');
    expect(switcher?.textContent).toContain('1 / 2');
    expect(switcher?.querySelector<HTMLButtonElement>('button[aria-label="Previous version"]')).toBeDisabled();
    expect(switcher?.querySelector<HTMLButtonElement>('button[aria-label="Next version"]')).not.toBeDisabled();

    // Last variant (1 of 2)
    act(() => {
      renderer.render(
        <MessageVariantSwitcher
          message={{
            ...dummyMessage,
            variants: [v1, v2],
            currentVariantIndex: 1,
          }}
        />,
      );
    });

    switcher = renderer.container.querySelector('[data-testid="message-variant-switcher"]');
    expect(switcher?.textContent).toContain('2 / 2');
    expect(switcher?.querySelector<HTMLButtonElement>('button[aria-label="Previous version"]')).not.toBeDisabled();
    expect(switcher?.querySelector<HTMLButtonElement>('button[aria-label="Next version"]')).toBeDisabled();
  });
});
