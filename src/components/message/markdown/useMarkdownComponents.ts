import { useMemo } from 'react';
import type { Components } from 'react-markdown';
import {
  MarkdownCode,
  MarkdownImg,
  MarkdownTable,
  MarkdownAnchor,
  MarkdownDiv,
  MarkdownPre,
} from './MarkdownCustomComponents';
import { MarkdownComponentsContext, type MarkdownComponentsContextValue } from './MarkdownComponentsContext';

export { MarkdownComponentsContext, type MarkdownComponentsContextValue };

export const STATIC_MARKDOWN_COMPONENTS: Components = {
  code: MarkdownCode as Components['code'],
  img: MarkdownImg as Components['img'],
  table: MarkdownTable as Components['table'],
  a: MarkdownAnchor as Components['a'],
  div: MarkdownDiv as Components['div'],
  pre: MarkdownPre as Components['pre'],
};

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
  diagramLoadMode,
  diagramRenderDelayMs,
  liveArtifactFontSize,
  liveArtifactsMode,
  hasPendingCodeExecution,
  previewLabel,
}: MarkdownComponentsContextValue) => {
  const contextValue = useMemo<MarkdownComponentsContextValue>(
    () => ({
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
      previewLabel,
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

  return {
    components: STATIC_MARKDOWN_COMPONENTS,
    contextValue,
  };
};
