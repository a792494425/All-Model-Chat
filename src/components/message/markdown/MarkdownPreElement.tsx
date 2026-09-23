import React, { type RefObject } from 'react';
import type { UploadedFile } from '@/types';
import { extractTextFromNode, findCodeElement } from '@/utils/format/reactNodeText';
import { loadNamedComponent } from '@/utils/lazyNamedComponent';
import { CodeBlock } from '@/components/message/blocks/CodeBlock';
import { CodeExecutionBlock } from '@/components/message/blocks/CodeExecutionBlock';
import { DeferredDiagramBlock } from '@/components/message/blocks/DeferredDiagramBlock';
import type { MarkdownHandlers, MarkdownPreProps } from './markdownTypes';

const loadMermaidBlock = () =>
  loadNamedComponent(() => import('@/components/message/blocks/MermaidBlock'), 'MermaidBlock');
const loadGraphvizBlock = () =>
  loadNamedComponent(() => import('@/components/message/blocks/GraphvizBlock'), 'GraphvizBlock');

interface MarkdownPreElementProps extends MarkdownPreProps {
  files?: UploadedFile[];
  messageId?: string;
  expandCodeBlocksByDefault: boolean;
  isInteractive: boolean;
  isLoading: boolean;
  liveArtifactFontSize?: number;
  themeId: string;
  liveArtifactsMode?: boolean;
  hasPendingCodeExecution?: boolean;
  isMermaidRenderingEnabled: boolean;
  isGraphvizRenderingEnabled: boolean;
  diagramLoadMode?: 'deferred' | 'eager';
  diagramRenderDelayMs?: number;
  previewLabel: string;
  handlersRef: RefObject<MarkdownHandlers>;
}

export const MarkdownPreElement: React.FC<MarkdownPreElementProps> = ({
  children,
  node,
  files,
  messageId,
  expandCodeBlocksByDefault,
  isInteractive,
  isLoading,
  liveArtifactFontSize,
  themeId,
  liveArtifactsMode,
  hasPendingCodeExecution = false,
  isMermaidRenderingEnabled,
  isGraphvizRenderingEnabled,
  diagramLoadMode = 'deferred',
  diagramRenderDelayMs = diagramLoadMode === 'eager' ? 0 : 500,
  previewLabel,
  handlersRef,
  ...rest
}) => {
  const codeElement = findCodeElement(children);
  const codeClassName = codeElement?.props.className || '';
  const codeContent = codeElement?.props.children;
  const rawCode = extractTextFromNode(codeContent);

  const langMatch = codeClassName.match(/language-(\S+)/);
  const language = langMatch ? langMatch[1] : '';
  const isGraphviz = language === 'graphviz' || language === 'dot';

  const isServerCodeExecution = typeof rest.className === 'string' && rest.className.includes('code-exec-code');

  const cacheKey = messageId ? `${messageId}:${node?.position?.start?.offset ?? 0}` : undefined;

  const codeBlock = (
    <CodeBlock
      {...rest}
      files={files}
      messageId={messageId}
      cacheKey={cacheKey}
      className={codeClassName}
      onOpenHtmlPreview={(payload, options) => handlersRef.current?.onOpenHtmlPreview(payload, options)}
      onLiveArtifactFollowUp={(payload) => handlersRef.current?.onLiveArtifactFollowUp?.(payload)}
      onImageClick={(file) => handlersRef.current?.onImageClick(file)}
      expandCodeBlocksByDefault={expandCodeBlocksByDefault}
      showPreviewControls={isInteractive}
      isLoading={isLoading}
      onOpenSidePanel={(content) => handlersRef.current?.onOpenSidePanel(content)}
      liveArtifactFontSize={liveArtifactFontSize}
      themeId={themeId}
      liveArtifactsMode={liveArtifactsMode}
      disableRun={isServerCodeExecution}
    >
      {codeElement || children}
    </CodeBlock>
  );

  if (isServerCodeExecution) {
    return <CodeExecutionBlock isRunning={hasPendingCodeExecution}>{codeBlock}</CodeExecutionBlock>;
  }

  if (isMermaidRenderingEnabled && language === 'mermaid' && typeof rawCode === 'string') {
    return (
      <DeferredDiagramBlock
        label={`Mermaid ${previewLabel}`}
        load={loadMermaidBlock}
        componentProps={{
          code: rawCode,
          onImageClick: (file) => handlersRef.current?.onImageClick(file),
          isLoading,
          renderDelayMs: diagramRenderDelayMs,
          themeId,
          onOpenSidePanel: (content) => handlersRef.current?.onOpenSidePanel(content),
        }}
        eager={diagramLoadMode === 'eager'}
      />
    );
  }

  if (isGraphvizRenderingEnabled && isGraphviz && typeof rawCode === 'string') {
    return (
      <DeferredDiagramBlock
        label={`Graphviz ${previewLabel}`}
        load={loadGraphvizBlock}
        componentProps={{
          code: rawCode,
          onImageClick: (file) => handlersRef.current?.onImageClick(file),
          isLoading,
          renderDelayMs: diagramRenderDelayMs,
          themeId,
          onOpenSidePanel: (content) => handlersRef.current?.onOpenSidePanel(content),
        }}
        eager={diagramLoadMode === 'eager'}
      />
    );
  }

  return codeBlock;
};
