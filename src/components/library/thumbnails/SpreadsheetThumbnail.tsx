import React from 'react';
import { FileSpreadsheet, Table } from 'lucide-react';
import type { LibraryItem } from '@/types';

interface SpreadsheetThumbnailProps {
  item: LibraryItem;
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  spreadsheetRows: string[][];
  ext: string;
  containerRef?: React.Ref<HTMLDivElement>;
}

export const SpreadsheetThumbnail: React.FC<SpreadsheetThumbnailProps> = ({
  item,
  size = 'sm',
  className = '',
  spreadsheetRows,
  ext,
  containerRef,
}) => {
  const spreadsheetSizeClasses =
    size === 'sm'
      ? 'w-10 h-10 rounded-lg'
      : size === 'md'
        ? 'w-16 h-16 rounded-xl'
        : size === 'lg'
          ? 'w-full h-40 rounded-t-2xl'
          : 'w-full h-full';

  const containerClassName = className.replace(/\bobject-(contain|cover|fill|none|scale-down)\b/g, '').trim();
  const displayExt = ext || 'XLSX';

  const numCols = 4;
  const colLabels = ['A', 'B', 'C', 'D'];
  const rowsToDisplay =
    spreadsheetRows.length > 0
      ? spreadsheetRows.slice(0, 5)
      : [
          ['Item', 'Qty', 'Price', 'Status'],
          ['Alpha', '12', '$240', 'Active'],
          ['Beta', '4', '$85', 'Pending'],
          ['Gamma', '89', '$1,290', 'Done'],
        ];

  if (size === 'full' || size === 'lg') {
    return (
      <div
        ref={containerRef}
        className={`relative ${spreadsheetSizeClasses} overflow-hidden bg-[#071911] text-[#a7f3d0] flex-shrink-0 flex flex-col border border-[var(--theme-border-secondary)] font-mono select-none ${containerClassName}`}
      >
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#04120c] border-b border-emerald-500/20 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Table size={12} className="text-emerald-400 shrink-0" />
            <span className="text-[10px] text-emerald-200/90 font-sans font-medium truncate max-w-[150px]">
              {item.name}
            </span>
          </div>
          <span className="font-semibold tracking-wider text-[9px] text-emerald-400/80 uppercase shrink-0">
            {displayExt}
          </span>
        </div>

        <div className="p-2 flex-1 overflow-hidden flex flex-col relative font-mono text-[9px]">
          <div className="grid grid-cols-5 gap-0.5 mb-0.5">
            <div className="text-center py-0.5 text-[8px] text-emerald-500/50 bg-emerald-950/70 rounded-xs font-bold">
              #
            </div>
            {colLabels.slice(0, numCols).map((col) => (
              <div
                key={col}
                className="text-center py-0.5 text-[8px] text-emerald-300 font-bold bg-emerald-950/70 rounded-xs uppercase"
              >
                {col}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
            {rowsToDisplay.map((row, rIdx) => (
              <div key={rIdx} className="grid grid-cols-5 gap-0.5 items-center">
                <div className="text-center py-0.5 text-[8px] text-emerald-500/40 bg-emerald-950/30 rounded-xs select-none">
                  {rIdx + 1}
                </div>
                {Array.from({ length: numCols }).map((_, cIdx) => {
                  const val = row[cIdx] !== undefined ? String(row[cIdx]) : '';
                  return (
                    <div
                      key={cIdx}
                      className={`truncate px-1 py-0.5 text-[8.5px] rounded-xs ${
                        rIdx === 0 && spreadsheetRows.length > 0
                          ? 'font-bold text-emerald-200 bg-emerald-900/40'
                          : 'text-emerald-100/80 bg-emerald-950/20'
                      }`}
                    >
                      {val || '\u00A0'}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#071911] to-transparent pointer-events-none" />
        </div>

        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-emerald-800/80 backdrop-blur-xs flex items-center gap-1 pointer-events-none text-white text-[10px] font-bold tracking-wider shadow-xs uppercase">
          {displayExt}
        </div>
      </div>
    );
  }

  if (size === 'md') {
    return (
      <div
        ref={containerRef}
        className={`relative ${spreadsheetSizeClasses} overflow-hidden bg-[#071911] text-[#a7f3d0] flex-shrink-0 flex flex-col justify-between p-2 border border-emerald-500/30 font-mono select-none ${containerClassName}`}
      >
        <div className="flex flex-col gap-1 overflow-hidden text-[7px] leading-tight">
          {rowsToDisplay.slice(0, 3).map((row, idx) => (
            <div key={idx} className="flex gap-1 truncate text-emerald-200/80">
              <span className="w-2.5 text-emerald-500/50">{idx + 1}</span>
              <span className="truncate">{row.filter(Boolean).slice(0, 2).join(' · ') || '...'}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-emerald-500/20">
          <Table size={10} className="text-emerald-400" />
          <span className="text-[9px] font-bold text-emerald-400 tracking-wider uppercase">
            {displayExt.slice(0, 4)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-10 h-10 rounded-lg flex flex-col items-center justify-center bg-[#071911] text-emerald-400 border border-emerald-500/30 font-semibold flex-shrink-0 font-mono shadow-xs"
    >
      {displayExt && displayExt.length <= 4 ? (
        <span className="text-[10px] font-bold tracking-wider leading-none text-emerald-400 uppercase font-mono">
          {displayExt}
        </span>
      ) : (
        <FileSpreadsheet size={18} strokeWidth={2} className="text-emerald-400" />
      )}
    </div>
  );
};
