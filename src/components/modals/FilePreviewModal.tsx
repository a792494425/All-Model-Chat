import { logService } from '@/services/logService';
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type UploadedFile } from '@/types';
import { ChevronLeft, ChevronRight, FileCode2, Sparkles, Subtitles, Loader2 } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { Modal } from '@/components/shared/Modal';
import { FilePreviewHeader, type FilePreviewHeaderHandle } from '@/components/shared/file-preview/FilePreviewHeader';
import { ImageViewer } from '@/components/shared/file-preview/ImageViewer';
import { TextFileViewer } from '@/components/shared/file-preview/TextFileViewer';
import { VideoPlayer, type VideoPlayerHandle } from '@/components/shared/file-preview/VideoPlayer';
import { AudioPreviewViewer } from '@/components/shared/file-preview/AudioPreviewViewer';
import { DocxViewer } from '@/components/shared/file-preview/DocxViewer';
import { SpreadsheetViewer } from '@/components/shared/file-preview/SpreadsheetViewer';
import { ZipViewer } from '@/components/shared/file-preview/ZipViewer';
import { IconYoutube } from '@/components/icons';
import { copyFileToClipboard } from '@/utils/file/fileClipboard';
import { cleanupFilePreviewUrl, fileToBlobUrl } from '@/utils/file/filePreviewUrls';
import { extractDocxText, isDocxFile } from '@/utils/docxPreview';
import { useSettingsStore } from '@/stores/settingsStore';
import { isShortcutPressed } from '@/utils/keyboardShortcuts';
import {
  getFileKindFlags,
  isArchiveFile,
  isMarkdownFile,
  isSpreadsheetFile,
  isTextFile,
} from '@/utils/file/fileTypeClassification';
import { toYoutubeEmbedUrl } from '@/utils/file/youtubeUrl';
import { lazyNamedComponent } from '@/utils/lazyNamedComponent';
import { interpolate } from '@/i18n/interpolate';
import { isEditableElement } from '@/utils/chat-input/focus';
import { extractAudioFromVideo } from '@/utils/video-subtitles/extractAudioFromVideo';
import { transcribeAudioWithGemini } from '@/utils/video-subtitles/geminiTranscribeService';
import {
  type SubtitleCue,
  type SubtitleDisplayMode,
  groupWordsIntoCues,
  generateVttContent,
  generateSrtContent,
} from '@/utils/video-subtitles/subtitleFormatter';
import { translateSubtitlesWithGemini } from '@/utils/video-subtitles/geminiSubtitleTranslateService';
import { getCachedSubtitles, saveCachedSubtitles } from '@/utils/video-subtitles/subtitleCacheService';
import { VideoSubtitlesDrawer } from '@/components/shared/file-preview/video/VideoSubtitlesDrawer';
import { getGeminiKeyForRequest, formatApiKeyErrorMessage } from '@/utils/apiKeySelection';
import { DEFAULT_THOUGHT_TRANSLATION_MODEL_ID } from '@/constants/modelConfiguration';
import { toastError, toastSuccess } from '@/stores/toastStore';

const LazyPdfViewer = lazyNamedComponent(() => import('@/components/shared/file-preview/PdfViewerEntry'), 'PdfViewer');

interface FilePreviewModalProps {
  file: UploadedFile | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  onSaveText?: (fileId: string, content: string, newName: string) => void;
  initialEditMode?: boolean;
  onConvertToContext?: (contextFile: File) => void | Promise<void>;
}

interface FilePreviewModalContentProps extends Omit<FilePreviewModalProps, 'file'> {
  file: UploadedFile;
}

