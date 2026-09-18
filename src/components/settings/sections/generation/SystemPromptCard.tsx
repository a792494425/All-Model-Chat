import React, { type MutableRefObject } from 'react';
import { Eraser, SquarePen } from 'lucide-react';
import { SETTINGS_INPUT_CLASS } from '@/constants/formClasses';
import { SMALL_ICON_BUTTON_CLASS } from '@/constants/buttonClasses';
import { SETTINGS_SECTION_CARD_CLASS, SETTINGS_SECTION_LABEL_CLASS } from '@/constants/designTokens';
import { useI18n } from '@/contexts/I18nContext';
import { TextEditorModal } from '@/components/modals/TextEditorModal';

const inputBaseClasses =
  'w-full p-2.5 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-offset-0 text-sm';

interface SystemPromptCardProps {
  localPrompt: string;
  setLocalPrompt: (prompt: string) => void;
  isSystemPromptSet: boolean;
  isSystemPromptExpanded: boolean;
  skipNextPromptBlurCommitRef: MutableRefObject<boolean>;
  commitPromptIfNeeded: () => void;
  handleOpenExpand: () => void;
  handleCloseExpand: () => void;
  handleSaveExpanded: (newPrompt: string) => void;
  handleClearPrompt: () => void;
}

export const SystemPromptCard: React.FC<SystemPromptCardProps> = ({
  localPrompt,
  setLocalPrompt,
  isSystemPromptSet,
  isSystemPromptExpanded,
  skipNextPromptBlurCommitRef,
  commitPromptIfNeeded,
  handleOpenExpand,
  handleCloseExpand,
  handleSaveExpanded,
  handleClearPrompt,
}) => {
  const { t } = useI18n();

  return (
    <>
      <div className={`${SETTINGS_SECTION_CARD_CLASS} space-y-3`} data-settings-item="models-system-prompt">
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="system-prompt-input"
            className="flex min-w-0 items-center gap-2 text-sm font-medium text-[var(--theme-text-primary)]"
          >
            <span className={SETTINGS_SECTION_LABEL_CLASS}>{t('settingsSystemPrompt')}</span>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium normal-case tracking-normal border transition-colors ${
                isSystemPromptSet
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] border-[var(--theme-border-secondary)]/50'
              }`}
            >
              {isSystemPromptSet ? t('settingsSystemPromptEnabled') : t('settingsSystemPromptUnset')}
            </span>
          </label>
          <div className="flex shrink-0 items-center gap-1">
            {isSystemPromptSet && (
              <button
                type="button"
                onClick={handleClearPrompt}
                className={`${SMALL_ICON_BUTTON_CLASS} flex h-8 w-8 items-center justify-center hover:text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]/10`}
                title={t('settingsClearSystemPrompt')}
                aria-label={t('settingsClearSystemPrompt')}
              >
                <Eraser size={14} />
              </button>
            )}
            <button
              type="button"
              onPointerDown={() => {
                skipNextPromptBlurCommitRef.current = true;
              }}
              onClick={handleOpenExpand}
              className={`${SMALL_ICON_BUTTON_CLASS} flex h-8 w-8 items-center justify-center hover:text-[var(--theme-text-link)]`}
              title={t('settingsExpandSystemPromptEditor')}
              aria-label={t('settingsExpandSystemPromptEditor')}
            >
              <SquarePen size={14} />
            </button>
          </div>
        </div>
        <textarea
          id="system-prompt-input"
          value={localPrompt}
          onChange={(event) => setLocalPrompt(event.target.value)}
          onBlur={() => {
            if (skipNextPromptBlurCommitRef.current) {
              skipNextPromptBlurCommitRef.current = false;
              return;
            }
            commitPromptIfNeeded();
          }}
          rows={3}
          className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS} resize-none font-mono text-xs sm:text-sm leading-relaxed min-h-[112px] no-scrollbar md:custom-scrollbar bg-[var(--theme-bg-input)]/50`}
          placeholder={t('chatBehaviorSystemPromptPlaceholder')}
          aria-label={t('settingsSystemPromptAria')}
        />
      </div>

      <TextEditorModal
        isOpen={isSystemPromptExpanded}
        onClose={handleCloseExpand}
        title={t('settingsSystemPrompt')}
        value={localPrompt}
        onChange={handleSaveExpanded}
        placeholder={t('chatBehaviorSystemPromptPlaceholder')}
        confirmLabel={t('settingsSaveAndClose')}
      />
    </>
  );
};
