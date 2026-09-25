import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { Select } from '@/components/shared/Select';
import { normalizeTranscriptionLanguage } from '@/services/api/generation/audioApi';

interface TranscribeLanguageSelectorProps {
  language: string;
  setLanguage: (lang: string) => void;
}

/**
 * Values are the BCP-47 codes documented for Gemini 3.5 Transcribe; bare legacy
 * codes persisted from older versions are normalized at the API and UI layer.
 */
export const TranscribeLanguageSelector: React.FC<TranscribeLanguageSelectorProps> = ({ language, setLanguage }) => {
  const { t } = useI18n();
  const normalizedLanguage = normalizeTranscriptionLanguage(language) ?? '';

  const options: Array<{ value: string; label: string }> = [
    { value: 'cmn-Hans-CN', label: t('transcribeLangZh') },
    { value: 'yue-Hant-HK', label: t('transcribeLangYue') },
    { value: 'en-US', label: t('transcribeLangEn') },
    { value: 'ja-JP', label: t('transcribeLangJa') },
    { value: 'ko-KR', label: t('transcribeLangKo') },
    { value: 'es-419', label: t('transcribeLangEs') },
    { value: 'fr-FR', label: t('transcribeLangFr') },
    { value: 'de-DE', label: t('transcribeLangDe') },
    { value: 'ru-RU', label: t('transcribeLangRu') },
    { value: 'pt-BR', label: t('transcribeLangPt') },
    { value: 'it-IT', label: t('transcribeLangIt') },
    { value: 'ar-EG', label: t('transcribeLangAr') },
    { value: 'hi-IN', label: t('transcribeLangHi') },
  ];

  return (
    <Select
      id="transcribe-language-selector"
      label={t('transcribePrimaryLanguage')}
      hideLabel
      value={normalizedLanguage}
      onChange={(event) => setLanguage(event.target.value)}
      className="mb-0"
      wrapperClassName="relative w-full"
      direction="down"
      size="default"
    >
      <option value="">{t('transcribeLangDetect')}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
};
