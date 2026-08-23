import React from 'react';
import { ArrowUp, CornerDownLeft, X } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { IconStop } from '@/components/icons';
import { CHAT_INPUT_BUTTON_CLASS } from '@/constants/buttonClasses';
import { useChatStore } from '@/stores/chatStore';
import {
  useChatInputActionsContext,
  useChatInputComposerStatusContext,
} from '@/components/chat/input/ChatInputContext';
import { interpolate } from '@/i18n/interpolate';

const SEND_BUTTON_ICON_SIZE = 18;
const QUEUE_BUTTON_ICON_SIZE = 17;
const STOP_ICON_SIZE = 10;
const SEND_BUTTON_SIZE_CLASS = '!h-[34px] !w-[34px]';

export const SendControls: React.FC = () => {
  const { isLoading, isWaitingForUpload } = useChatInputActionsContext();
  const { canSend, canQueueMessage, queuedCount, onQueueMessage, onCancelPendingUploadSend } =
    useChatInputComposerStatusContext();
  const isEditing = !!useChatStore((state) => state.editingMessageId);
  const onStopGenerating = useChatStore((state) => state.stopGenerating);
  const onCancelEdit = useChatStore((state) => state.cancelEdit);
  const { t } = useI18n();

  const isStop = isLoading || isWaitingForUpload;
  const isDisabled = !isStop && !canSend;

  let label = t('sendMessageAria');
  let title = t('sendMessageTitle');

  if (isStop) {
    label = isWaitingForUpload ? t('cancelPendingUploadSendAria') : t('stopGeneratingAria');
    title = isWaitingForUpload ? t('cancelPendingUploadSendTitle') : t('stopGeneratingTitle');
  } else if (isEditing) {
    label = t('updateMessageAria');
    title = t('updateMessageTitle');
  }

  const handlePrimaryClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isStop) {
      e.preventDefault();
      e.stopPropagation();
      if (isWaitingForUpload) {
        onCancelPendingUploadSend();
      } else {
        onStopGenerating();
      }
    }
  };

  return (
    <div className="flex items-center">
      {canQueueMessage && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onQueueMessage?.();
          }}
          className={`${CHAT_INPUT_BUTTON_CLASS} bg-transparent hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-icon-settings)] relative`}
          aria-label={t('queueMessageAria')}
          title={queuedCount >= 20 ? t('queuedSubmissionLimitReached') : t('queueMessageTitle')}
          disabled={!canQueueMessage}
        >
          <CornerDownLeft size={QUEUE_BUTTON_ICON_SIZE} strokeWidth={2} />
          {queuedCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--theme-bg-accent)] px-1 text-[10px] font-semibold text-[var(--theme-text-accent)]"
              title={interpolate(t('queuedSubmissionCountTitle'), { count: queuedCount })}
              aria-label={interpolate(t('queuedSubmissionCountTitle'), { count: queuedCount })}
            >
              {queuedCount}
            </span>
          )}
        </button>
      )}

      {isEditing && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCancelEdit();
          }}
          className={`${CHAT_INPUT_BUTTON_CLASS} bg-transparent hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-icon-settings)]`}
          aria-label={t('cancelEditAria')}
          title={t('cancelEditTitle')}
        >
          <X size={SEND_BUTTON_ICON_SIZE} strokeWidth={2} />
        </button>
      )}

      <button
        type={isStop ? 'button' : 'submit'}
        onClick={handlePrimaryClick}
        disabled={!isStop && isDisabled}
        className={`${CHAT_INPUT_BUTTON_CLASS} ${SEND_BUTTON_SIZE_CLASS} !rounded-full bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-white disabled:opacity-40 relative overflow-hidden transition-colors duration-150`}
        aria-label={label}
        title={title}
      >
        {isStop ? <IconStop size={STOP_ICON_SIZE} /> : <ArrowUp size={SEND_BUTTON_ICON_SIZE} strokeWidth={2} />}
      </button>
    </div>
  );
};
