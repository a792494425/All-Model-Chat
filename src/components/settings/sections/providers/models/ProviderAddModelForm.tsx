import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { SETTINGS_INPUT_CLASS } from '@/constants/formClasses';

interface ProviderAddModelFormProps {
  isOpen: boolean;
  onClose: () => void;
  onAddModel: (id: string, name: string) => void;
}

export const ProviderAddModelForm: React.FC<ProviderAddModelFormProps> = ({ isOpen, onClose, onAddModel }) => {
  const { t } = useI18n();
  const [newModelId, setNewModelId] = useState('');
  const [newModelName, setNewModelName] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    const trimmedId = newModelId.trim();
    if (!trimmedId) return;
    onAddModel(trimmedId, newModelName.trim());
    setNewModelId('');
    setNewModelName('');
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && newModelId.trim()) {
      event.preventDefault();
      handleConfirm();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="p-3 rounded-xl border border-[var(--theme-border-focus)]/50 bg-[var(--theme-bg-secondary)]/30 space-y-2.5 animate-in fade-in duration-150"
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between text-xs font-semibold text-[var(--theme-text-primary)]">
        <span>{t('thirdPartyAddCustomModel') || 'Add Custom Model'}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
        >
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="text"
          value={newModelId}
          onChange={(e) => setNewModelId(e.target.value)}
          placeholder={t('thirdPartyCustomModelIdPlaceholder') || 'Model ID (e.g. gpt-4o)'}
          className={`p-2 rounded-lg border text-xs font-mono ${SETTINGS_INPUT_CLASS}`}
          autoFocus
        />
        <input
          type="text"
          value={newModelName}
          onChange={(e) => setNewModelName(e.target.value)}
          placeholder={t('thirdPartyCustomModelNamePlaceholder') || 'Display Name (optional)'}
          className={`p-2 rounded-lg border text-xs ${SETTINGS_INPUT_CLASS}`}
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1 text-xs rounded-lg text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
        >
          {t('cancel') || 'Cancel'}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!newModelId.trim()}
          className="px-3 py-1 text-xs rounded-lg bg-[var(--theme-border-focus)] text-white disabled:opacity-50 cursor-pointer"
        >
          {t('add') || 'Add'}
        </button>
      </div>
    </div>
  );
};
