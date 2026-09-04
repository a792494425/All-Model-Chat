import React from 'react';
import { MapPin, Play, ScanSearch } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { interpolate } from '@/i18n/interpolate';
import { useChatStore } from '@/stores/chatStore';
import { useMediaNavStore } from '@/stores/mediaNavStore';
import {
  toPdfNavHighlight,
  type AudioLocate,
  type ImageLocate,
  type PdfLocate,
  type VideoLocate,
} from '@/utils/media-nav/locateMarker';
import { collectSessionMediaFiles } from '@/utils/media-nav/sessionMediaFiles';
import { formatTimestamp } from '@/utils/media-nav/timestamp';
import { seekSessionImage } from '@/utils/media-nav/seekImage';
import { seekSessionAudio } from '@/utils/media-nav/seekAudio';

const CHIP_CLASS =
  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors duration-150 bg-[var(--theme-bg-accent)]/10 text-[var(--theme-text-link)] border-[var(--theme-border-secondary)] hover:border-[var(--theme-border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]';

const resolveNamedFile = (files: { id: string; name: string }[], locateName?: string) => {
  if (!locateName) return files[0];
  return (
    files.find((file) => file.name === locateName) ??
    files.find((file) => file.name.toLowerCase().includes(locateName.toLowerCase()))
  );
};

interface LocateChipsProps {
  messageId: string;
  pdfLocates: PdfLocate[];
  videoLocates: VideoLocate[];
  audioLocates: AudioLocate[];
  imageLocates?: ImageLocate[];
}

/**
 * Locate chips rendered under a model message. PDF chips open the navigation
 * panel on the referenced page (with visual-grounding highlight); video chips
 * seek the referenced moment and optionally loop the referenced segment;
 * image chips highlight regions or points on the image.
 */
export const LocateChips: React.FC<LocateChipsProps> = ({
  messageId,
  pdfLocates,
  videoLocates,
  audioLocates,
  imageLocates = [],
}) => {
  const { t } = useI18n();

  if (pdfLocates.length === 0 && videoLocates.length === 0 && audioLocates.length === 0 && imageLocates.length === 0) {
    return null;
  }

  const handlePdfLocate = (locate: PdfLocate) => {
    const { selectedFiles, activeMessages } = useChatStore.getState();
    const { pdfs } = collectSessionMediaFiles(selectedFiles, activeMessages);
    if (pdfs.length === 0) return;
    const target = resolveNamedFile(pdfs, locate.docName);
    if (!target) return;

    const store = useMediaNavStore.getState();
    store.openAs('pdf');
    store.setActiveFile(target.id);
    store.setHighlight(toPdfNavHighlight(locate, { messageId }));
    store.jumpToPage(locate.pageNumber);
  };

  const handleVideoLocate = (locate: VideoLocate) => {
    const { selectedFiles, activeMessages } = useChatStore.getState();
    const { videos } = collectSessionMediaFiles(selectedFiles, activeMessages);
    if (videos.length === 0) return;
    const target = resolveNamedFile(videos, locate.videoName);
    if (!target) return;

    const store = useMediaNavStore.getState();
    store.openAs('video');
    store.setActiveFile(target.id);
    store.jumpToTime(locate.startSeconds, locate.endSeconds, {
      box2d: locate.box2d,
      point: locate.point,
      snippet: locate.snippet,
    });
  };

  const handleAudioLocate = (locate: AudioLocate) => {
    seekSessionAudio({
      startSeconds: locate.startSeconds,
      endSeconds: locate.endSeconds,
      audioName: locate.audioName,
      messageId,
      snippet: locate.snippet,
    });
  };

  const handleImageLocate = (locate: ImageLocate) => {
    seekSessionImage({
      fileName: locate.imageName,
      box2d: locate.box2d,
      point: locate.point,
      arrow: locate.arrow,
      label: locate.label,
      snippet: locate.snippet,
      messageId,
    });
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-2" data-testid="locate-chips">
      {pdfLocates.map((locate, index) => (
        <button
          key={`pdf:${locate.pageNumber}:${locate.snippet ?? ''}:${index}`}
          type="button"
          onClick={() => handlePdfLocate(locate)}
          className={CHIP_CLASS}
          title={locate.snippet || t('pdfNavLocateButton')}
          data-testid={`pdf-locate-chip-${locate.pageNumber}`}
        >
          <MapPin size={13} strokeWidth={2} />
          <span>{t('pdfNavLocateButton')}</span>
          <span className="opacity-70">·</span>
          <span>{interpolate(t('pdfNavLocatePage'), { page: String(locate.pageNumber) })}</span>
        </button>
      ))}
      {videoLocates.map((locate, index) => (
        <button
          key={`video:${locate.startSeconds}:${locate.endSeconds ?? ''}:${locate.snippet ?? ''}:${index}`}
          type="button"
          onClick={() => handleVideoLocate(locate)}
          className={CHIP_CLASS}
          title={locate.snippet || t('videoLocateButton')}
          data-testid={`video-locate-chip-${locate.startSeconds}`}
        >
          <Play size={13} strokeWidth={2} />
          <span>{t('videoLocateButton')}</span>
          <span className="opacity-70">·</span>
          <span className="font-mono">
            {locate.endSeconds !== undefined
              ? interpolate(t('videoLocateSegment'), {
                  start: formatTimestamp(locate.startSeconds),
                  end: formatTimestamp(locate.endSeconds),
                })
              : formatTimestamp(locate.startSeconds)}
          </span>
        </button>
      ))}
      {audioLocates.map((locate, index) => (
        <button
          key={`audio:${locate.startSeconds}:${locate.endSeconds ?? ''}:${locate.snippet ?? ''}:${index}`}
          type="button"
          onClick={() => handleAudioLocate(locate)}
          className={CHIP_CLASS}
          title={locate.snippet || t('audioLocateButton')}
          data-testid={`audio-locate-chip-${locate.startSeconds}`}
        >
          <Play size={13} strokeWidth={2} />
          <span>{t('audioLocateButton')}</span>
          <span className="opacity-70">·</span>
          <span className="font-mono">
            {locate.endSeconds !== undefined
              ? interpolate(t('videoLocateSegment'), {
                  start: formatTimestamp(locate.startSeconds),
                  end: formatTimestamp(locate.endSeconds),
                })
              : formatTimestamp(locate.startSeconds)}
          </span>
        </button>
      ))}
      {imageLocates.map((locate, index) => {
        const text = locate.label || locate.snippet || t('imageNavLocateButton');
        return (
          <button
            key={`image:${locate.imageName ?? ''}:${locate.label ?? ''}:${locate.snippet ?? ''}:${index}`}
            type="button"
            onClick={() => handleImageLocate(locate)}
            className={CHIP_CLASS}
            title={locate.snippet || text}
            data-testid={`image-locate-chip-${index}`}
          >
            <ScanSearch size={13} strokeWidth={2} />
            <span>{text}</span>
          </button>
        );
      })}
    </div>
  );
};
