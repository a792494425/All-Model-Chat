import { CHAT_INPUT_MAX_WIDTH_CLASS } from '@/constants/layout';
import { COMPOSER_SHELL_RADIUS_CLASS } from '@/constants/designTokens';

interface ChatInputAreaLayoutParams {
  isFullscreen: boolean;
  isPipActive?: boolean;
  isAnimatingSend: boolean;
  isRecording: boolean;
  inputDisabled: boolean;
}

export const getChatInputAreaLayout = ({
  isFullscreen: _isFullscreen,
  isPipActive,
  isAnimatingSend,
  isRecording,
  inputDisabled,
}: ChatInputAreaLayoutParams) => {
  // inputDisabled only greys out the textarea; isUIBlocked additionally dims the
  // whole wrapper and is skipped during send/record animations so the user still
  // sees feedback while a request is in flight.
  const isUIBlocked = inputDisabled && !isAnimatingSend && !isRecording;

  // Partial expand (Cherry-style) keeps the composer inline — no fullscreen overlay.
  // isFullscreen now means "expanded to max(220px,50vh) inline" rather than fixed inset-0.
  const wrapperClass = `bg-transparent ${isUIBlocked ? 'opacity-30 pointer-events-none' : ''}`;

  const innerContainerClass = `mx-auto w-full ${!isPipActive ? CHAT_INPUT_MAX_WIDTH_CLASS : ''} px-2 sm:px-3 pt-0 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]`;

  const formClass = `relative ${isAnimatingSend ? 'form-send-animate' : ''}`;

  // Full static class strings so Tailwind JIT can detect radius utilities. Match Cherry's inputbar transition-all.
  const inputContainerClass = `flex flex-col gap-1.5 ${COMPOSER_SHELL_RADIUS_CLASS} border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)] px-3 py-1.5 sm:px-4 sm:py-2 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-200 ease-in-out focus-within:border-[var(--theme-border-focus)] focus-within:shadow-[0_8px_30px_rgba(0,0,0,0.08)] relative z-20`;

  const queuedSubmissionContainerClass = 'relative z-10 mx-5 mb-[-22px] -translate-y-1.5';
  const actionsContainerClass = 'flex items-center justify-between pt-1';

  return {
    isUIBlocked,
    wrapperClass,
    innerContainerClass,
    formClass,
    inputContainerClass,
    queuedSubmissionContainerClass,
    actionsContainerClass,
  };
};
