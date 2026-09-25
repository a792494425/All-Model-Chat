import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { ThirdPartyApiProtocol, ThirdPartyConnection } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { SETTINGS_INPUT_CLASS } from '@/constants/formClasses';
import {
  SETTINGS_PRIMARY_ACTION_BUTTON_CLASS,
  SETTINGS_SECONDARY_ACTION_BUTTON_CLASS,
  SMALL_ICON_DANGER_BUTTON_CLASS,
  SETTINGS_INLINE_ACTION_BUTTON_CLASS,
} from '@/constants/buttonClasses';
import { Select } from '@/components/shared/Select';
import { Toggle } from '@/components/shared/Toggle';
import { isForwardedThirdPartyExtraHeader } from '../../../../../shared/thirdPartyExtraHeaders';
import { ProviderAvatar } from './ProviderAvatar';
import { ProviderImageUpload } from './ProviderImageUpload';

interface ProviderEditDialogProps {
  isOpen: boolean;
  connection: ThirdPartyConnection;
  onClose: () => void;
  onSave: (updates: Partial<ThirdPartyConnection>) => void;
  onDelete?: () => void;
}

type HeaderRow = { id: string; name: string; value: string };

export const ProviderEditDialog: React.FC<ProviderEditDialogProps> = ({
  isOpen,
  connection,
  onClose,
  onSave,
  onDelete,
}) => {
  const { t } = useI18n();

  const [name, setName] = useState(connection.name);
  const [notes, setNotes] = useState(connection.notes ?? '');
  const [icon, setIcon] = useState(connection.icon ?? '');
  const [protocol, setProtocol] = useState<ThirdPartyApiProtocol>(connection.protocol);
  const [baseUrl, setBaseUrl] = useState(connection.baseUrl ?? '');
  const [authOptional, setAuthOptional] = useState(Boolean(connection.authOptional));
  const [headerRows, setHeaderRows] = useState<HeaderRow[]>(() =>
    Object.entries(connection.extraHeaders || {}).map(([headerKey, headerValue]) => ({
      id: `${headerKey}-${headerValue}-${Math.random()}`,
      name: headerKey,
      value: headerValue,
    })),
  );

  React.useEffect(() => {
    setName(connection.name);
    setNotes(connection.notes ?? '');
    setIcon(connection.icon ?? '');
    setProtocol(connection.protocol);
    setBaseUrl(connection.baseUrl ?? '');
    setAuthOptional(Boolean(connection.authOptional));
    setHeaderRows(
      Object.entries(connection.extraHeaders || {}).map(([headerKey, headerValue]) => ({
        id: `${headerKey}-${headerValue}-${Math.random()}`,
        name: headerKey,
        value: headerValue,
      })),
    );
  }, [connection]);

  if (!isOpen) return null;

  const handleSave = () => {
    const nextHeaders: Record<string, string> = {};
    for (const row of headerRows) {
      const headerKey = row.name.trim();
      const headerValue = row.value.trim();
      if (headerKey) {
        nextHeaders[headerKey] = headerValue;
      }
    }

    onSave({
      name: name.trim() || connection.name,
      protocol,
      baseUrl: baseUrl.trim() || null,
      authOptional,
      extraHeaders: nextHeaders,
      icon: icon.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)] p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-[var(--theme-border-secondary)]/40 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ProviderAvatar name={name || connection.name} templateId={connection.templateId} icon={icon} size={22} />
            <h3 className="text-base font-semibold text-[var(--theme-text-primary)]">{t('settingsEditProvider')}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-secondary)]">
              {t('thirdPartyConnectionName')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={`w-full p-2.5 rounded-lg border text-sm ${SETTINGS_INPUT_CLASS}`}
              placeholder="e.g. OpenRouter, Muse, DeepSeek..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-secondary)]">
              {t('thirdPartyConnectionNotes')}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={`w-full p-2.5 rounded-lg border text-sm ${SETTINGS_INPUT_CLASS}`}
              placeholder={t('thirdPartyConnectionNotesPlaceholder')}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-secondary)]">
              {t('thirdPartySelectIcon')}
            </label>
            <ProviderImageUpload value={icon} onChange={setIcon} name={name || connection.name} />
          </div>
          <Select
            id="edit-provider-protocol"
            label={t('thirdPartyConnectionProtocol')}
            value={protocol}
            onChange={(event) => setProtocol(event.target.value as ThirdPartyApiProtocol)}
          >
            <option value="openai-compatible">{t('thirdPartyProtocolOpenAI')}</option>
            <option value="openai-responses">{t('thirdPartyProtocolOpenAIResponses')}</option>
            <option value="anthropic">{t('thirdPartyProtocolAnthropic')}</option>
          </Select>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-secondary)]">
              {t('thirdPartyApiBaseUrl')}
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              className={`w-full p-2.5 rounded-lg border font-mono text-xs ${SETTINGS_INPUT_CLASS}`}
              placeholder="https://api.openai.com/v1"
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--theme-border-secondary)]/40 bg-[var(--theme-bg-secondary)]/30">
            <div>
              <div className="text-sm font-medium text-[var(--theme-text-primary)]">{t('thirdPartyAuthOptional')}</div>
              <div className="text-xs text-[var(--theme-text-secondary)] mt-0.5">{t('thirdPartyAuthOptionalHelp')}</div>
            </div>
            <Toggle
              checked={authOptional}
              onChange={() => setAuthOptional(!authOptional)}
              ariaLabel={t('thirdPartyAuthOptional')}
            />
          </div>
          <div className="space-y-2 pt-2 border-t border-[var(--theme-border-secondary)]/30">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-secondary)]">
                {t('thirdPartyAdvancedHeaders')}
              </label>
              <button
                type="button"
                className={SETTINGS_INLINE_ACTION_BUTTON_CLASS}
                onClick={() =>
                  setHeaderRows([...headerRows, { id: `header-${Date.now()}-${Math.random()}`, name: '', value: '' }])
                }
              >
                <Plus size={13} />
                <span>{t('thirdPartyAddHeader')}</span>
              </button>
            </div>

            {headerRows.length === 0 ? (
              <p className="text-xs text-[var(--theme-text-secondary)] italic">{t('thirdPartyNoCustomHeaders')}</p>
            ) : (
              <div className="space-y-2">
                {headerRows.map((row, index) => {
                  // Flag rows the upstream sanitizer would drop so the UI never
                  // implies a header is in effect when it is not.
                  const willBeForwarded = !row.name.trim() || isForwardedThirdPartyExtraHeader(row.name);

                  return (
                    <div key={row.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={row.name}
                          placeholder={t('thirdPartyHeaderName')}
                          aria-invalid={!willBeForwarded}
                          onChange={(event) => {
                            const updated = [...headerRows];
                            updated[index] = { ...updated[index], name: event.target.value };
                            setHeaderRows(updated);
                          }}
                          className={`flex-1 p-2 rounded-lg border text-xs font-mono ${SETTINGS_INPUT_CLASS}`}
                        />
                        <input
                          type="text"
                          value={row.value}
                          placeholder={t('thirdPartyHeaderValue')}
                          onChange={(event) => {
                            const updated = [...headerRows];
                            updated[index] = { ...updated[index], value: event.target.value };
                            setHeaderRows(updated);
                          }}
                          className={`flex-1 p-2 rounded-lg border text-xs font-mono ${SETTINGS_INPUT_CLASS}`}
                        />
                        <button
                          type="button"
                          className={SMALL_ICON_DANGER_BUTTON_CLASS}
                          onClick={() => setHeaderRows(headerRows.filter((_, rowIndex) => rowIndex !== index))}
                          aria-label={t('thirdPartyRemoveHeader')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {!willBeForwarded && (
                        <p className="text-[11px] text-[var(--theme-text-warning)]" role="status">
                          {t('thirdPartyHeaderNotForwarded')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--theme-border-secondary)]/40 flex-shrink-0">
          {onDelete ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete();
              }}
              className="flex items-center gap-1.5 text-xs text-[var(--theme-text-danger)] hover:underline cursor-pointer"
            >
              <Trash2 size={13} />
              <span>{t('thirdPartyDeleteProvider')}</span>
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className={SETTINGS_SECONDARY_ACTION_BUTTON_CLASS}>
              {t('cancel')}
            </button>
            <button type="button" onClick={handleSave} className={SETTINGS_PRIMARY_ACTION_BUTTON_CLASS}>
              {t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
