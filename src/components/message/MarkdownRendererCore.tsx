import React, { useEffect, useRef } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import ReactMarkdown from 'react-markdown';
import { useProcessedMarkdown } from './markdown/useProcessedMarkdown';
import { useMarkdownComponents, MarkdownComponentsContext } from './markdown/useMarkdownComponents';
import type { MarkdownRendererCoreProps, MarkdownRendererProps } from './markdown/markdownTypes';

export type { MarkdownRendererCoreProps, MarkdownRendererProps };

export const MarkdownRendererCore: React.FC<MarkdownRendererCoreProps> = React.memo(
  ({
    content,
    messageId,
    isLoading,
    onImageClick,
    onOpenHtmlPreview,
    onLiveArtifactFollowUp,
    expandCodeBlocksByDefault,
    isMermaidRenderingEnabled,
    isGraphvizRenderingEnabled,
    themeId,
    onOpenSidePanel,
    hideThinkingInContext,
    files,
    diagramLoadMode = 'deferred',
    diagramRenderDelayMs = diagramLoadMode === 'eager' ? 0 : 500,
    interactiveMode = 'enabled',
    contentPreNormalized = false,
    liveArtifactFontSize,
    liveArtifactsMode,
    unwrapMislabeledHtmlBlocks = true,
    hasPendingCodeExecution = false,
    remarkPlugins,
    rehypePlugins,
  }) => {
    const { t } = useI18n();
    const isInteractive = interactiveMode !== 'disabled';

    const handlersRef = useRef({ onImageClick, onOpenHtmlPreview, onLiveArtifactFollowUp, onOpenSidePanel });
    useEffect(() => {
      handlersRef.current = { onImageClick, onOpenHtmlPreview, onLiveArtifactFollowUp, onOpenSidePanel };
    });

    const { components, contextValue } = useMarkdownComponents({
      handlersRef,
      isInteractive,
      messageId,
      files,
      isLoading,
      expandCodeBlocksByDefault,
      isMermaidRenderingEnabled,
      isGraphvizRenderingEnabled,
      themeId,
      diagramLoadMode,
      diagramRenderDelayMs,
      liveArtifactFontSize,
      liveArtifactsMode,
      hasPendingCodeExecution,
      previewLabel: t('preview'),
    });

    const { processedContent } = useProcessedMarkdown({
      content,
      contentPreNormalized,
      isLoading,
      unwrapMislabeledHtmlBlocks,
      hideThinkingInContext,
      thinkingRawProcessLabel: t('thinkingRawProcess'),
    });

    return (
      <div className={isLoading ? 'is-loading' : ''}>
        <MarkdownComponentsContext.Provider value={contextValue}>
          <ReactMarkdown
            remarkPlugins={remarkPlugins}
            rehypePlugins={rehypePlugins}
            components={components}
            urlTransform={(url) => url}
          >
            {processedContent}
          </ReactMarkdown>
        </MarkdownComponentsContext.Provider>
      </div>
    );
  },
);
