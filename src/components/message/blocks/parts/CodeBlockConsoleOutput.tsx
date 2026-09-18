import React from 'react';
import { Terminal, RotateCcw, X, AlertTriangle, FileOutput } from 'lucide-react';
import { FileDisplay } from '@/components/message/FileDisplay';
import { useI18n } from '@/contexts/I18nContext';
import type { GeneratedFileEntry } from './useCodeBlockPyodide';

interface CodeBlockConsoleOutputProps {
  hasRun: boolean;
  isRunning: boolean;
  output?: string | null;
  error?: string | null;
  displayInlineImage?: string | null;
  generatedFiles: GeneratedFileEntry[];
  onReset: () => void;
  onClear: () => void;
}

export const CodeBlockConsoleOutput: React.FC<CodeBlockConsoleOutputProps> = ({
  hasRun,
  isRunning,
  output,
  error,
  displayInlineImage,
  generatedFiles,
  onReset,
  onClear,
}) => {
  const { t } = useI18n();

  if (!hasRun) return null;

  return (
    <div className="border-t border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] rounded-b-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex select-none items-center justify-between px-3 py-1.5 bg-[var(--theme-bg-tertiary)]/50">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-1.5">
          <Terminal size={12} /> {t('codeLocalPythonOutput')}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onReset}
            className="p-1 rounded-md text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-secondary)] transition-colors"
            title={t('codeResetView')}
          >
            <RotateCcw size={12} />
          </button>
          <button
            onClick={onClear}
            className="p-1 rounded-md text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-secondary)] transition-colors"
            title={t('codeCloseConsole')}
          >
            <X size={12} />
          </button>
        </div>
      </div>

      <div className="p-3 max-h-[400px] overflow-auto custom-scrollbar">
        {error && (
          <div className="text-red-500 text-xs font-mono whitespace-pre-wrap mb-2 flex gap-2">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {output && (
          <div className="text-[var(--theme-text-primary)] text-xs font-mono whitespace-pre-wrap leading-relaxed opacity-90 mb-2">
            {output}
          </div>
        )}

        {displayInlineImage && (
          <div className="mt-2 mb-2 rounded-lg overflow-hidden border border-[var(--theme-border-secondary)] inline-block bg-white">
            <img src={displayInlineImage} alt={t('codePlotAlt')} className="max-w-full h-auto block" />
          </div>
        )}

        {generatedFiles.length > 0 && (
          <div className="mt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex select-none items-center gap-1.5 mb-2">
              <FileOutput size={12} /> {t('codeGeneratedFiles')}
            </span>
            <div className="flex flex-wrap gap-2">
              {generatedFiles.map((file) => (
                <FileDisplay key={file.id} file={file} isFromMessageList={true} isGemini3={false} />
              ))}
            </div>
          </div>
        )}

        {!error && !output && !displayInlineImage && generatedFiles.length === 0 && !isRunning && (
          <div className="text-[var(--theme-text-tertiary)] text-xs italic">{t('codeExecutedNoOutput')}</div>
        )}
      </div>
    </div>
  );
};
