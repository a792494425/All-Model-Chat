import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Check, ChevronDown, ChevronUp, Copy, CornerRightDown, Languages, List, Quote } from 'lucide-react';
import { LazyMarkdownRenderer } from '@/components/message/LazyMarkdownRenderer';
import { copyTextToClipboard } from '@/utils/clipboard';

export const GHOST_PILL_CLASS =
  'flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-[var(--theme-text-secondary)] transition-colors hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] disabled:opacity-50 disabled:pointer-events-none';

export interface AskPanelContentProps {
  selectedText: string;
  answer: string;
  isLoading: boolean;
  error: string | null;
  themeId: string;
  question: string;
  targetDocument: Document;
  targetWindow: Window;
  onInsert?: (text: string) => void;
  onQuote?: (text: string) => void;
  handleQuick: (type: 'explain' | 'translate' | 'summarize') => void;
  handleAsk: (q: string) => void;
  t: (key: string) => string;
}

export const AskPanelContent: React.FC<AskPanelContentProps> = ({
  selectedText,
  answer,
  isLoading,
  error,
  themeId,
  question,
  targetDocument,
  targetWindow,
  onInsert,
  onQuote,
  handleQuick,
  handleAsk,
  t,
}) => {
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [isPreviewClamped, setIsPreviewClamped] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const answerContainerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLParagraphElement>(null);
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    if (!isCopied) return;
    const id = targetWindow.setTimeout(() => setIsCopied(false), 1200);
    return () => targetWindow.clearTimeout(id);
  }, [isCopied, targetWindow]);

  useEffect(() => {
    const answerContainer = answerContainerRef.current;
    if (!answerContainer) return;
    if (!shouldAutoScrollRef.current) return;
    answerContainer.scrollTop = answerContainer.scrollHeight;
  }, [answer]);

  // 实测预览是否被 line-clamp 截断（字符数估算行数不可靠），决定“展开”入口显隐
  useEffect(() => {
    const previewElement = previewRef.current;
    if (!previewElement) return;
    const fallbackClamped = selectedText.length > 90;
    const checkClampedState = () => {
      const measuredClamped = previewElement.scrollHeight > previewElement.clientHeight + 1;
      setIsPreviewClamped(measuredClamped || fallbackClamped);
    };
    checkClampedState();
    // 下一帧再测一次，确保 line-clamp 样式已生效
    const animationFrameId = targetWindow.requestAnimationFrame(checkClampedState);
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(checkClampedState) : null;
    resizeObserver?.observe(previewElement);
    return () => {
      targetWindow.cancelAnimationFrame(animationFrameId);
      resizeObserver?.disconnect();
    };
  }, [selectedText, isPreviewExpanded, targetWindow]);

  const handleAnswerScroll = useCallback(() => {
    const answerContainer = answerContainerRef.current;
    if (!answerContainer) return;
    const distanceToBottom = answerContainer.scrollHeight - answerContainer.scrollTop - answerContainer.clientHeight;
    shouldAutoScrollRef.current = distanceToBottom < 80;
  }, []);

  const handleCopyAnswer = useCallback(async () => {
    if (!answer) return;
    const isCopySuccessful = await copyTextToClipboard(answer, targetDocument);
    if (isCopySuccessful) {
      setIsCopied(true);
    }
  }, [answer, targetDocument]);

  const handleInsertAnswer = useCallback(() => {
    if (!answer || !onInsert) return;
    onInsert(answer);
  }, [answer, onInsert]);

  const handleQuoteAnswer = useCallback(() => {
    if (!answer || !onQuote) return;
    onQuote(answer);
  }, [answer, onQuote]);

  const hasAnswer = Boolean(answer);
  const showEmptyState = !hasAnswer && !isLoading && !error;

  return (
    <>
      <div
        ref={answerContainerRef}
        onScroll={handleAnswerScroll}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-3"
      >
        <div className="mb-3 shrink-0 rounded-xl bg-[var(--theme-bg-secondary)]/70 px-3 py-2">
          <p
            ref={previewRef}
            className={`${isPreviewExpanded ? '' : 'line-clamp-2'} whitespace-pre-wrap break-words text-xs leading-relaxed text-[var(--theme-text-primary)]`}
          >
            {selectedText}
          </p>
          {(isPreviewExpanded || isPreviewClamped || selectedText.length > 90) && (
            <button
              onClick={() => setIsPreviewExpanded((prevExpanded) => !prevExpanded)}
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--theme-text-link)] hover:underline"
            >
              {isPreviewExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {isPreviewExpanded ? t('collapse') : `${t('expand')} · ${selectedText.length}`}
            </button>
          )}
        </div>

        {showEmptyState && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2.5 py-2">
            {(
              [
                ['explain', t('askExplain'), BookOpen],
                ['translate', t('askTranslate'), Languages],
                ['summarize', t('askSummarize'), List],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => handleQuick(key)}
                className="group flex w-full max-w-[340px] items-center gap-3 rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]/50 px-4 py-3 text-left transition-all hover:border-[var(--theme-border-focus)]/40 hover:bg-[var(--theme-bg-tertiary)]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--theme-bg-accent)]/10 text-[var(--theme-text-link)] transition-colors group-hover:bg-[var(--theme-bg-accent)]/20">
                  <Icon size={16} />
                </span>
                <span className="text-sm font-medium text-[var(--theme-text-primary)]">{label}</span>
              </button>
            ))}
          </div>
        )}

        {isLoading && !hasAnswer && (
          <div className="flex items-center justify-center gap-2.5 pb-6 pt-2 text-sm text-[var(--theme-text-secondary)]">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--theme-text-link)] border-t-transparent" />
            {t('askThinking')}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-[var(--theme-text-danger)]/20 bg-[var(--theme-bg-error-message)] px-3.5 py-3">
            <p className="text-sm leading-relaxed text-[var(--theme-text-danger)]">{error}</p>
            <button
              onClick={() => question.trim() && handleAsk(question)}
              disabled={!question.trim()}
              className="mt-2.5 rounded-full bg-[var(--theme-bg-danger)] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--theme-bg-danger-hover)] disabled:opacity-50 disabled:pointer-events-none"
            >
              {t('retryButtonTitle')}
            </button>
          </div>
        )}

        {hasAnswer && (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:overflow-auto prose-pre:bg-[var(--theme-bg-code-block)]">
            <LazyMarkdownRenderer
              content={answer}
              isLoading={isLoading}
              onImageClick={() => {}}
              onOpenHtmlPreview={() => {}}
              expandCodeBlocksByDefault={false}
              isMermaidRenderingEnabled={true}
              isGraphvizRenderingEnabled={true}
              themeId={themeId}
              onOpenSidePanel={() => {}}
            />
            {isLoading && (
              <span className="ml-0.5 inline-flex translate-y-[-1px] items-center gap-0.5 align-middle">
                {[0, 120, 240].map((delay) => (
                  <span
                    key={delay}
                    className="h-1 w-1 animate-bounce rounded-full bg-[var(--theme-text-link)]"
                    style={{ animationDelay: `-${delay}ms` }}
                  />
                ))}
              </span>
            )}
          </div>
        )}
      </div>

      {hasAnswer && (
        <div className="flex shrink-0 items-center gap-0.5 border-t border-[var(--theme-border-primary)] px-2.5 py-1.5">
          <button onClick={handleCopyAnswer} className={GHOST_PILL_CLASS}>
            {isCopied ? <Check size={13} className="text-[var(--theme-text-success)]" /> : <Copy size={13} />}
            {isCopied ? t('copied') : t('askCopyAnswer')}
          </button>
          {onInsert && (
            <button onClick={handleInsertAnswer} className={GHOST_PILL_CLASS}>
              <CornerRightDown size={13} />
              {t('askInsertAnswer')}
            </button>
          )}
          {onQuote && (
            <button onClick={handleQuoteAnswer} className={GHOST_PILL_CLASS}>
              <Quote size={13} />
              {t('quote')}
            </button>
          )}
        </div>
      )}
    </>
  );
};
