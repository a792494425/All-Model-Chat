import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Download, Copy, Check, X, Search, Subtitles, RotateCw, FileText } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import {
  type SubtitleCue,
  generateSrtContent,
  generateVttContent,
  downloadTextFile,
} from '@/utils/video-subtitles/subtitleFormatter';

export interface VideoSubtitlesDrawerProps {
  cues: SubtitleCue[];
  currentTime: number;
  onSeek: (seconds: number) => void;
  onClose: () => void;
  videoFileName: string;
  onReExtract?: () => void;
  isFromCache?: boolean;
}

export const VideoSubtitlesDrawer: React.FC<VideoSubtitlesDrawerProps> = ({
  cues,
  currentTime,
  onSeek,
  onClose,
  videoFileName,
  onReExtract,
  isFromCache,
}) => {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const activeCueRef = useRef<HTMLDivElement | null>(null);

  // Compute base filename without extension
  const baseFileName = useMemo(() => {
    return videoFileName.replace(/\.[^/.]+$/, '') || 'subtitles';
  }, [videoFileName]);

  // Determine active cue index based on currentTime
  const activeCueId = useMemo(() => {
    if (!cues || cues.length === 0) return null;
    const found = cues.find((c) => currentTime >= c.startSeconds && currentTime <= c.endSeconds);
    return found ? found.id : null;
  }, [cues, currentTime]);

  // Auto-scroll to active cue when activeCueId changes
  useEffect(() => {
    if (activeCueRef.current) {
      activeCueRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeCueId]);

  // Filter cues by search query
  const filteredCues = useMemo(() => {
    if (!searchQuery.trim()) return cues;
    const query = searchQuery.toLowerCase().trim();
    return cues.filter(
      (c) => c.text.toLowerCase().includes(query) || (c.speaker && c.speaker.toLowerCase().includes(query)),
    );
  }, [cues, searchQuery]);

  const handleDownloadSrt = () => {
    if (!cues.length) return;
    const srtContent = generateSrtContent(cues);
    downloadTextFile(`${baseFileName}.srt`, srtContent, 'text/plain;charset=utf-8');
  };

  const handleDownloadVtt = () => {
    if (!cues.length) return;
    const vttContent = generateVttContent(cues);
    downloadTextFile(`${baseFileName}.vtt`, vttContent, 'text/vtt;charset=utf-8');
  };

  const handleCopyText = async () => {
    if (!cues.length) return;
    const plainText = cues.map((c) => (c.speaker ? `[${c.speaker}] ${c.text}` : c.text)).join('\n');
    try {
      await navigator.clipboard.writeText(plainText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is unavailable
    }
  };

  return (
    <div
      data-testid="video-subtitles-drawer"
      className="w-80 sm:w-96 flex flex-col h-full bg-[#18191c] border-l border-white/10 text-white/90 select-none z-20 flex-shrink-0"
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 bg-[#141517]">
        <div className="flex items-center gap-2 min-w-0">
          <Subtitles size={16} className="text-sky-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-white truncate">{t('videoSubtitles')}</span>
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">
            {cues.length}
          </span>
          {isFromCache && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-medium whitespace-nowrap"
              data-testid="subtitles-cache-badge"
              title={t('loadedFromCache')}
            >
              {t('loadedFromCache')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Re-extract Subtitles */}
          {onReExtract && (
            <button
              type="button"
              onClick={onReExtract}
              className="p-1.5 rounded text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              data-testid="re-extract-subtitles-btn"
              title={t('reExtractSubtitles')}
            >
              <RotateCw size={13} />
            </button>
          )}

          {/* Download SRT */}
          <button
            type="button"
            onClick={handleDownloadSrt}
            disabled={cues.length === 0}
            className="px-2 py-1 rounded text-xs font-medium bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:pointer-events-none text-white/90 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            data-testid="download-srt-btn"
            title={t('downloadSrt')}
          >
            <Download size={12} />
            <span>SRT</span>
          </button>

          {/* Download VTT */}
          <button
            type="button"
            onClick={handleDownloadVtt}
            disabled={cues.length === 0}
            className="px-2 py-1 rounded text-xs font-medium bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:pointer-events-none text-white/90 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            data-testid="download-vtt-btn"
            title={t('downloadVtt')}
          >
            <Download size={12} />
            <span>VTT</span>
          </button>

          {/* Copy Plain Text */}
          <button
            type="button"
            onClick={handleCopyText}
            disabled={cues.length === 0}
            className="p-1.5 rounded text-xs text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            data-testid="copy-subtitles-btn"
            title={isCopied ? t('copiedSubtitleText') : t('copySubtitleText')}
          >
            {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>

          {/* Close Drawer */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label={t('close')}
            title={t('close')}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {cues.length > 0 && (
        <div className="px-3 py-2 border-b border-white/5 bg-[#141517]/50">
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-2.5 text-white/40 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchSubtitles')}
              className="w-full pl-8 pr-7 py-1 text-xs rounded bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-sky-500/50 focus:bg-white/10 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-white/40 hover:text-white cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Cues List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
        {filteredCues.length === 0 ? (
          <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-white/40 text-xs text-center px-4">
            <FileText size={24} className="mb-2 opacity-50" />
            <span>{t('noSubtitlesFound')}</span>
          </div>
        ) : (
          filteredCues.map((cue) => {
            const isActive = cue.id === activeCueId;
            return (
              <div
                key={cue.id}
                ref={isActive ? activeCueRef : null}
                data-testid="subtitle-cue-item"
                data-active={isActive ? 'true' : 'false'}
                onClick={() => onSeek(cue.startSeconds)}
                className={`p-2 rounded-lg cursor-pointer transition-all duration-150 border text-left ${
                  isActive
                    ? 'bg-sky-500/20 border-sky-500/60 text-white shadow-sm ring-1 ring-sky-500/30'
                    : 'bg-white/[0.03] border-white/5 text-white/80 hover:bg-white/[0.07] hover:border-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <span
                    className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-sky-500/30 text-sky-200 font-semibold' : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {cue.startTimeVtt.slice(3, 8)}
                  </span>
                  {cue.speaker && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                      {cue.speaker}
                    </span>
                  )}
                </div>
                <p className={`text-xs leading-relaxed break-words ${isActive ? 'font-medium' : ''}`}>{cue.text}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
