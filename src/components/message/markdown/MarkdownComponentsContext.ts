import { createContext, type RefObject } from 'react';
import type { UploadedFile } from '@/types';
import type { MarkdownHandlers } from './markdownTypes';

export interface MarkdownComponentsContextValue {
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

export const MarkdownComponentsContext = createContext<MarkdownComponentsContextValue | null>(null);
