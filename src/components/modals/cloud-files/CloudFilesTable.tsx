import React, { type MouseEvent } from 'react';
import type { File as GeminiFile } from '@google/genai';
import { CheckCheck, Clock, Copy, Loader2, Trash2 } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { interpolate } from '@/i18n/interpolate';
import { formatFileSize } from '@/utils/file/fileSize';
import { getFileDisplayMeta } from '@/utils/file/fileDisplayStyles';

export interface CloudFilesTableProps {
  files: GeminiFile[];
  selectedFileNames: Set<string>;
  allFilteredSelected: boolean;
  onSelectAllToggle: () => void;
  onToggleSelectFile: (fileName: string) => void;
  onRowDoubleClick: (file: GeminiFile) => void;
  onCopyId: (name: string, e?: MouseEvent) => void;
  copiedFileName: string | null;
  onSetFileToDelete: (file: GeminiFile) => void;
}

const getRemainingHours = (expirationTime?: string | number): number | null => {
  if (!expirationTime) return null;
  const timestamp = typeof expirationTime === 'number' ? expirationTime : Date.parse(expirationTime);
  if (!Number.isFinite(timestamp)) return null;
  const diffMs = timestamp - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60));
};

const getFileIcon = (mimeType?: string, displayName?: string) => {
  const { Icon: FileIcon, colorClass } = getFileDisplayMeta({ type: mimeType, name: displayName });
  return <FileIcon size={18} className={`${colorClass} flex-shrink-0`} strokeWidth={1.75} />;
};

export const CloudFilesTable: React.FC<CloudFilesTableProps> = ({
  files,
  selectedFileNames,
  allFilteredSelected,
  onSelectAllToggle,
  onToggleSelectFile,
  onRowDoubleClick,
  onCopyId,
  copiedFileName,
  onSetFileToDelete,
}) => {
  const { t } = useI18n();

  return (
    <div className="border border-[var(--theme-border-secondary)] rounded-xl overflow-hidden bg-[var(--theme-bg-secondary)]/20">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)]/60 text-[var(--theme-text-secondary)] select-none">
            <th className="py-2.5 px-3 w-10 text-center">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={onSelectAllToggle}
                className="rounded border-[var(--theme-border-secondary)] text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </th>
            <th className="py-2.5 px-3 font-semibold">{t('cloudFilesColName')}</th>
            <th className="py-2.5 px-3 font-semibold w-28">{t('cloudFilesColStatus')}</th>
            <th className="py-2.5 px-3 font-semibold w-28">{t('cloudFilesColExpires')}</th>
            <th className="py-2.5 px-3 font-semibold w-24 text-right">{t('cloudFilesColSize')}</th>
            <th className="py-2.5 px-3 font-semibold w-16 text-center">{t('cloudFilesColActions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--theme-border-secondary)]">
          {files.map((file) => {
            const fileName = file.name ?? '';
            const isSelected = selectedFileNames.has(fileName);
            const hoursLeft = getRemainingHours(file.expirationTime);
            const isExpired = hoursLeft !== null && hoursLeft <= 0;
            const duration = file.videoMetadata?.videoDuration;

            return (
              <tr
                key={fileName || file.uri}
                onClick={() => fileName && onToggleSelectFile(fileName)}
                onDoubleClick={() => onRowDoubleClick(file)}
                className={`group cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-500/10 hover:bg-blue-500/15' : 'hover:bg-[var(--theme-bg-secondary)]/50'
                }`}
              >
                <td
                  className="py-2.5 px-3 text-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (fileName) onToggleSelectFile(fileName);
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => fileName && onToggleSelectFile(fileName)}
                    className="rounded border-[var(--theme-border-secondary)] text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </td>
                <td className="py-2.5 px-3 max-w-[240px] sm:max-w-xs">
                  <div className="flex items-center gap-2.5">
                    {getFileIcon(file.mimeType, file.displayName || file.name)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--theme-text-primary)] truncate">
                        {file.displayName || file.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--theme-text-tertiary)] font-mono">
                        <span className="truncate">{file.name}</span>
                        {fileName && (
                          <button
                            type="button"
                            onClick={(e) => onCopyId(fileName, e)}
                            title={t('cloudFilesCopyId')}
                            className="text-[var(--theme-text-tertiary)] hover:text-blue-500 transition-colors cursor-pointer"
                          >
                            {copiedFileName === fileName ? (
                              <CheckCheck size={12} className="text-emerald-500" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        )}
                        {typeof duration === 'string' && duration && (
                          <span className="ml-1 px-1 py-0.5 rounded bg-[var(--theme-bg-tertiary)] text-[10px]">
                            {duration}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  {file.state === 'ACTIVE' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      ACTIVE
                    </span>
                  ) : file.state === 'PROCESSING' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-600 border border-blue-500/20">
                      <Loader2 size={10} className="animate-spin" />
                      PROCESSING
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-600 border border-rose-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      {file.state || 'FAILED'}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  {isExpired ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-500">
                      <Clock size={12} />
                      {t('cloudFilesExpired')}
                    </span>
                  ) : hoursLeft !== null ? (
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                        hoursLeft <= 2 ? 'text-amber-500' : 'text-[var(--theme-text-tertiary)]'
                      }`}
                    >
                      <Clock size={12} />
                      {interpolate(t('cloudFilesExpiresIn'), { hours: hoursLeft.toString() })}
                    </span>
                  ) : (
                    <span className="text-[11px] text-[var(--theme-text-tertiary)]">-</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono text-[var(--theme-text-secondary)]">
                  {formatFileSize(Number(file.sizeBytes) || 0)}
                </td>
                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetFileToDelete(file);
                    }}
                    title={t('cloudFilesDelete')}
                    className="p-1.5 rounded-lg text-[var(--theme-text-tertiary)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
