import React, { type RefObject } from 'react';
import { useI18n } from '@/contexts/I18nContext';

interface CodeBlockPreProps {
  preRef: RefObject<HTMLPreElement>;
  className?: string;
  isWrapped: boolean;
  isExpanded: boolean;
  isOverflowing: boolean;
  lineCount: number;
  lineNumbers: number[];
  bottomPaddingClass: string;
  bottomPaddingPlainClass: string;
  collapseThresholdPx: number;
  codeElement?: React.ReactElement | null;
  children: React.ReactNode;
  onLineMouseDown: (num: number, e: React.MouseEvent) => void;
  onLineMouseEnter: (num: number) => void;
}

export const CodeBlockPre: React.FC<CodeBlockPreProps> = ({
  preRef,
  className,
  isWrapped,
  isExpanded,
  isOverflowing,
  lineCount,
  lineNumbers,
  bottomPaddingClass,
  bottomPaddingPlainClass,
  collapseThresholdPx,
  codeElement,
  children,
  onLineMouseDown,
  onLineMouseEnter,
}) => {
  const { t } = useI18n();

  return (
    <pre
      ref={preRef}
      className={`${className || ''} group !m-0 !p-0 !border-none !rounded-none rounded-b-lg !bg-transparent custom-scrollbar ${
        isWrapped ? '!whitespace-pre-wrap !break-all !overflow-x-hidden' : '!whitespace-pre !overflow-x-auto'
      }`}
      style={{
        overflowY: isExpanded || !isOverflowing ? 'visible' : 'hidden',
        maxHeight: isExpanded || !isOverflowing ? 'none' : `${collapseThresholdPx}px`,
      }}
    >
      {lineCount > 0 ? (
        <div className={`flex ${isWrapped ? 'w-full' : 'min-w-full w-fit'}`}>
          <div
            data-code-gutter
            aria-hidden="true"
            className={`select-none !py-4 pl-2.5 pr-2.5 text-right font-mono text-[13px] sm:text-sm leading-relaxed text-[var(--theme-text-tertiary)]/40 border-r border-[var(--theme-border-secondary)]/30 shrink-0 sticky left-0 bg-[var(--theme-bg-code-block)] z-[1] ${bottomPaddingClass}`}
          >
            {lineNumbers.map((num) => (
              <span
                key={num}
                data-line-number={num}
                onMouseDown={(e) => onLineMouseDown(num, e)}
                onMouseEnter={() => onLineMouseEnter(num)}
                className="block cursor-pointer hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]/60 rounded px-1 -mx-1 transition-colors"
                title={t('codeSelectLine').replace('{line}', String(num))}
              >
                {num}
              </span>
            ))}
          </div>
          {codeElement ? (
            React.cloneElement(codeElement as React.ReactElement, {
              'data-code-content': 'true',
              className: `${codeElement.props.className || ''} !py-4 !pl-3.5 !pr-4 ${bottomPaddingClass} ${
                isWrapped ? '!whitespace-pre-wrap !break-all min-w-0' : '!whitespace-pre'
              } !block font-mono text-[13px] sm:text-sm leading-relaxed !cursor-text flex-1 text-[var(--theme-text-primary)]`,
              onClick: undefined,
              title: undefined,
            })
          ) : (
            <span
              data-code-content="true"
              className={`block !py-4 !pl-3.5 !pr-4 font-mono text-sm flex-1 text-[var(--theme-text-primary)] ${bottomPaddingPlainClass} ${
                isWrapped ? 'whitespace-pre-wrap break-all min-w-0' : 'whitespace-pre'
              }`}
            >
              {children}
            </span>
          )}
        </div>
      ) : codeElement ? (
        React.cloneElement(codeElement as React.ReactElement, {
          className: `${codeElement.props.className || ''} !p-4 ${bottomPaddingClass} ${
            isWrapped ? '!whitespace-pre-wrap !break-all' : '!whitespace-pre'
          } !block font-mono text-[13px] sm:text-sm leading-relaxed !cursor-text text-[var(--theme-text-primary)]`,
          onClick: undefined,
          title: undefined,
        })
      ) : (
        <span
          className={`block p-4 font-mono text-sm text-[var(--theme-text-primary)] ${bottomPaddingPlainClass} ${
            isWrapped ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
          }`}
        >
          {children}
        </span>
      )}
    </pre>
  );
};
