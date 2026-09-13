import { describe, expect, it } from 'vitest';
import type { ChatSettings } from '@/types';
import { didFirstMessageSelectSuggestion, shouldShowChatSuggestions } from './chatInputSuggestionsVisibility';

describe('didFirstMessageSelectSuggestion', () => {
  it('returns false when there is no first user message and no relevant settings', () => {
    expect(didFirstMessageSelectSuggestion(null, null)).toBe(false);
    expect(didFirstMessageSelectSuggestion(undefined, undefined)).toBe(false);
  });

  it('returns false when first user message is normal chat without suggestion directives or active settings', () => {
    const message = { text: 'Hello, what is the weather today?' };
    const settings: Partial<ChatSettings> = {
      isVisualFormattingActive: false,
      isImageNavEnabled: false,
      isPdfNavEnabled: false,
      isVideoNavEnabled: false,
      isAudioNavEnabled: false,
      taskSuggestionMode: null,
    };
    expect(didFirstMessageSelectSuggestion(message, settings as ChatSettings)).toBe(false);
  });

  it('returns true when first user message contains Live Artifacts directive', () => {
    const message = {
      text: '请使用 Live Artifacts，将以下内容呈现为结构化、响应式的精美 HTML 卡片，并保留所有重要信息：\n\n帮我写一个贪吃蛇',
    };
    expect(didFirstMessageSelectSuggestion(message, null)).toBe(true);

    const legacyMessage = {
      text: '【Live Artifacts 现代化可视化排版指令】\n用户需求如下：\n分析代码',
    };
    expect(didFirstMessageSelectSuggestion(legacyMessage, null)).toBe(true);
  });

  it('returns true when first user message contains task directive', () => {
    const message = {
      text: '[Task Directive - translate]\nTranslate this text to English',
    };
    expect(didFirstMessageSelectSuggestion(message, null)).toBe(true);
  });

  it('returns true when settings indicate active visual formatting or navigation modes', () => {
    const plainMessage = { text: 'Analyze this document' };

    expect(didFirstMessageSelectSuggestion(plainMessage, { isVisualFormattingActive: true } as ChatSettings)).toBe(
      true,
    );
    expect(didFirstMessageSelectSuggestion(plainMessage, { isImageNavEnabled: true } as ChatSettings)).toBe(true);
    expect(didFirstMessageSelectSuggestion(plainMessage, { isPdfNavEnabled: true } as ChatSettings)).toBe(true);
    expect(didFirstMessageSelectSuggestion(plainMessage, { isVideoNavEnabled: true } as ChatSettings)).toBe(true);
    expect(didFirstMessageSelectSuggestion(plainMessage, { isAudioNavEnabled: true } as ChatSettings)).toBe(true);
    expect(didFirstMessageSelectSuggestion(plainMessage, { taskSuggestionMode: 'translate' } as ChatSettings)).toBe(
      true,
    );
  });
});

describe('shouldShowChatSuggestions', () => {
  it('returns false when permissions prohibit suggestions or composer is expanded', () => {
    expect(
      shouldShowChatSuggestions({
        canGenerateSuggestions: false,
        isExpanded: false,
        isSessionEmpty: true,
      }),
    ).toBe(false);

    expect(
      shouldShowChatSuggestions({
        canGenerateSuggestions: true,
        isExpanded: true,
        isSessionEmpty: true,
      }),
    ).toBe(false);
  });

  it('returns true for empty session when permitted and not expanded', () => {
    expect(
      shouldShowChatSuggestions({
        canGenerateSuggestions: true,
        isExpanded: false,
        isSessionEmpty: true,
        firstUserMessage: null,
      }),
    ).toBe(true);
  });

  it('returns false for non-empty session if first message did not select suggestion bar', () => {
    expect(
      shouldShowChatSuggestions({
        canGenerateSuggestions: true,
        isExpanded: false,
        isSessionEmpty: false,
        firstUserMessage: { text: 'Just a normal question' },
        currentChatSettings: {
          isVisualFormattingActive: false,
          isImageNavEnabled: false,
        } as ChatSettings,
      }),
    ).toBe(false);
  });

  it('returns true for non-empty session if first message selected suggestion bar', () => {
    expect(
      shouldShowChatSuggestions({
        canGenerateSuggestions: true,
        isExpanded: false,
        isSessionEmpty: false,
        firstUserMessage: {
          text: '请使用 Live Artifacts，将以下内容呈现为结构化、响应式的精美 HTML 卡片，并保留所有重要信息：\n\n设计卡片',
        },
        currentChatSettings: {
          isVisualFormattingActive: true,
        } as ChatSettings,
      }),
    ).toBe(true);
  });
});
