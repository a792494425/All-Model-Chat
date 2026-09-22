import type React from 'react';
import type { PluggableList } from 'unified';
import type { UploadedFile, SideViewContent } from '@/types';
import type { OpenHtmlPreviewHandler } from '@/utils/html-preview/previewPrivilege';
import type { LiveArtifactFollowupPayload } from '@/utils/live-artifacts/liveArtifactFollowup';

export interface MarkdownRendererProps {
  content: string;
  messageId?: string;
  isLoading: boolean;
  onImageClick: (file: UploadedFile, messageId?: string) => void;
  onOpenHtmlPreview: OpenHtmlPreviewHandler;
  onLiveArtifactFollowUp?: (payload: LiveArtifactFollowupPayload) => void;
  expandCodeBlocksByDefault: boolean;
  isMermaidRenderingEnabled: boolean;
  isGraphvizRenderingEnabled: boolean;
  allowHtml?: boolean;
  themeId: string;
  onOpenSidePanel: (content: SideViewContent) => void;
  hideThinkingInContext?: boolean;
  files?: UploadedFile[];
  diagramLoadMode?: 'deferred' | 'eager';
  diagramRenderDelayMs?: number;
  interactiveMode?: 'enabled' | 'disabled';
  contentPreNormalized?: boolean;
  liveArtifactFontSize?: number;
  liveArtifactsMode?: boolean;
  unwrapMislabeledHtmlBlocks?: boolean;
  /** True while the stream has emitted an executableCode part with no result yet. */
  hasPendingCodeExecution?: boolean;
}

export interface MarkdownRendererCoreProps extends MarkdownRendererProps {
  remarkPlugins: PluggableList;
  rehypePlugins: PluggableList;
}

export type MarkdownCodeProps = React.ComponentPropsWithoutRef<'code'> & {
  inline?: boolean;
  children?: React.ReactNode;
};

export type MarkdownImageProps = React.ComponentPropsWithoutRef<'img'>;
export type MarkdownTableProps = React.ComponentPropsWithoutRef<'table'>;
export type MarkdownAnchorProps = React.ComponentPropsWithoutRef<'a'>;
export type MarkdownDivProps = React.ComponentPropsWithoutRef<'div'>;
export type MarkdownPreProps = React.ComponentPropsWithoutRef<'pre'> & {
  children?: React.ReactNode;
  node?: {
    position?: {
      start?: {
        offset?: number;
      };
    };
  };
};

export interface MarkdownHandlers {
  onImageClick: (file: UploadedFile, messageId?: string) => void;
  onOpenHtmlPreview: OpenHtmlPreviewHandler;
  onLiveArtifactFollowUp?: (payload: LiveArtifactFollowupPayload) => void;
  onOpenSidePanel: (content: SideViewContent) => void;
}
