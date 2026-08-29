import { logService } from '@/services/logService';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, X, Loader2, AlertCircle, ChevronRight, Trash2 } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { toastError } from '@/stores/toastStore';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { useAudioRecorder } from '@/features/audio/useAudioRecorder';
import { useAudioAnalyser } from '@/features/audio/useAudioAnalyser';
import { AudioVisualizer } from '@/components/audio/AudioVisualizer';
import { RecorderControls } from '@/components/audio/RecorderControls';
import { Select } from '@/components/shared/Select';
import { MAX_RECORDING_SECONDS, RECORDING_DURATION_WARNING_SECONDS } from '@/hooks/core/useRecorder';
import { FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS } from '@/constants/focusClasses';
import { MODAL_CLOSE_BUTTON_CLASS } from '@/constants/buttonClasses';
import { SETTINGS_SECTION_LABEL_CLASS } from '@/constants/designTokens';
import { formatClockTime } from '@/utils/formatClockTime';
import { useI18n } from '@/contexts/I18nContext';
import { interpolate } from '@/i18n/interpolate';

interface AudioRecorderProps {
  onRecord: (file: File) => Promise<void>;
  onCancel: () => void;
}

const WARNING_BANNER_CLASS =
  'w-full rounded-md border border-[var(--theme-text-warning)]/35 bg-[var(--theme-bg-warning)] px-3 py-2 text-sm text-[var(--theme-text-warning)]';

const padTimePart = (value: number) => value.toString().padStart(2, '0');

/**
 * The recorded container is not always WebM: Safari falls through to audio/mp4,
 * so the extension has to follow the actual mime type instead of being assumed.
 */
const getRecordingExtension = (mimeType: string | null): string => {
  if (!mimeType) return 'webm';
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
};

