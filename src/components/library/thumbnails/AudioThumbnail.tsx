import React from 'react';
import { Music, Play } from 'lucide-react';
import type { LibraryItem } from '@/types';
import { generateDeterministicWaveform as generateWaveform } from '@/utils/media/audioWaveform';

interface AudioThumbnailProps {
  item: LibraryItem;
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  waveformBars: number[];
  ext: string;
  containerRef?: React.Ref<HTMLDivElement>;
}

export const AudioThumbnail: React.FC<AudioThumbnailProps> = ({
  item,
  size = 'sm',
  className = '',
  waveformBars,
  ext,
  containerRef,
}) => {
  const audioSizeClasses =
    size === 'sm'
      ? 'w-10 h-10 rounded-lg'
      : size === 'md'
        ? 'w-16 h-16 rounded-xl'
        : size === 'lg'
          ? 'w-full h-40 rounded-t-2xl'
          : 'w-full h-full';

  const containerClassName = className.replace(/\bobject-(contain|cover|fill|none|scale-down)\b/g, '').trim();
  const displayExt = ext || 'AUDIO';
  const bars = waveformBars.length > 0 ? waveformBars : generateWaveform(`${item.id}:${item.name}`);

  if (size === 'full' || size === 'lg') {
    return (
      <div
        ref={containerRef}
        className={`relative ${audioSizeClasses} overflow-hidden bg-neutral-50/90 dark:bg-neutral-900/80 text-[var(--theme-text-primary)] flex-shrink-0 flex flex-col justify-center items-center border border-[var(--theme-border-secondary)] select-none transition-colors duration-200 group/audio ${containerClassName}`}
      >
        <div className="absolute top-2.5 right-2.5 z-10">
          <span className="font-mono text-[9px] font-semibold tracking-wider px-2 py-0.5 rounded-md uppercase bg-neutral-200/70 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 border border-neutral-300/50 dark:border-neutral-700/50 shadow-xs pointer-events-none">
            {displayExt}
          </span>
        </div>

        <span className="sr-only">{item.name}</span>

        <div className="relative w-full h-full flex flex-col items-center justify-center px-6 py-4">
          <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-px bg-neutral-200/80 dark:bg-neutral-800 pointer-events-none" />

          <div className="flex items-center justify-center gap-[3px] h-20 w-full max-w-[260px] px-2 overflow-hidden z-10">
            {bars.slice(0, 36).map((height, i) => (
              <span
                key={i}
                className="w-[3px] rounded-full bg-neutral-400/80 dark:bg-neutral-500/80 group-hover/audio:bg-neutral-800 dark:group-hover/audio:bg-neutral-200 transition-all duration-200 shrink-0"
                style={{
                  height: `${Math.max(12, Math.round(height * 100))}%`,
                  minHeight: '6px',
                }}
              />
            ))}
          </div>

          <div className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-neutral-900/85 dark:bg-white/90 text-white dark:text-neutral-900 shadow-md flex items-center justify-center opacity-0 group-hover/audio:opacity-100 group-hover/audio:scale-100 scale-90 transition-all duration-200 pointer-events-none z-20 backdrop-blur-xs">
            <Play size={15} fill="currentColor" className="ml-0.5" />
          </div>
        </div>
      </div>
    );
  }

  if (size === 'md') {
    return (
      <div
        ref={containerRef}
        className={`relative ${audioSizeClasses} overflow-hidden bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 flex-shrink-0 flex flex-col justify-between p-2 border border-neutral-200 dark:border-neutral-800 select-none ${containerClassName}`}
      >
        <div className="flex items-center justify-center pt-0.5">
          <Music size={14} className="text-neutral-600 dark:text-neutral-400" />
        </div>
        <div className="flex items-center justify-center gap-[2px] h-5 w-full overflow-hidden">
          {bars.slice(0, 10).map((height, i) => (
            <span
              key={i}
              className="w-[2px] rounded-full bg-neutral-400 dark:bg-neutral-500"
              style={{ height: `${Math.max(20, Math.round(height * 100))}%` }}
            />
          ))}
        </div>
        <div className="flex justify-center">
          <span className="text-[8px] font-mono font-semibold text-neutral-500 dark:text-neutral-400 tracking-wider uppercase">
            {displayExt.slice(0, 4)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-10 h-10 rounded-lg flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 shadow-xs flex-shrink-0"
    >
      <div className="flex items-end justify-center gap-[2px] h-4">
        <span className="w-[2.5px] h-2.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
        <span className="w-[2.5px] h-4 rounded-full bg-neutral-700 dark:bg-neutral-300" />
        <span className="w-[2.5px] h-3 rounded-full bg-neutral-500 dark:bg-neutral-400" />
        <span className="w-[2.5px] h-1.5 rounded-full bg-neutral-400/80 dark:bg-neutral-600" />
      </div>
    </div>
  );
};
