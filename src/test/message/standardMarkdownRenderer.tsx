import { act, type ComponentProps } from 'react';
import { vi } from 'vitest';
import { StandardMarkdownRenderer } from '@/components/message/StandardMarkdownRenderer';
import type { TestRenderer } from '@/test/render/renderer';

export type StandardMarkdownRendererTestProps = Partial<ComponentProps<typeof StandardMarkdownRenderer>> & {
  content: string;
};

export const createStandardMarkdownRendererElement = (props: StandardMarkdownRendererTestProps) => (
  <StandardMarkdownRenderer
    isLoading={false}
    onImageClick={vi.fn()}
    onOpenHtmlPreview={vi.fn()}
    expandCodeBlocksByDefault={false}
    isMermaidRenderingEnabled={false}
    isGraphvizRenderingEnabled={false}
    themeId="pearl"
    onOpenSidePanel={vi.fn()}
    liveArtifactsMode={props.liveArtifactsMode ?? true}
    {...props}
  />
);

export const renderStandardMarkdown = (renderer: TestRenderer, props: StandardMarkdownRendererTestProps) => {
  act(() => {
    renderer.render(createStandardMarkdownRendererElement(props));
  });
};
