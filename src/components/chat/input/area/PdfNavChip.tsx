import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { SUGGESTION_CHIP_ACTIVE_CLASS, SUGGESTION_CHIP_CLASS } from '@/constants/designTokens';
import { SuggestionIcon } from './SuggestionIcon';
import { useChatStore } from '@/stores/chatStore';
import { sessionHasPdfFiles } from '@/utils/pdf-nav/sessionPdfFiles';

interface PdfNavChipProps {
  isPdfNavEnabled: boolean;
  onToggle: () => void;
}

/**
 * "PDF 导航" preset chip in the suggestion row above the input. Toggle chip in
 * the same family as 目标框选 / 箭头标注: flipping it on enables the PDF Locate
 * Protocol and opens the side navigation panel.
 */
const PdfNavChipComponent: React.FC<PdfNavChipProps> = ({ isPdfNavEnabled, onToggle }) => {
  const { t } = useI18n();
  const hasPdfFiles = useChatStore((state) => sessionHasPdfFiles(state.selectedFiles, state.activeMessages));
  const title = hasPdfFiles ? t('pdfNavLabel') : `${t('pdfNavLabel')} · ${t('pdfNavNoPdfHint')}`;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={isPdfNavEnabled ? SUGGESTION_CHIP_ACTIVE_CLASS : SUGGESTION_CHIP_CLASS}
      aria-label={t('pdfNavLabel')}
      aria-pressed={isPdfNavEnabled}
      title={title}
      data-testid="pdf-nav-chip"
    >
      <SuggestionIcon iconName="BookOpenText" />
      <span>{t('pdfNavLabel')}</span>
      <span aria-hidden="true" className="h-1 w-1 flex-shrink-0 rounded-full bg-current opacity-50" />
    </button>
  );
};

export const PdfNavChip = React.memo(PdfNavChipComponent);
