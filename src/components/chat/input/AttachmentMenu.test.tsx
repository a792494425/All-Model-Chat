import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { setupProviderTestRenderer } from '@/test/render/providerRenderer';
import { ChatInputActionsContext } from './ChatInputContext';
import { AttachmentMenu } from './AttachmentMenu';
import { createChatInputActionsContextValue } from '@/test/chat-input/contextFixtures';

describe('AttachmentMenu', () => {
  const renderer = setupProviderTestRenderer();

  it('hides audio recorder option for Gemma models', () => {
    const value = createChatInputActionsContextValue({
      currentModelId: 'gemma-4-31b-it',
    });

    act(() => {
      renderer.render(
        <ChatInputActionsContext.Provider value={value}>
          <AttachmentMenu />
        </ChatInputActionsContext.Provider>,
      );
    });

    const trigger = renderer.container.querySelector<HTMLButtonElement>('button[aria-haspopup="true"]')!;
    expect(trigger).not.toBeNull();

    act(() => {
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const menuItems = Array.from(document.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]'));
    const itemLabels = menuItems.map((b) => b.textContent ?? '');
    // In zh it's "录音", in en it's "Record Audio"
    const hasRecorder = itemLabels.some((text) => text.includes('录音') || text.toLowerCase().includes('record'));
    expect(hasRecorder).toBe(false);
  });

  it('shows audio recorder option for Gemini text models', () => {
    const value = createChatInputActionsContextValue({
      currentModelId: 'gemini-3.7-flash',
    });

    act(() => {
      renderer.render(
        <ChatInputActionsContext.Provider value={value}>
          <AttachmentMenu />
        </ChatInputActionsContext.Provider>,
      );
    });

    const trigger = renderer.container.querySelector<HTMLButtonElement>('button[aria-haspopup="true"]')!;
    expect(trigger).not.toBeNull();

    act(() => {
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const menuItems = Array.from(document.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]'));
    const itemLabels = menuItems.map((b) => b.textContent ?? '');
    const hasRecorder = itemLabels.some((text) => text.includes('录音') || text.toLowerCase().includes('record'));
    expect(hasRecorder).toBe(true);
  });

  it('shows library option and triggers library action when clicked', () => {
    const value = createChatInputActionsContextValue({
      currentModelId: 'gemini-3.7-flash',
    });

    act(() => {
      renderer.render(
        <ChatInputActionsContext.Provider value={value}>
          <AttachmentMenu />
        </ChatInputActionsContext.Provider>,
      );
    });

    const trigger = renderer.container.querySelector<HTMLButtonElement>('button[aria-haspopup="true"]')!;
    expect(trigger).not.toBeNull();

    act(() => {
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const menuItems = Array.from(document.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]'));
    const libraryBtn = menuItems.find(
      (b) =>
        b.textContent?.includes('从资料库添加') ||
        b.textContent?.toLowerCase().includes('library') ||
        b.textContent?.includes('资料库') ||
        b.textContent?.includes('資料庫'),
    );
    expect(libraryBtn).toBeDefined();

    act(() => {
      libraryBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(value.onAttachmentAction).toHaveBeenCalledWith('library');
  });
});
