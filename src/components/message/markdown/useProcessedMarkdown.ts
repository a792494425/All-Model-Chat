import { useMemo } from 'react';
import { stripGemmaThoughtMarkup, wrapReasoningMarkup } from '@/utils/chat/reasoning';
import { normalizePreviewableMarkdownContent, transformMarkdownTextSegments } from '@/utils/markdown';
import { extractSingleLiveArtifactFence, normalizeEscapedMathDelimiters } from './markdownContentUtils';

interface UseProcessedMarkdownOptions {
  content: string;
  contentPreNormalized?: boolean;
  isLoading: boolean;
  unwrapMislabeledHtmlBlocks?: boolean;
  hideThinkingInContext?: boolean;
  thinkingRawProcessLabel: string;
}

export const useProcessedMarkdown = ({
  content,
  contentPreNormalized = false,
  isLoading,
  unwrapMislabeledHtmlBlocks = true,
  hideThinkingInContext,
  thinkingRawProcessLabel,
}: UseProcessedMarkdownOptions) => {
  const processedContent = useMemo(() => {
    if (!content) return '';

    const normalizedContent = contentPreNormalized
      ? content
      : normalizePreviewableMarkdownContent(content, {
          isStreaming: isLoading,
          unwrapMislabeledHtmlBlocks,
        });
    const contentWithNormalizedMath = transformMarkdownTextSegments(normalizedContent, normalizeEscapedMathDelimiters);

    if (hideThinkingInContext) {
      return wrapReasoningMarkup(contentWithNormalizedMath, isLoading, thinkingRawProcessLabel);
    }

    return stripGemmaThoughtMarkup(contentWithNormalizedMath);
  }, [
    content,
    contentPreNormalized,
    hideThinkingInContext,
    isLoading,
    thinkingRawProcessLabel,
    unwrapMislabeledHtmlBlocks,
  ]);

  const singleLiveArtifact = useMemo(() => extractSingleLiveArtifactFence(processedContent), [processedContent]);

  return { processedContent, singleLiveArtifact };
};
