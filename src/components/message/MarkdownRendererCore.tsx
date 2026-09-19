import React, { useEffect, useRef } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import ReactMarkdown from 'react-markdown';
import { CodeBlock } from './blocks/CodeBlock';
import { useProcessedMarkdown } from './markdown/useProcessedMarkdown';
import { useMarkdownComponents } from './markdown/useMarkdownComponents';
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

    const components = useMarkdownComponents({
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

    const { processedContent, singleLiveArtifact } = useProcessedMarkdown({
      content,
      contentPreNormalized,
      isLoading,
      unwrapMislabeledHtmlBlocks,
      hideThinkingInContext,
      thinkingRawProcessLabel: t('thinkingRawProcess'),
    });

    if (isInteractive && singleLiveArtifact) {
      return (
        <div className={isLoading ? 'is-loading' : ''}>
          <CodeBlock
            cacheKey={messageId ? `${messageId}:direct-live-artifact` : undefined}
            files={files}
            messageId={messageId}
            className={`language-${singleLiveArtifact.language}`}
            onOpenHtmlPreview={onOpenHtmlPreview}
            onLiveArtifactFollowUp={onLiveArtifactFollowUp}
            onImageClick={onImageClick}
            expandCodeBlocksByDefault={expandCodeBlocksByDefault}
            showPreviewControls={isInteractive}
            isLoading={isLoading}
            onOpenSidePanel={onOpenSidePanel}
            liveArtifactFontSize={liveArtifactFontSize}
            themeId={themeId}
            liveArtifactsMode={liveArtifactsMode}
          >
            <code className={`language-${singleLiveArtifact.language}`}>{singleLiveArtifact.code}</code>
          </CodeBlock>
        </div>
      );
    }

    return (
      <div className={isLoading ? 'is-loading' : ''}>
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={components}
          urlTransform={(url) => url}
        >
          {processedContent}
        </ReactMarkdown>
      </div>
    );
  },
);
