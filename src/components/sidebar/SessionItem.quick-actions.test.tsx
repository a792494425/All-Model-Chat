import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { setupProviderTestRenderer } from '@/test/render/providerRenderer';
import { createChatSettings } from '@/test/data/factories';
import type { SavedChatSession } from '@/types';
import { SessionItem } from './SessionItem';

const makeSession = (id: string, isPinned = false): SavedChatSession => ({
  id,
  title: `Chat ${id}`,
  timestamp: Date.now(),
  messages: [],
  settings: createChatSettings(),
  isPinned,
});

describe('SessionItem quick actions and title mask', () => {
  const renderer = setupProviderTestRenderer({ providers: { language: 'en' } });

  it('renders quick pin button and toggles pin when clicked', () => {
    const onTogglePinSession = vi.fn();
    const session = makeSession('s-1', false);

    act(() => {
      renderer.render(
        <SessionItem
          session={session}
          onTogglePinSession={onTogglePinSession}
        />,
      );
    });

    const pinBtn = renderer.container.querySelector('button[title="Pin"]') as HTMLButtonElement;
    expect(pinBtn).not.toBeNull();
    pinBtn.click();
    expect(onTogglePinSession).toHaveBeenCalledWith('s-1');
  });

  it('renders quick unpin button when session is already pinned', () => {
    const onTogglePinSession = vi.fn();
    const session = makeSession('s-2', true);

    act(() => {
      renderer.render(
        <SessionItem
          session={session}
          onTogglePinSession={onTogglePinSession}
        />,
      );
    });

    const unpinBtn = renderer.container.querySelector('button[title="Unpin"]') as HTMLButtonElement;
    expect(unpinBtn).not.toBeNull();
    unpinBtn.click();
    expect(onTogglePinSession).toHaveBeenCalledWith('s-2');
  });

  it('applies fade-mask-x-r to the title for smooth edge fading', () => {
    const session = makeSession('s-3', false);

    act(() => {
      renderer.render(<SessionItem session={session} />);
    });

    const titleEl = renderer.container.querySelector('.fade-mask-x-r');
    expect(titleEl).not.toBeNull();
    expect(titleEl?.textContent).toBe('Chat s-3');
  });

  it('renders compact relative time in resting state and hides on hover', () => {
    // 5 minutes ago
    const session = {
      ...makeSession('s-4', false),
      timestamp: Date.now() - 5 * 60_000,
    };

    act(() => {
      renderer.render(<SessionItem session={session} />);
    });

    const timeEl = renderer.container.querySelector('[data-testid="session-relative-time"]');
    expect(timeEl).not.toBeNull();
    expect(timeEl?.textContent).toBe('5m');
    expect(timeEl?.className).toContain('group-hover:opacity-0');
  });
});
