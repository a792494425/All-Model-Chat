import React, { type FormEvent } from 'react';
import { AlertCircle, Check, Loader2, Plus, X } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

export interface CloudFilesDirectInputProps {
  directInputId: string;
  setDirectInputId: (val: string) => void;
  isAddingDirect: boolean;
  directAddError: string | null;
  directAddSuccess: string | null;
  onSubmit: (e?: FormEvent) => void;
}

export const CloudFilesDirectInput: React.FC<CloudFilesDirectInputProps> = ({
  directInputId,
  setDirectInputId,
  isAddingDirect,
  directAddError,
  directAddSuccess,
  onSubmit,
}) => {
  const { t } = useI18n();

  return (
    <div className="px-5 py-3 border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] flex-shrink-0">
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={directInputId}
            onChange={(e) => setDirectInputId(e.target.value)}
            placeholder={t('cloudFilesInputPlaceholder')}
            className="w-full pl-3 pr-8 py-1.5 text-xs rounded-xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-mono"
          />
          {directInputId && (
            <button
              type="button"
              onClick={() => setDirectInputId('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={!directInputId.trim() || isAddingDirect}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-xs cursor-pointer flex-shrink-0"
        >
          {isAddingDirect ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} strokeWidth={2.5} />}
          <span>{t('cloudFilesVerifyAdd')}</span>
        </button>
      </form>

      {directAddError && (
        <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1">
          <AlertCircle size={13} />
          <span>{directAddError}</span>
        </p>
      )}
      {directAddSuccess && (
        <p className="text-xs text-emerald-500 mt-1.5 flex items-center gap-1">
          <Check size={13} />
          <span>{directAddSuccess}</span>
        </p>
      )}
    </div>
  );
};
