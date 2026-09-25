import React from 'react';
import { FileCode } from 'lucide-react';
import type { LibraryItem } from '@/types';
import { renderHighlightedCodeLine } from '@/utils/library/codeSnippetHighlight';

interface TextSnippetThumbnailProps {
  item: LibraryItem;
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  textLines: string[];
  ext: string;
}

export const TextSnippetThumbnail: React.FC<TextSnippetThumbnailProps> = ({
  item,
  size = 'sm',
  className = '',
  textLines,
  ext,
}) => {
  const textSnippetSizeClasses =
    size === 'sm'
      ? 'w-10 h-10 rounded-lg'
      : size === 'md'
        ? 'w-16 h-16 rounded-xl'
        : size === 'lg'
          ? 'w-full h-40 rounded-t-2xl'
          : 'w-full h-full';

  const containerClassName = className.replace(/\bobject-(contain|cover|fill|none|scale-down)\b/g, '').trim();
  const displayExt = ext || (item.name.startsWith('.') ? item.name.slice(1).toUpperCase() : 'TXT');

  if (size === 'full' || size === 'lg') {
    return (
      <div
        className={`relative ${textSnippetSizeClasses} overflow-hidden bg-[#181825] text-[#cdd6f4] flex-shrink-0 flex flex-col border border-[var(--theme-border-secondary)] font-mono select-none ${containerClassName}`}
      >
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#11111b] border-b border-white/5 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <FileCode size={12} className="text-white/40 shrink-0" />
            <span className="text-[10px] text-white/70 font-sans font-medium truncate max-w-[150px]">{item.name}</span>
          </div>
          <span className="font-semibold tracking-wider text-[9px] text-white/50 uppercase shrink-0">{displayExt}</span>
        </div>

        <div className="p-2.5 sm:p-3 flex-1 overflow-hidden flex flex-col justify-start gap-1 font-mono text-[10px] leading-[1.55]">
          {textLines.map((line, lineIndex) => (
            <div key={lineIndex} className="flex items-start gap-2 min-w-0">
              <span className="text-white/20 select-none text-[9px] w-3 text-right shrink-0 pt-0.5">
                {lineIndex + 1}
              </span>
              <span className="truncate flex-1 text-white/85 font-mono">
                {renderHighlightedCodeLine(line, displayExt)}
              </span>
            </div>
          ))}
        </div>

        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs flex items-center gap-1 pointer-events-none text-white/90 text-[10px] font-bold tracking-wider shadow-xs uppercase">
          {displayExt}
        </div>
      </div>
    );
  }

  if (size === 'md') {
    return (
      <div
        className={`relative ${textSnippetSizeClasses} overflow-hidden bg-[#181825] text-[#cdd6f4] flex-shrink-0 flex flex-col justify-between p-2 border border-[var(--theme-border-secondary)] font-mono select-none ${containerClassName}`}
      >
        <div className="flex flex-col gap-0.5 overflow-hidden text-[8px] leading-[1.3] text-white/70">
          {textLines.slice(0, 3).map((line, lineIndex) => (
            <div key={lineIndex} className="truncate">
              {line.trim() || ' '}
            </div>
          ))}
        </div>
        <span className="text-[9px] font-bold text-[#89dceb] tracking-wider uppercase">{displayExt.slice(0, 4)}</span>
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center bg-[#181825] text-[#89dceb] border border-[var(--theme-border-secondary)] font-semibold flex-shrink-0 font-mono shadow-xs">
      {displayExt && displayExt.length <= 4 ? (
        <span className="text-[10px] font-bold tracking-wider leading-none text-[#89dceb] uppercase font-mono">
          {displayExt}
        </span>
      ) : (
        <FileCode size={18} strokeWidth={2} className="text-[#89b4fa]" />
      )}
    </div>
  );
};
