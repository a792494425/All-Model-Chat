import React from 'react';
import { Upload } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface LibraryDropOverlayProps {
  isDraggingOver: boolean;
}

export const LibraryDropOverlay: React.FC<LibraryDropOverlayProps> = ({ isDraggingOver }) => {
  const { t } = useI18n();

  if (!isDraggingOver) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-50 bg-[var(--theme-bg-accent)]/10 backdrop-blur-xs border-2 border-dashed border-[var(--theme-accent)] flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-100">
      <div className="p-4 rounded-full bg-[var(--theme-bg-primary)] text-[var(--theme-accent)] shadow-xl mb-3">
        <Upload size={32} strokeWidth={2} />
      </div>
      <span className="text-base font-semibold text-[var(--theme-text-primary)]">{t('libraryDropOverlay')}</span>
    </div>
  );
};
