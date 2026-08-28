import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { Globe } from 'lucide-react';
import { Select } from '@/components/shared/Select';

interface TranscribeLanguageSelectorProps {
  language: string;
  setLanguage: (lang: string) => void;
}

export const TranscribeLanguageSelector: React.FC<TranscribeLanguageSelectorProps> = ({
  language,
  setLanguage,
}) => {
  const { t } = useI18n();

  return (
    <Select
      id="transcribe-language-selector"
      label={t('transcribePrimaryLanguage')}
      hideLabel
      value={language}
      onChange={(e) => setLanguage(e.target.value)}
      className="mb-0"
      wrapperClassName="relative min-w-[130px] w-auto"
      direction="up"
      size="compact"
    >
      <option value="">
        <span className="flex items-center gap-2">
          <Globe size={14} className="text-[var(--theme-text-accent)] flex-shrink-0" />
          <span>{t('transcribeLangDetect')}</span>
        </span>
      </option>
      <option value="zh">
        <span className="flex items-center gap-2">
          <Globe size={14} className="text-[var(--theme-text-accent)] flex-shrink-0" />
          <span>{t('transcribeLangZh')}</span>
        </span>
      </option>
      <option value="en">
        <span className="flex items-center gap-2">
          <Globe size={14} className="text-[var(--theme-text-accent)] flex-shrink-0" />
          <span>{t('transcribeLangEn')}</span>
        </span>
      </option>
      <option value="ja">
        <span className="flex items-center gap-2">
          <Globe size={14} className="text-[var(--theme-text-accent)] flex-shrink-0" />
          <span>{t('transcribeLangJa')}</span>
        </span>
      </option>
      <option value="ko">
        <span className="flex items-center gap-2">
          <Globe size={14} className="text-[var(--theme-text-accent)] flex-shrink-0" />
          <span>{t('transcribeLangKo')}</span>
        </span>
      </option>
      <option value="yue">
        <span className="flex items-center gap-2">
          <Globe size={14} className="text-[var(--theme-text-accent)] flex-shrink-0" />
          <span>{t('transcribeLangYue')}</span>
        </span>
      </option>
      <option value="es">
        <span className="flex items-center gap-2">
          <Globe size={14} className="text-[var(--theme-text-accent)] flex-shrink-0" />
          <span>{t('transcribeLangEs')}</span>
        </span>
      </option>
      <option value="fr">
        <span className="flex items-center gap-2">
          <Globe size={14} className="text-[var(--theme-text-accent)] flex-shrink-0" />
          <span>{t('transcribeLangFr')}</span>
        </span>
      </option>
      <option value="de">
        <span className="flex items-center gap-2">
          <Globe size={14} className="text-[var(--theme-text-accent)] flex-shrink-0" />
          <span>{t('transcribeLangDe')}</span>
        </span>
      </option>
      <option value="ru">
        <span className="flex items-center gap-2">
          <Globe size={14} className="text-[var(--theme-text-accent)] flex-shrink-0" />
          <span>{t('transcribeLangRu')}</span>
        </span>
      </option>
      <option value="pt">
        <span className="flex items-center gap-2">
          <Globe size={14} className="text-[var(--theme-text-accent)] flex-shrink-0" />
          <span>{t('transcribeLangPt')}</span>
        </span>
      </option>
      <option value="it">
        <span className="flex items-center gap-2">
          <Globe size={14} className="text-[var(--theme-text-accent)] flex-shrink-0" />
          <span>{t('transcribeLangIt')}</span>
        </span>
      </option>
      <option value="ar">
        <span className="flex items-center gap-2">
          <Globe size={14} className="text-[var(--theme-text-accent)] flex-shrink-0" />
          <span>{t('transcribeLangAr')}</span>
        </span>
      </option>
      <option value="hi">
        <span className="flex items-center gap-2">
          <Globe size={14} className="text-[var(--theme-text-accent)] flex-shrink-0" />
          <span>{t('transcribeLangHi')}</span>
        </span>
      </option>
    </Select>
  );
};
