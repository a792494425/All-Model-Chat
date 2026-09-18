import React, { type RefObject } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { GHOST_PILL_CLASS } from './AskPanelContent';

const SEND_BUTTON_BG = 'bg-[#3964FE] hover:bg-[#3358e0] dark:bg-[#679EFE] dark:hover:bg-[#5a8de0]';

export interface AskPanelInputProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  question: string;
  isLoading: boolean;
  hasAnswer: boolean;
  handleTextareaInput: (e: React.ChangeEvent<HTMLTextAreaElement> | React.FormEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleQuick: (type: 'explain' | 'translate' | 'summarize') => void;
  handleSubmit: () => void;
  cancel: () => void;
  t: (key: string) => string;
}

export const AskPanelInput: React.FC<AskPanelInputProps> = ({
  textareaRef,
  question,
  isLoading,
  hasAnswer,
  handleTextareaInput,
  handleKeyDown,
  handleQuick,
  handleSubmit,
  cancel,
  t,
}) => {
  return (
    <div className="shrink-0 border-t border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]/60 p-2.5">
      {hasAnswer && (
        <div className="mb-2 flex flex-wrap gap-1">
          {(
            [
              ['explain', t('askExplain')],
              ['translate', t('askTranslate')],
              ['summarize', t('askSummarize')],
            ] as const
          ).map(([key, label]) => (
            <button key={key} onClick={() => handleQuick(key)} disabled={isLoading} className={GHOST_PILL_CLASS}>
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <TextareaAutosize
          ref={textareaRef as React.Ref<HTMLTextAreaElement>}
          value={question}
          onChange={handleTextareaInput}
          onKeyDown={handleKeyDown}
          minRows={1}
          maxRows={4}
          disabled={isLoading}
          placeholder={isLoading ? t('askThinking') : t('askPlaceholder')}
          className="flex-1 resize-none rounded-2xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)] px-3.5 py-2.5 text-sm text-[var(--theme-text-primary)] outline-none transition-colors placeholder:text-[var(--theme-text-tertiary)] focus:border-[var(--theme-border-focus)] disabled:cursor-not-allowed disabled:opacity-60 leading-relaxed"
        />
        {isLoading ? (
          <button
            onClick={cancel}
            className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full text-white transition-colors bg-[var(--theme-bg-danger)] hover:bg-[var(--theme-bg-danger-hover)]"
            aria-label={t('retryAndStopButtonTitle')}
            title={t('retryAndStopButtonTitle')}
            style={{ transform: 'translateY(-2px)' }}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
              <rect x="3" y="3" width="10" height="10" rx="3" fill="currentColor" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!question.trim()}
            className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${SEND_BUTTON_BG}`}
            aria-label={t('askSend')}
            style={{ transform: 'translateY(-2px)' }}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
              <path
                d="M8.3125 0.980183C8.66767 1.0531 8.97902 1.20418 9.2627 1.43233C9.48724 1.61297 9.73029 1.85793 9.97949 2.10714L14.707 6.83468L13.293 8.24874L9 3.95577V15.0417H7V3.95577L2.70703 8.24874L1.29297 6.83468L6.02051 2.10714C6.26971 1.85793 6.51277 1.61297 6.7373 1.43233C6.97662 1.23986 7.28445 1.04402 7.6875 0.980183C7.8973 0.947006 8.1031 0.95516 8.3125 0.980183Z"
                fill="currentColor"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
