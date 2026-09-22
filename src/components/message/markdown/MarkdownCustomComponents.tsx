import React, { useContext } from 'react';
import { InlineCode } from '@/components/message/code/InlineCode';
import { TableBlock } from '@/components/message/blocks/TableBlock';
import { ToolResultBlock } from '@/components/message/blocks/ToolResultBlock';
import { MarkdownImageElement } from './MarkdownImageElement';
import { MarkdownAnchorElement } from './MarkdownAnchorElement';
import { MarkdownPreElement } from './MarkdownPreElement';
import { MarkdownComponentsContext } from './MarkdownComponentsContext';
import type {
  MarkdownCodeProps,
  MarkdownDivProps,
  MarkdownImageProps,
  MarkdownAnchorProps,
  MarkdownPreProps,
  MarkdownTableProps,
} from './markdownTypes';

export const MarkdownCode: React.FC<MarkdownCodeProps> = (props) => <InlineCode {...props} />;

export const MarkdownImg: React.FC<MarkdownImageProps> = (props) => {
  const ctx = useContext(MarkdownComponentsContext);
  if (!ctx) {
    return <img {...props} />;
  }
  return (
    <MarkdownImageElement
      {...props}
      isInteractive={ctx.isInteractive}
      handlersRef={ctx.handlersRef}
      messageId={ctx.messageId}
    />
  );
};

export const MarkdownTable: React.FC<MarkdownTableProps> = (props) => <TableBlock {...props} />;

export const MarkdownAnchor: React.FC<MarkdownAnchorProps> = (props) => {
  const ctx = useContext(MarkdownComponentsContext);
  return <MarkdownAnchorElement {...props} messageId={ctx?.messageId} />;
};

export const MarkdownDiv: React.FC<MarkdownDivProps> = (props) => {
  const ctx = useContext(MarkdownComponentsContext);
  const { className, children, ...rest } = props;
  if (className?.includes('tool-result')) {
    return (
      <ToolResultBlock
        className={className}
        files={ctx?.files}
        onImageClick={(file) => ctx?.handlersRef.current?.onImageClick(file)}
        {...rest}
      >
        {children}
      </ToolResultBlock>
    );
  }
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
};

export const MarkdownPre: React.FC<MarkdownPreProps> = (props) => {
  const ctx = useContext(MarkdownComponentsContext);
  if (!ctx) {
    return <pre {...props} />;
  }
  return (
    <MarkdownPreElement
      {...props}
      files={ctx.files}
      messageId={ctx.messageId}
      expandCodeBlocksByDefault={ctx.expandCodeBlocksByDefault}
      isInteractive={ctx.isInteractive}
      isLoading={ctx.isLoading}
      liveArtifactFontSize={ctx.liveArtifactFontSize}
      themeId={ctx.themeId}
      liveArtifactsMode={ctx.liveArtifactsMode}
      hasPendingCodeExecution={ctx.hasPendingCodeExecution}
      isMermaidRenderingEnabled={ctx.isMermaidRenderingEnabled}
      isGraphvizRenderingEnabled={ctx.isGraphvizRenderingEnabled}
      diagramLoadMode={ctx.diagramLoadMode}
      diagramRenderDelayMs={ctx.diagramRenderDelayMs}
      previewLabel={ctx.previewLabel}
      handlersRef={ctx.handlersRef}
    />
  );
};
