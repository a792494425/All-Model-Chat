import React, { useRef } from 'react';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { SETTINGS_INPUT_CLASS } from '@/constants/formClasses';
import { logService } from '@/services/logService';
import { ProviderAvatar } from './ProviderAvatar';

export interface ProviderImageUploadProps {
  value?: string;
  onChange: (nextIcon: string) => void;
  name?: string;
}

const resizeImageToDataUrl = (file: File, maxSize = 128): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        resolve(result);
      };
      reader.onerror = (caughtError) => reject(caughtError);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png', 0.9));
      };
      img.onerror = () => {
        resolve(event.target?.result as string);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = (caughtError) => reject(caughtError);
    reader.readAsDataURL(file);
  });
};

export const ProviderImageUpload: React.FC<ProviderImageUploadProps> = ({ value, onChange, name = 'Custom' }) => {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await resizeImageToDataUrl(file);
      onChange(dataUrl);
    } catch (caughtError) {
      logService.error('Failed to read image file:', caughtError);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const isDataUrl = Boolean(value?.startsWith('data:image/'));

  return (
    <div className="space-y-2 p-3 rounded-xl border border-[var(--theme-border-secondary)]/50 bg-[var(--theme-bg-secondary)]/30">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        onChange={handleFileChange}
        className="hidden"
        data-testid="provider-image-file-input"
      />

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full border border-[var(--theme-border-secondary)]/60 flex items-center justify-center overflow-hidden bg-[var(--theme-bg-tertiary)]/60 shrink-0">
          {value ? (
            <ProviderAvatar name={name} icon={value} size={40} />
          ) : (
            <ImageIcon size={18} className="text-[var(--theme-text-secondary)]/70" />
          )}
        </div>

        <div className="flex items-center gap-2 flex-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg border border-[var(--theme-border-secondary)]/60 bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] text-xs font-medium text-[var(--theme-text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload size={13} />
            <span>{t('thirdPartyUploadIcon')}</span>
          </button>

          {value ? (
            <button
              type="button"
              onClick={() => onChange('')}
              className="px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
              <span>{t('thirdPartyRemoveIcon')}</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-1">
        <input
          type="text"
          value={isDataUrl ? '' : value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isDataUrl ? t('thirdPartyIconUploadedLocal') : t('thirdPartyIconUrlPlaceholder')}
          disabled={isDataUrl}
          className={`w-full px-3 py-1.5 text-xs rounded-lg border ${SETTINGS_INPUT_CLASS} ${
            isDataUrl ? 'opacity-60 bg-[var(--theme-bg-tertiary)]/40 cursor-not-allowed' : ''
          }`}
        />
        <p className="text-[10px] text-[var(--theme-text-secondary)]/70 pl-0.5">{t('thirdPartyUploadIconHint')}</p>
      </div>
    </div>
  );
};
