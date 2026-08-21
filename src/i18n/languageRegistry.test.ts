// src/i18n/languageRegistry.test.ts
import { describe, it, expect } from 'vitest';
import { SUPPORTED_LANGUAGES, APP_LANGUAGE_IDS, LANGUAGE_META, BROWSER_LANG_PREFIX_MAP } from './languageRegistry';

describe('languageRegistry', () => {
  it('exposes 3 pilot languages en/zh/ja', () => {
    expect([...SUPPORTED_LANGUAGES]).toEqual(['en', 'zh', 'ja']);
  });
  it('APP_LANGUAGE_IDS includes system', () => {
    expect([...APP_LANGUAGE_IDS]).toEqual(['en', 'zh', 'ja', 'system']);
  });
  it('LANGUAGE_META has nativeLabel for each language', () => {
    expect(LANGUAGE_META.ja.nativeLabel).toBe('日本語');
    expect(LANGUAGE_META.zh.nativeLabel).toBe('中文');
  });
  it('BROWSER_LANG_PREFIX_MAP resolves ja prefix', () => {
    expect(BROWSER_LANG_PREFIX_MAP['ja']).toBe('ja');
    expect(BROWSER_LANG_PREFIX_MAP['zh']).toBe('zh');
  });
});
