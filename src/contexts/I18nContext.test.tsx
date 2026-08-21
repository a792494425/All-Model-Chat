import { act } from 'react';
import { setupTestRenderer } from '@/test/render/renderer';
import { describe, expect, it } from 'vitest';
import { setupStoreStateReset } from '@/test/stores/reset';
import { useSettingsStore } from '@/stores/settingsStore';
import type { SupportedLanguage } from '@/i18n/languageRegistry';
import { I18nProvider, useI18n } from './I18nContext';

const TranslationProbe = () => {
  const { t } = useI18n();
  return <div data-testid="translation-probe">{t('newChat')}</div>;
};

describe('I18nContext', () => {
  const renderer = setupTestRenderer();
  setupStoreStateReset();

  const renderWithLanguage = (language: SupportedLanguage = 'en') => {
    act(() => {
      useSettingsStore.setState({ language: language as SupportedLanguage });
      renderer.root.render(
        <I18nProvider>
          <TranslationProbe />
        </I18nProvider>,
      );
    });
  };

  it('updates translated text when the language in the settings store changes', () => {
    renderWithLanguage('en');

    expect(renderer.container.querySelector('[data-testid="translation-probe"]')?.textContent).toBe('New Chat');

    act(() => {
      useSettingsStore.setState({ language: 'zh' as SupportedLanguage });
    });

    expect(renderer.container.querySelector('[data-testid="translation-probe"]')?.textContent).toBe('新聊天');

    act(() => {
      useSettingsStore.setState({ language: 'ja' as SupportedLanguage });
    });

    expect(renderer.container.querySelector('[data-testid="translation-probe"]')?.textContent).toBe('新しいチャット');
  });
});
