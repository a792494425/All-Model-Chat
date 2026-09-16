import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import type {
  ThirdPartyConnection,
  ThirdPartyTemplateId,
  ThirdPartyApiProtocol,
} from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { SETTINGS_INPUT_CLASS } from '@/constants/formClasses';
import {
  SETTINGS_PRIMARY_ACTION_BUTTON_CLASS,
  SETTINGS_SECONDARY_ACTION_BUTTON_CLASS,
} from '@/constants/buttonClasses';
import {
  createConnectionId,
  getThirdPartyTemplateDefaults,
} from '@/utils/thirdPartyApiProviders';
import { ProviderAvatar } from './ProviderAvatar';
import { ProviderImageUpload } from './ProviderImageUpload';

export interface ProviderCreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  existingConnections: ThirdPartyConnection[];
  onComplete: (connection: ThirdPartyConnection) => void;
  initialMode?: string;
  initialDuplicateSourceId?: string;
}

export const ProviderCreateDrawer: React.FC<ProviderCreateDrawerProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [icon, setIcon] = useState('');
  const [protocol, setProtocol] = useState<ThirdPartyApiProtocol>('openai-compatible');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName('Custom Provider');
    setNotes('');
    setIcon('');
    setProtocol('openai-compatible');
    setBaseUrl('');
    setApiKey('');
    setShowApiKey(false);
  }, [isOpen]);

  const handleSave = () => {
    const trimmedName = name.trim() || 'Custom Provider';
    const newId = createConnectionId();

    const customTemplateId: ThirdPartyTemplateId =
      protocol === 'anthropic' ? 'custom-anthropic' : 'custom-openai';
    const defaults = getThirdPartyTemplateDefaults(customTemplateId);

    const newConn: ThirdPartyConnection = {
      id: newId,
      name: trimmedName,
      templateId: customTemplateId,
      protocol,
      apiKey: apiKey.trim() || null,
      baseUrl: baseUrl.trim() || null,
      extraHeaders: {},
      modelId: defaults.modelId,
      models: defaults.models.map((m) => ({
        ...m,
        providerId: newId,
        connectionName: trimmedName,
      })),
      enabled: true,
      authOptional: false,
      icon: icon.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    onComplete(newConn);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="provider-create-drawer-title"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--theme-border-secondary)]/40 flex-shrink-0 bg-[var(--theme-bg-secondary)]/20">
          <div className="flex items-center gap-2.5">
            <ProviderAvatar
              name={name || 'Custom'}
              templateId={protocol === 'anthropic' ? 'custom-anthropic' : 'custom-openai'}
              icon={icon}
              size={32}
            />
            <div>
              <h3
                id="provider-create-drawer-title"
                className="text-sm font-semibold text-[var(--theme-text-primary)]"
              >
                {t('thirdPartyCustomModalTitle') || '添加自定义服务商'}
              </h3>
              <p className="text-[11px] text-[var(--theme-text-secondary)]/80">
                {t('thirdPartyCustomModalSubtitle') || '接入自建中转、OneAPI 或第三方兼容端点'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="p-1.5 rounded-lg text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3.5 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">
              {t('thirdPartyConnectionName') || '服务商名称'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className={`w-full px-3 py-2 text-xs rounded-xl border ${SETTINGS_INPUT_CLASS}`}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--theme-text-secondary)] flex items-center justify-between">
              <span>{t('thirdPartyConnectionNotes')}</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('thirdPartyConnectionNotesPlaceholder')}
              className={`w-full px-3 py-2 text-xs rounded-xl border ${SETTINGS_INPUT_CLASS}`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">
              {t('thirdPartySelectIcon')}
            </label>
            <ProviderImageUpload value={icon} onChange={setIcon} name={name || 'Custom'} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--theme-text-secondary)]">
              {t('thirdPartyConnectionProtocol') || '接口协议'}
            </label>
            <div className="flex gap-1.5">
              {(['openai-compatible', 'anthropic', 'openai-responses'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProtocol(p)}
                  className={`flex-1 py-1.5 px-2 text-[11px] rounded-xl border transition-all cursor-pointer truncate ${
                    protocol === p
                      ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] border-[var(--theme-border-focus)] font-semibold shadow-xs'
                      : 'bg-[var(--theme-bg-tertiary)]/50 text-[var(--theme-text-secondary)] border-transparent hover:text-[var(--theme-text-primary)]'
                  }`}
                >
                  {p === 'anthropic'
                    ? 'Anthropic'
                    : p === 'openai-responses'
                      ? 'Responses'
                      : 'OpenAI 兼容'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="provider-drawer-baseurl" className="text-xs font-semibold text-[var(--theme-text-secondary)]">
              {t('thirdPartyApiBaseUrl') || 'API 地址 (Base URL)'}
            </label>
            <input
              id="provider-drawer-baseurl"
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              className={`w-full px-3 py-2 text-xs font-mono rounded-xl border ${SETTINGS_INPUT_CLASS}`}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="provider-drawer-apikey" className="text-xs font-semibold text-[var(--theme-text-secondary)]">
              {t('thirdPartyApiKey') || 'API 密钥'}
            </label>
            <div className="relative flex items-center">
              <input
                id="provider-drawer-apikey"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className={`w-full px-3 pr-9 py-2 text-xs font-mono rounded-xl border ${SETTINGS_INPUT_CLASS}`}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                aria-label={showApiKey ? 'Hide key' : 'Show key'}
                className="absolute right-2.5 p-1 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] cursor-pointer"
              >
                {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-[var(--theme-border-secondary)]/40 flex-shrink-0 bg-[var(--theme-bg-secondary)]/25">
          <button
            type="button"
            onClick={onClose}
            className={SETTINGS_SECONDARY_ACTION_BUTTON_CLASS}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            data-testid="add-provider-confirm-button"
            onClick={handleSave}
            disabled={!name.trim()}
            className={`${SETTINGS_PRIMARY_ACTION_BUTTON_CLASS} disabled:opacity-40 cursor-pointer shadow-xs`}
          >
            {t('thirdPartyAddProviderAction') || '添加服务商'}
          </button>
        </div>
      </div>
    </div>
  );
};