const buildRecordingFileName = (mimeType: string | null): string => {
  const capturedAt = new Date();
  const timestamp = [
    capturedAt.getFullYear(),
    padTimePart(capturedAt.getMonth() + 1),
    padTimePart(capturedAt.getDate()),
  ].join('-');
  const clockTime = [
    padTimePart(capturedAt.getHours()),
    padTimePart(capturedAt.getMinutes()),
    padTimePart(capturedAt.getSeconds()),
  ].join('');

  return `recording-${timestamp}-${clockTime}.${getRecordingExtension(mimeType)}`;
};

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecord, onCancel }) => {
  const { t } = useI18n();
  const {
    viewState,
    isInitializing,
    isPaused,
    recordingTime,
    audioBlob,
    audioUrl,
    error,
    errorKind,
    recordedMimeType,
    hasHitDurationLimit,
    audioInputDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    stream,
    status,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    discardRecording,
  } = useAudioRecorder();

  const { analyser, isSilent } = useAudioAnalyser(stream);

  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false);

  // Start recording the microphone as soon as the recorder opens — no source
  // picker. The ref guard keeps effects/re-renders from re-triggering it.
  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (hasAutoStarted.current) return;
    hasAutoStarted.current = true;
    startRecording();
  }, [startRecording]);

  const handleSave = async () => {
    if (!audioBlob) return;
    setIsSaving(true);
    try {
      const file = new File([audioBlob], buildRecordingFileName(recordedMimeType), {
        type: audioBlob.type || 'audio/webm',
      });
      await onRecord(file);
    } catch (saveError) {
      logService.error('Failed to save audio recording.', saveError);
      toastError(t('audioRecorderFailedToSave'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRerecord = useCallback(() => {
    discardRecording();
    startRecording();
  }, [discardRecording, startRecording]);

  // Closing with captured audio in hand used to throw it away silently — a
  // stray backdrop click could destroy a long recording.
  const hasUnsavedAudio = recordingTime > 0 && (status !== 'idle' || Boolean(audioBlob));

  const requestClose = () => {
    if (hasUnsavedAudio) {
      setIsConfirmingDiscard(true);
      return;
    }
    onCancel();
  };

  const confirmDiscard = () => {
    setIsConfirmingDiscard(false);
    discardRecording();
    onCancel();
  };

  const shouldShowDevicePicker = viewState === 'idle' && audioInputDevices.length > 1;
  const isApproachingLimit = status === 'recording' && recordingTime >= RECORDING_DURATION_WARNING_SECONDS;

  return (
    <Modal
      isOpen={true}
      // While the discard confirmation is up, Esc/backdrop should step back into
      // the recorder rather than close it outright.
      onClose={isConfirmingDiscard ? () => setIsConfirmingDiscard(false) : requestClose}
      contentClassName="w-full max-w-md bg-[var(--theme-bg-primary)] rounded-xl shadow-2xl overflow-hidden"
      noPadding
    >
      <div className="flex items-center justify-between px-5 pt-4 pb-3 bg-[var(--theme-bg-primary)]">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--theme-text-primary)]">
          <Mic size={20} className="text-[var(--theme-text-tertiary)]" />
          {viewState === 'review' ? t('audioRecorderPreviewTitle') : t('audioRecorderTitle')}
        </h2>
        <button onClick={requestClose} aria-label={t('close')} className={MODAL_CLOSE_BUTTON_CLASS}>
          <X size={20} />
        </button>
      </div>

      {isConfirmingDiscard ? (
        <div className="px-5 pb-5 pt-2 space-y-4">
          <p className="text-sm font-semibold text-[var(--theme-text-primary)]">
            {t('audioRecorderDiscardConfirmTitle')}
          </p>
          <p className="text-sm text-[var(--theme-text-secondary)]">{t('audioRecorderDiscardConfirmMessage')}</p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsConfirmingDiscard(false)}
              className="px-4 py-2 text-sm font-medium text-[var(--theme-text-primary)] bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={confirmDiscard}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--theme-bg-danger)] hover:bg-[var(--theme-bg-danger-hover)] rounded-lg transition-colors"
            >
              <Trash2 size={16} />
              {t('audioRecorderDiscard')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="px-5 pb-5 pt-2 space-y-4">
            {error && (
              <div className="flex flex-col items-center text-[var(--theme-text-danger)] gap-2 mb-4 text-center">
                <AlertCircle size={32} />
                <p className="text-sm">{error}</p>
                {errorKind === 'permission' && (
                  <p className="text-xs text-[var(--theme-text-secondary)]">{t('audioRecorderPermissionHint')}</p>
                )}
              </div>
            )}

            {isApproachingLimit && !hasHitDurationLimit && (
              <div className={WARNING_BANNER_CLASS}>
                {interpolate(t('audioRecorderDurationLimitWarning'), {
                  limit: formatClockTime(MAX_RECORDING_SECONDS),
                })}
              </div>
            )}

            {hasHitDurationLimit && (
              <div className={WARNING_BANNER_CLASS}>
                {interpolate(t('audioRecorderDurationLimitReached'), {
                  limit: formatClockTime(MAX_RECORDING_SECONDS),
                })}
              </div>
            )}

            {isSilent && status === 'recording' && (
              <div className={WARNING_BANNER_CLASS}>{t('audioRecorderNoInputDetected')}</div>
            )}

            {viewState === 'idle' && (
              <div className="rounded-xl bg-[var(--theme-bg-tertiary)]/35 p-2 space-y-2">
                {shouldShowDevicePicker && (
                  <div className="px-1 pt-1">
                    <Select
                      label={t('audioRecorderRecordingDevice')}
                      value={selectedDeviceId ?? ''}
                      onChange={(event) => setSelectedDeviceId(event.target.value || undefined)}
                      size="compact"
                    >
                      {audioInputDevices.map((device, deviceIndex) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `${t('audioRecorderRecordingDevice')} ${deviceIndex + 1}`}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                {isInitializing ? (
                  <div className="px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <Loader2 size={15} className="shrink-0 animate-spin text-[var(--theme-text-tertiary)]" />
                      <p className="text-sm font-medium text-[var(--theme-text-primary)]">
                        {t('audioRecorderAccessingMicrophone')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    className={`group flex min-h-14 w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-[var(--theme-text-primary)] transition-colors hover:bg-[var(--theme-bg-primary)]/80 ${FOCUS_VISIBLE_RING_PRIMARY_OFFSET_CLASS}`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Mic size={16} className="shrink-0 text-[var(--theme-text-tertiary)]" />
                      <span className="text-sm font-medium">{t('audioRecorderRecordMicrophone')}</span>
                    </span>
                    <ChevronRight
                      size={16}
                      className="shrink-0 text-[var(--theme-text-tertiary)] opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100"
                    />
                  </button>
                )}
              </div>
            )}

            {viewState === 'recording' && (
              <div className="w-full flex flex-col items-center gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="font-mono text-4xl font-medium text-[var(--theme-text-primary)] tabular-nums tracking-wider">
                  {formatClockTime(recordingTime)}
                </div>

                <AudioVisualizer analyser={analyser} />

                <div className={`flex items-center gap-2 ${SETTINGS_SECTION_LABEL_CLASS}`}>
                  <div
                    className={`h-2 w-2 rounded-full ${
                      isPaused ? 'bg-[var(--theme-text-tertiary)]' : 'bg-[var(--theme-text-danger)]'
                    }`}
                  ></div>
                  {isPaused ? t('audioRecorderPausedStatus') : t('audioRecorderRecordingStatus')}
                </div>
              </div>
            )}

            {viewState === 'review' && audioUrl && (
              <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex flex-col items-center mb-6">
                  <div className={`${SETTINGS_SECTION_LABEL_CLASS} mb-1`}>{t('audioRecorderTotalDuration')}</div>
                  <div className="text-3xl font-mono text-[var(--theme-text-primary)]">
                    {formatClockTime(recordingTime)}
                  </div>
                </div>
                <AudioPlayer src={audioUrl} className="w-full" />
              </div>
            )}
          </div>

          <RecorderControls
            viewState={viewState}
            isSaving={isSaving}
            isPaused={isPaused}
            onStop={stopRecording}
            onCancel={requestClose}
            onDiscard={discardRecording}
            onSave={handleSave}
            onPause={pauseRecording}
            onResume={resumeRecording}
            onRerecord={handleRerecord}
          />
        </>
      )}
    </Modal>
  );
};
