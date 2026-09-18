import { useMemo, type RefObject } from 'react';
import { InlineCode } from '@/components/message/code/InlineCode';
import { TableBlock } from '@/components/message/blocks/TableBlock';
import { ToolResultBlock } from '@/components/message/blocks/ToolResultBlock';
import { MarkdownImageElement } from './MarkdownImageElement';
import { MarkdownAnchorElement } from './MarkdownAnchorElement';
import { MarkdownPreElement } from './MarkdownPreElement';
import type {
  MarkdownCodeProps,
  MarkdownDivProps,
  MarkdownHandlers,
  MarkdownImageProps,
  MarkdownAnchorProps,
  MarkdownPreProps,
  MarkdownTableProps,
} from './markdownTypes';
import type { UploadedFile } from '@/types';

interface UseMarkdownComponentsOptions {
  handlersRef: RefObject<MarkdownHandlers>;
  isInteractive: boolean;
  messageId?: string;
  files?: UploadedFile[];
  isLoading: boolean;
  expandCodeBlocksByDefault: boolean;
  isMermaidRenderingEnabled: boolean;
  isGraphvizRenderingEnabled: boolean;
  themeId: string;
  diagramLoadMode?: 'deferred' | 'eager';
  diagramRenderDelayMs?: number;
  liveArtifactFontSize?: number;
  liveArtifactsMode?: boolean;
  hasPendingCodeExecution?: boolean;
  previewLabel: string;
}

export const useMarkdownComponents = ({
  handlersRef,
  isInteractive,
  messageId,
  files,
  isLoading,
  expandCodeBlocksByDefault,
  isMermaidRenderingEnabled,
  isGraphvizRenderingEnabled,
  themeId,
  diagramLoadMode = 'deferred',
  diagramRenderDelayMs = diagramLoadMode === 'eager' ? 0 : 500,
  liveArtifactFontSize,
  liveArtifactsMode,
  hasPendingCodeExecution = false,
  previewLabel,
}: UseMarkdownComponentsOptions) => {
  return useMemo(
    () => ({
      code: (props: MarkdownCodeProps) => <InlineCode {...props} />,
      img: (props: MarkdownImageProps) => (
        <MarkdownImageElement {...props} isInteractive={isInteractive} handlersRef={handlersRef} />
      ),
      table: (props: MarkdownTableProps) => <TableBlock {...props} />,
      a: (props: MarkdownAnchorProps) => <MarkdownAnchorElement {...props} messageId={messageId} />,
      div: (props: MarkdownDivProps) => {
        const { className, children, ...rest } = props;
        if (className?.includes('tool-result')) {
          return (
            <ToolResultBlock
              className={className}
              files={files}
              onImageClick={(file) => handlersRef.current?.onImageClick(file)}
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
      },
      pre: (props: MarkdownPreProps) => (
        <MarkdownPreElement
          {...props}
          files={files}
          messageId={messageId}
          expandCodeBlocksByDefault={expandCodeBlocksByDefault}
          isInteractive={isInteractive}
          isLoading={isLoading}
          liveArtifactFontSize={liveArtifactFontSize}
          themeId={themeId}
          liveArtifactsMode={liveArtifactsMode}
          hasPendingCodeExecution={hasPendingCodeExecution}
          isMermaidRenderingEnabled={isMermaidRenderingEnabled}
          isGraphvizRenderingEnabled={isGraphvizRenderingEnabled}
          diagramLoadMode={diagramLoadMode}
          diagramRenderDelayMs={diagramRenderDelayMs}
          previewLabel={previewLabel}
          handlersRef={handlersRef}
        />
      ),
    }),
    [
      diagramLoadMode,
      diagramRenderDelayMs,
      expandCodeBlocksByDefault,
      files,
      handlersRef,
      hasPendingCodeExecution,
      isGraphvizRenderingEnabled,
      isInteractive,
      isLoading,
      isMermaidRenderingEnabled,
      liveArtifactFontSize,
      liveArtifactsMode,
      messageId,
      previewLabel,
      themeId,
    ],
  );
};
