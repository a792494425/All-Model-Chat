// src/i18n/languageRegistry.ts
export const SUPPORTED_LANGUAGES = ['en', 'zh', 'ja'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const APP_LANGUAGE_IDS = [...SUPPORTED_LANGUAGES, 'system'] as const;
export type AppLanguage = (typeof APP_LANGUAGE_IDS)[number];

export const LANGUAGE_META: Record<SupportedLanguage, { label: string; nativeLabel: string; flag: string }> = {
  en: { label: 'English', nativeLabel: 'English', flag: '🇺🇸' },
  zh: { label: 'Chinese', nativeLabel: '中文', flag: '🇨🇳' },
  ja: { label: 'Japanese', nativeLabel: '日本語', flag: '🇯🇵' },
};

export const BROWSER_LANG_PREFIX_MAP: Record<string, SupportedLanguage> = {
  zh: 'zh',
  ja: 'ja',
};