const FilePreviewModalContent: React.FC<FilePreviewModalContentProps> = ({
  file,
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  onSaveText,
  initialEditMode = false,
  onConvertToContext,
}) => {
  const { t } = useI18n();
  const appSettings = useSettingsStore((state) => state.appSettings);
  const currentThemeId = useSettingsStore((state) => state.currentTheme.id);
  const isDocxCandidate = isDocxFile(file);
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [editedContent, setEditedContent] = useState(file.textContent ?? '');
  const [editedName, setEditedName] = useState(file.name);
  const [textContentLoaded, setTextContentLoaded] = useState(file.textContent !== undefined);
  const [docxPreviewContent, setDocxPreviewContent] = useState<string | null>(file.textContent ?? null);
  const [docxPreviewError, setDocxPreviewError] = useState<string | null>(
    isDocxCandidate && file.textContent === undefined && !file.rawFile ? t('filePreviewWordUnavailable') : null,
  );
  const [isDocxPreviewLoading, setIsDocxPreviewLoading] = useState(false);
  const [docxViewMode, setDocxViewMode] = useState<'rich' | 'text'>('rich');
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [videoAspect, setVideoAspect] = useState<number | null>(null);
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const filePreviewHeaderRef = useRef<FilePreviewHeaderHandle>(null);
  const videoPlayerRef = useRef<VideoPlayerHandle>(null);
  const modalShellRef = useRef<HTMLDivElement>(null);
  const previewFile = useMemo(
    () => (localPreviewUrl ? { ...file, dataUrl: localPreviewUrl } : file),
    [file, localPreviewUrl],
  );

  useEffect(() => {
    setVideoAspect(null);
    if (file.dataUrl || !(file.rawFile instanceof Blob)) {
      setLocalPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = fileToBlobUrl(file.rawFile);
    setLocalPreviewUrl(nextPreviewUrl);

    return () => cleanupFilePreviewUrl({ dataUrl: nextPreviewUrl });
  }, [file]);

  const handleCopyShortcut = useCallback(async () => {
    if (!previewFile.dataUrl) return;
    try {
      await copyFileToClipboard(previewFile);
      filePreviewHeaderRef.current?.showCopyFeedback();
    } catch (copyError) {
      logService.error('Failed to copy content:', copyError);
    }
  }, [previewFile]);

  const { isImage, isPdf, isVideo, isYoutube, isAudio } = getFileKindFlags(file);

  type SubtitlePhase = 'idle' | 'extracting' | 'uploading' | 'transcribing' | 'ready' | 'error';
  const [subtitlePhase, setSubtitlePhase] = useState<SubtitlePhase>('idle');
  const [subtitleProgressPercent, setSubtitleProgressPercent] = useState<number | undefined>(undefined);
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [subtitleVttBlobUrl, setSubtitleVttBlobUrl] = useState<string | null>(null);
  const [isSubtitlesDrawerOpen, setIsSubtitlesDrawerOpen] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [isFromCache, setIsFromCache] = useState(false);
  const subtitleAbortControllerRef = useRef<AbortController | null>(null);

  const [subtitleDisplayMode, setSubtitleDisplayMode] = useState<SubtitleDisplayMode>('bilingual');
  const [isTranslatingSubtitles, setIsTranslatingSubtitles] = useState(false);

  const updateVttBlobUrl = useCallback((cues: SubtitleCue[], mode: SubtitleDisplayMode) => {
    if (!cues || cues.length === 0) return;
    const vttContent = generateVttContent(cues, { mode });
    const vttBlob = new Blob([vttContent], { type: 'text/vtt;charset=utf-8' });
    const vttUrl = URL.createObjectURL(vttBlob);
    setSubtitleVttBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return vttUrl;
    });
  }, []);

  const handleDisplayModeChange = useCallback(
    (mode: SubtitleDisplayMode) => {
      setSubtitleDisplayMode(mode);
      updateVttBlobUrl(subtitleCues, mode);
    },
    [subtitleCues, updateVttBlobUrl],
  );

  useEffect(() => {
    let isMounted = true;

    // Reset subtitle states when switching to a different file
    setSubtitleCues([]);
    setSubtitlePhase('idle');
    setIsFromCache(false);
    setIsSubtitlesDrawerOpen(false);
    setVideoCurrentTime(0);
    setSubtitleVttBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    if (!isVideo) return;

    const loadCached = () => {
      getCachedSubtitles(file).then((cached) => {
        if (!isMounted) return;
        if (!cached) {
          setSubtitleCues([]);
          setSubtitlePhase('idle');
          setIsFromCache(false);
          setIsSubtitlesDrawerOpen(false);
          setSubtitleVttBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
          return;
        }
        setSubtitleCues(cached.cues);
        const hasTrans = cached.cues.some((c) => Boolean(c.translation));
        const targetMode = hasTrans ? subtitleDisplayMode : 'original';
        const vttContent = generateVttContent(cached.cues, { mode: targetMode });
        const vttBlob = new Blob([vttContent], { type: 'text/vtt;charset=utf-8' });
        const vttUrl = URL.createObjectURL(vttBlob);
        setSubtitleVttBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return vttUrl;
        });
        setSubtitlePhase('ready');
        setIsFromCache(true);
      });
    };

    loadCached();

    const handleCacheUpdated = () => {
      loadCached();
    };

    window.addEventListener('subtitles-cache-updated', handleCacheUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('subtitles-cache-updated', handleCacheUpdated);
    };
  }, [file, isVideo, subtitleDisplayMode]);

  useEffect(() => {
    return () => {
      subtitleAbortControllerRef.current?.abort();
      if (subtitleVttBlobUrl) {
        URL.revokeObjectURL(subtitleVttBlobUrl);
      }
    };
  }, [subtitleVttBlobUrl]);

  const handleExtractSubtitles = useCallback(async () => {
    if (subtitlePhase === 'extracting' || subtitlePhase === 'uploading' || subtitlePhase === 'transcribing') {
      return;
    }

    let apiKey: string | null = null;
    const keyResult = getGeminiKeyForRequest(appSettings, { modelId: 'gemini-3.5-transcribe' } as any, {
      skipIncrement: true,
    });

    if (!('error' in keyResult)) {
      apiKey = keyResult.key;
    } else if (appSettings?.apiKey) {
      apiKey = appSettings.apiKey;
    }

    if (!apiKey) {
      toastError(formatApiKeyErrorMessage('error' in keyResult ? keyResult.error : 'API Key not configured.', t));
      return;
    }

    let videoBlob: Blob | null = null;
    if (file.rawFile instanceof Blob) {
      videoBlob = file.rawFile;
    } else if (previewFile.dataUrl) {
      try {
        const resp = await fetch(previewFile.dataUrl);
        videoBlob = await resp.blob();
      } catch {
        // Fallback below
      }
    }

    if (!videoBlob) {
      toastError(t('noAudioTrackDetected'));
      return;
    }

    const abortController = new AbortController();
    subtitleAbortControllerRef.current = abortController;

    try {
      setSubtitlePhase('extracting');
      setSubtitleProgressPercent(undefined);
      setIsFromCache(false);

      // 1. Extract audio pure client-side via Web Audio API
      const { audioBlob, durationSeconds } = await extractAudioFromVideo(videoBlob, abortController.signal);

      // 2. Transcribe with gemini-3.5-transcribe
      const annotations = await transcribeAudioWithGemini(
        apiKey,
        audioBlob,
        `${file.name.replace(/\.[^/.]+$/, '')}-audio.wav`,
        abortController.signal,
        (phase, percent) => {
          setSubtitlePhase(phase);
          setSubtitleProgressPercent(percent);
        },
        durationSeconds,
      );

      // 3. Group words into cues and generate VTT Blob URL
      const cues = groupWordsIntoCues(annotations);
      setSubtitleCues(cues);

      const vttContent = generateVttContent(cues);
      const srtContent = generateSrtContent(cues);
      const vttBlob = new Blob([vttContent], { type: 'text/vtt;charset=utf-8' });
      const vttUrl = URL.createObjectURL(vttBlob);

      if (subtitleVttBlobUrl) {
        URL.revokeObjectURL(subtitleVttBlobUrl);
      }
      setSubtitleVttBlobUrl(vttUrl);
      setSubtitlePhase('ready');
      setIsFromCache(false);
      setIsSubtitlesDrawerOpen(true);
      toastSuccess(t('subtitlesReady'));

      void saveCachedSubtitles(file, {
        cues,
        srtContent,
        vttContent,
        durationSeconds,
      });
    } catch (err: any) {
      if (abortController.signal.aborted) {
        setSubtitlePhase('idle');
        return;
      }
      const errMsg = err?.message || String(err);
      logService.error('[FilePreviewModal] Subtitle extraction failed:', err);
      setSubtitlePhase('error');
      toastError(errMsg);
    }
  }, [appSettings, file, previewFile, subtitlePhase, subtitleVttBlobUrl, t]);

  const handleTranslateSubtitles = useCallback(async () => {
    if (isTranslatingSubtitles || subtitleCues.length === 0) return;

    let apiKey: string | null = null;
    const keyResult = getGeminiKeyForRequest(appSettings, { modelId: 'gemini-2.5-flash' } as any, {
      skipIncrement: true,
    });
    if (!('error' in keyResult)) {
      apiKey = keyResult.key;
    } else if (appSettings?.apiKey) {
      apiKey = appSettings.apiKey;
    }

    if (!apiKey) {
      toastError(formatApiKeyErrorMessage('error' in keyResult ? keyResult.error : 'API Key not configured.', t));
      return;
    }

    setIsTranslatingSubtitles(true);
    try {
      const translationModelId =
        appSettings?.inputTranslationModelId ||
        appSettings?.thoughtTranslationModelId ||
        DEFAULT_THOUGHT_TRANSLATION_MODEL_ID;

      const translatedCues = await translateSubtitlesWithGemini(apiKey, subtitleCues, {
        targetLanguage: 'Chinese',
        modelId: translationModelId,
      });
      setSubtitleCues(translatedCues);
      setSubtitleDisplayMode('bilingual');
      updateVttBlobUrl(translatedCues, 'bilingual');

      const srtContent = generateSrtContent(translatedCues);
      const vttContent = generateVttContent(translatedCues);
      const bilingualVttContent = generateVttContent(translatedCues, { mode: 'bilingual' });
      const translatedVttContent = generateVttContent(translatedCues, { mode: 'translation' });

      await saveCachedSubtitles(file, {
        cues: translatedCues,
        srtContent,
        vttContent,
        bilingualVttContent,
        translatedVttContent,
        targetLanguage: 'Chinese',
      });
      toastSuccess(t('subtitlesReady'));
    } catch (err: any) {
      logService.error('[FilePreviewModal] Subtitle translation failed:', err);
      toastError(err?.message || t('translateFailed'));
    } finally {
      setIsTranslatingSubtitles(false);
    }
  }, [isTranslatingSubtitles, subtitleCues, appSettings, t, file, updateVttBlobUrl]);

  const subtitleActions = useMemo(() => {
    if (!isVideo) return null;

    if (subtitlePhase === 'extracting' || subtitlePhase === 'uploading' || subtitlePhase === 'transcribing') {
      const label =
        subtitlePhase === 'extracting'
          ? t('extractingAudio')
          : subtitlePhase === 'uploading'
            ? t('uploadingAudio').replace('{percent}', String(subtitleProgressPercent ?? 0))
            : t('transcribingSubtitles');

      return (
        <div
          data-testid="subtitles-progress-badge"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-sky-500/15 text-sky-200 border border-sky-500/30"
        >
          <Loader2 size={13} className="animate-spin text-sky-300 flex-shrink-0" />
          <span className="truncate max-w-[200px]">{label}</span>
        </div>
      );
    }

    if (subtitlePhase === 'ready') {
      const titleText = isFromCache ? `${t('videoSubtitles')} (${t('loadedFromCache')})` : t('videoSubtitles');
      return (
        <button
          type="button"
          onClick={() => setIsSubtitlesDrawerOpen((prev) => !prev)}
          className={`px-2.5 py-1 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
            isSubtitlesDrawerOpen ? 'bg-sky-600 text-white shadow-sm' : 'bg-white/10 hover:bg-white/20 text-white/90'
          }`}
          data-testid="toggle-subtitles-drawer-btn"
          title={titleText}
        >
          <Subtitles size={13} />
          <span>{t('videoSubtitles')}</span>
          <span className="text-[10px] font-mono px-1 rounded-full bg-black/20">{subtitleCues.length}</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={handleExtractSubtitles}
        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 hover:text-white border border-sky-500/40 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
        data-testid="extract-subtitles-btn"
        title={t('extractSubtitles')}
      >
        <Sparkles size={13} className="text-sky-300" />
        <span>{t('extractSubtitles')}</span>
      </button>
    );
  }, [
    handleExtractSubtitles,
    isFromCache,
    isSubtitlesDrawerOpen,
    isVideo,
    subtitleCues.length,
    subtitlePhase,
    subtitleProgressPercent,
    t,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditing) return;

      // When subtitle drawer is open, Esc closes the drawer first instead of exiting the entire modal
      if (event.key === 'Escape' && isSubtitlesDrawerOpen) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setIsSubtitlesDrawerOpen(false);
        return;
      }

      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement && isEditableElement(activeElement)) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        const selection = window.getSelection();
        const hasActiveSelection = !!selection && !selection.isCollapsed && selection.toString().length > 0;

        if (hasActiveSelection) {
          return;
        }

        event.preventDefault();
        void handleCopyShortcut();
        return;
      }

      const isUnmodifiedArrowKey =
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight') && !event.ctrlKey && !event.metaKey && !event.altKey;
      if ((isPdf || isVideo) && isUnmodifiedArrowKey) {
        return;
      }

      if (isShortcutPressed(event, 'global.prevFile', appSettings) && hasPrev && onPrev) {
        event.preventDefault();
        onPrev();
      } else if (isShortcutPressed(event, 'global.nextFile', appSettings) && hasNext && onNext) {
        event.preventDefault();
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [appSettings, handleCopyShortcut, hasNext, hasPrev, isEditing, isPdf, isSubtitlesDrawerOpen, isVideo, onNext, onPrev]);

  const handleSave = useCallback(() => {
    if (!onSaveText) {
      return;
    }

    onSaveText(file.id, editedContent, editedName);
    setIsEditing(false);
  }, [editedContent, editedName, file.id, onSaveText]);

  const handleToggleEdit = useCallback(() => {
    if (isEditing) {
      setIsEditing(false);
      setEditedName(file.name);
      setEditedContent(file.textContent ?? '');
      setTextContentLoaded(file.textContent !== undefined);
      return;
    }

    setIsEditing(true);
  }, [file, isEditing]);

  const isDocx = !isImage && !isPdf && !isVideo && !isYoutube && !isAudio && isDocxCandidate;
  const isSpreadsheet =
    !isImage && !isPdf && !isVideo && !isYoutube && !isAudio && (isSpreadsheetFile?.(file) ?? false);
  const isArchive = !isImage && !isPdf && !isVideo && !isYoutube && !isAudio && (isArchiveFile?.(file) ?? false);
  const isText =
    !isImage &&
    !isDocx &&
    !isSpreadsheet &&
    !isArchive &&
    !isPdf &&
    !isVideo &&
    !isYoutube &&
    !isAudio &&
    isTextFile(file);
  const isMarkdown = isText && isMarkdownFile(file);
  const youtubeEmbedUrl = isYoutube ? toYoutubeEmbedUrl(file.fileUri || file.name) : null;

  useEffect(() => {
    let cancelled = false;

    if (!isDocx || file.textContent !== undefined) {
      return () => {
        cancelled = true;
      };
    }

    if (!file.rawFile) {
      return () => {
        cancelled = true;
      };
    }

    setIsDocxPreviewLoading(true);

    void extractDocxText(file.rawFile)
      .then(({ text }) => {
        if (cancelled) return;
        setDocxPreviewContent(text);
      })
      .catch(() => {
        if (cancelled) return;
        setDocxPreviewError(t('filePreviewWordUnavailable'));
      })
      .finally(() => {
        if (!cancelled) {
          setIsDocxPreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [file, isDocx, t]);

  const navButtonClass =
    'absolute top-1/2 -translate-y-1/2 p-2.5 sm:p-3 bg-black/70 hover:bg-black/90 text-white/80 hover:text-white rounded-full transition-all duration-200 z-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 shadow-xl hover:scale-105 border border-white/10';

  const handleModalMouseMove = useCallback(() => {
    if (!areControlsVisible) {
      setAreControlsVisible(true);
    }
    videoPlayerRef.current?.wakeControls?.();
  }, [areControlsVisible]);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      noPadding
      backdropClassName="bg-black/90 backdrop-blur-2xl"
      contentClassName="w-full h-full"
      initialFocusRef={modalShellRef}
    >
      <div
        ref={modalShellRef}
        tabIndex={-1}
        className="w-full h-full relative flex flex-col outline-none"
        onMouseMove={handleModalMouseMove}
      >
        <h2 id="file-preview-modal-title" className="sr-only">
          {interpolate(t('imageZoomTitle'), { filename: file.name })}
        </h2>

        <FilePreviewHeader
          ref={filePreviewHeaderRef}
          file={previewFile}
          onClose={onClose}
          isEditable={isEditing}
          onToggleEdit={isText && onSaveText ? handleToggleEdit : undefined}
          onSave={handleSave}
          editedName={editedName}
          onNameChange={setEditedName}
          extraActions={subtitleActions}
          className={`transition-opacity duration-300 ${
            isVideo && !areControlsVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        />

        {!isEditing && hasPrev && onPrev && (
          <button
            data-testid="file-preview-prev-btn"
            onClick={(event) => {
              event.stopPropagation();
              onPrev();
            }}
            className={`${navButtonClass} left-2 transition-opacity duration-300 ${
              isVideo && (!areControlsVisible || isSubtitlesDrawerOpen)
                ? 'opacity-0 pointer-events-none'
                : 'opacity-100'
            }`}
            aria-label={t('filePreviewPrevious')}
          >
            <ChevronLeft size={24} />
          </button>
        )}
        {!isEditing && hasNext && onNext && (
          <button
            data-testid="file-preview-next-btn"
            onClick={(event) => {
              event.stopPropagation();
              onNext();
            }}
            className={`${navButtonClass} right-2 transition-opacity duration-300 ${
              isVideo && (!areControlsVisible || isSubtitlesDrawerOpen)
                ? 'opacity-0 pointer-events-none'
                : 'opacity-100'
            }`}
            aria-label={t('filePreviewNext')}
          >
            <ChevronRight size={24} />
          </button>
        )}

        <div className="flex-grow w-full min-h-0 overflow-hidden relative">
          {isImage ? (
            <ImageViewer file={previewFile} />
          ) : isDocx ? (
            docxViewMode === 'rich' && file.rawFile && !isEditing ? (
              <div className="w-full h-full flex flex-col relative">
                <div className="flex-shrink-0 flex items-center justify-end px-4 py-2 border-b border-[var(--theme-border-secondary)]/50 bg-[var(--theme-bg-secondary)]/40 backdrop-blur-xs z-20">
                  <button
                    type="button"
                    onClick={() => setDocxViewMode('text')}
                    className="px-2.5 py-1 text-xs rounded-lg bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] shadow-2xs transition-all font-medium cursor-pointer"
                  >
                    {t('filePreviewSwitchToPlainText')}
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <DocxViewer file={previewFile} />
                </div>
              </div>
            ) : isDocxPreviewLoading ? (
              <div className="w-full h-full flex items-center justify-center text-white/70">
                {t('filePreviewLoadingWord')}
              </div>
            ) : docxPreviewError ? (
              <div className="w-full h-full flex items-center justify-center text-white/60 px-6 text-center">
                {docxPreviewError}
              </div>
            ) : (
              <div className="w-full h-full flex flex-col relative">
                {file.rawFile && !isEditing && (
                  <div className="flex-shrink-0 flex items-center justify-end px-4 py-2 border-b border-[var(--theme-border-secondary)]/50 bg-[var(--theme-bg-secondary)]/40 backdrop-blur-xs z-20">
                    <button
                      type="button"
                      onClick={() => setDocxViewMode('rich')}
                      className="px-2.5 py-1 text-xs rounded-lg bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] shadow-2xs transition-all font-medium cursor-pointer"
                    >
                      {t('filePreviewSwitchToRichText')}
                    </button>
                  </div>
                )}
                <div className="flex-1 min-h-0 overflow-hidden">
                  <TextFileViewer
                    file={previewFile}
                    renderMode="plain"
                    themeId={currentThemeId}
                    isEditable={isEditing}
                    onChange={setEditedContent}
                    content={isEditing ? editedContent : docxPreviewContent}
                  />
                </div>
              </div>
            )
          ) : isSpreadsheet ? (
            <SpreadsheetViewer file={previewFile} />
          ) : isArchive ? (
            <ZipViewer file={previewFile} onConvertToContext={onConvertToContext} />
          ) : isText ? (
            <TextFileViewer
              file={previewFile}
              renderMode={isMarkdown ? 'markdown' : 'plain'}
              themeId={currentThemeId}
              isEditable={isEditing}
              onChange={setEditedContent}
              onLoad={(content) => {
                if (!textContentLoaded) {
                  setEditedContent(content);
                  setTextContentLoaded(true);
                }
              }}
              content={isEditing && textContentLoaded ? editedContent : undefined}
            />
          ) : isPdf ? (
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center text-white/70">
                  {t('filePreviewLoadingPdfViewer')}
                </div>
              }
            >
              <LazyPdfViewer file={previewFile} />
            </Suspense>
          ) : isVideo ? (
            <div className="w-full h-full flex flex-row overflow-hidden relative">
              <div className="flex-1 min-w-0 h-full flex items-center justify-center p-2 sm:p-6 lg:p-8">
                {previewFile.dataUrl && (
                  <div
                    className="relative w-full max-w-7xl max-h-[88vh] rounded-2xl shadow-2xl overflow-hidden bg-black/95 ring-1 ring-white/15 flex items-center justify-center transition-all duration-300"
                    style={videoAspect ? { aspectRatio: `${videoAspect}` } : undefined}
                  >
                    <VideoPlayer
                      ref={videoPlayerRef}
                      src={previewFile.dataUrl}
                      subtitlesSrc={subtitleVttBlobUrl ?? undefined}
                      file={previewFile}
                      testId="file-preview-video"
                      showSegmentBar={false}
                      onControlsVisibilityChange={setAreControlsVisible}
                      onTimeUpdate={setVideoCurrentTime}
                      onLoadedMetadata={(e) => {
                        const v = e.currentTarget;
                        if (v.videoWidth && v.videoHeight) {
                          setVideoAspect(v.videoWidth / v.videoHeight);
                        }
                      }}
                    />
                  </div>
                )}
              </div>
              {isSubtitlesDrawerOpen && (
                <VideoSubtitlesDrawer
                  cues={subtitleCues}
                  currentTime={videoCurrentTime}
                  onSeek={(seconds) => videoPlayerRef.current?.seekTo(seconds)}
                  onClose={() => setIsSubtitlesDrawerOpen(false)}
                  videoFileName={file.name}
                  onReExtract={handleExtractSubtitles}
                  isFromCache={isFromCache}
                  onTranslate={handleTranslateSubtitles}
                  isTranslating={isTranslatingSubtitles}
                  displayMode={subtitleDisplayMode}
                  onDisplayModeChange={handleDisplayModeChange}
                />
              )}
            </div>
          ) : isYoutube ? (
            <div className="w-full h-full flex items-center justify-center p-2 sm:p-6 lg:p-8">
              {youtubeEmbedUrl ? (
                <iframe
                  src={youtubeEmbedUrl}
                  title={t('filePreviewYoutubePlayer')}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full max-w-7xl max-h-[88vh] aspect-video rounded-2xl shadow-2xl ring-1 ring-white/15 bg-black"
                />
              ) : (
                <div className="text-center text-white/50">
                  <IconYoutube size={64} className="mx-auto mb-4 opacity-50" />
                  <p>{t('filePreviewInvalidYoutubeUrl')}</p>
                </div>
              )}
            </div>
          ) : isAudio ? (
            previewFile.dataUrl ? (
              <AudioPreviewViewer file={previewFile} />
            ) : null
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/50 flex-col gap-2">
              <FileCode2 size={48} />
              <p>{t('filePreviewNotSupported')}</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  onSaveText,
  initialEditMode = false,
}) => {
  if (!file) {
    return null;
  }

  return (
    <FilePreviewModalContent
      key={`${file.id}:${initialEditMode ? 'edit' : 'view'}`}
      file={file}
      onClose={onClose}
      onPrev={onPrev}
      onNext={onNext}
      hasPrev={hasPrev}
      hasNext={hasNext}
      onSaveText={onSaveText}
      initialEditMode={initialEditMode}
    />
  );
};
