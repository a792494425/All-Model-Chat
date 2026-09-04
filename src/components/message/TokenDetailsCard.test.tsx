import { act } from 'react';
import { setupTestRenderer } from '@/test/render/renderer';
import { describe, expect, it, beforeEach } from 'vitest';
import { useSettingsStore } from '@/stores/settingsStore';
import type { SupportedLanguage } from '@/i18n/languageRegistry';
import { TokenDetailsCard } from './TokenDetailsCard';
import type { ChatMessage } from '@/types';

const message: ChatMessage = {
  id: 'message-1',
  role: 'model',
  content: 'Hello',
  timestamp: new Date('2026-04-17T00:00:00.000Z'),
  promptTokens: 120,
  cachedPromptTokens: 40,
  toolUsePromptTokens: 12,
  completionTokens: 80,
  thoughtTokens: 7,
  totalTokens: 219,
  cumulativeTotalTokens: 5000,
};

describe('TokenDetailsCard', () => {
  const renderer = setupTestRenderer();

  beforeEach(() => {
    useSettingsStore.setState({ language: 'en' as SupportedLanguage });
  });

  it('renders usage segments with exact counts', () => {
    act(() => {
      renderer.root.render(
        <TokenDetailsCard
          message={message}
          modelTps={42.1}
          endToEndTps={30.5}
          elapsedSeconds={2.5}
          ttftSeconds={0.32}
        />,
      );
    });

    const text = renderer.container.textContent ?? '';
    expect(text).toContain('219');
    expect(text).toContain('42.1 t/s');
    expect(text).toContain('30.5 t/s');
    expect(text).toContain('0.32s');
    expect(text).toContain('2.5s');
    expect(text).toContain('5,000');
  });

  it('omits rows without data', () => {
    act(() => {
      renderer.root.render(
        <TokenDetailsCard message={{ ...message, thoughtTokens: undefined, toolUsePromptTokens: undefined }} />,
      );
    });

    const text = renderer.container.textContent ?? '';
    expect(text).not.toContain('0.32s');
    expect(text).not.toContain('t/s');
  });
});
