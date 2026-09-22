import { act } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { setupProviderTestRenderer } from '@/test/render/providerRenderer';
import { MessageText } from '@/components/message/content/MessageText';
import { createAppSettings } from '@/test/data/factories';
import type { ChatMessage } from '@/types';

describe('Live Artifact stream completion integration', () => {
  const renderer = setupProviderTestRenderer({ providers: { language: 'zh' } });

  beforeAll(async () => {
    await Promise.all([
      import('@/components/message/StandardMarkdownRenderer'),
      import('@/components/message/MathMarkdownRenderer'),
    ]);
  });

  it('preserves the artifact iframe DOM node and does not reload when isLoading flips to false', async () => {
    const rawArtifact = '<div id="live-root" style="padding: 20px;"><h1>Streaming Title</h1></div>';

    const messageLoading: ChatMessage = {
      id: 'msg-stream-1',
      role: 'model',
      content: rawArtifact,
      isLoading: true,
      timestamp: new Date(),
    };

    const messageFinished: ChatMessage = {
      id: 'msg-stream-1',
      role: 'model',
      content: rawArtifact,
      isLoading: false,
      timestamp: new Date(),
    };

    const defaultAppSettings = createAppSettings({
      isLiveArtifactsEnabled: true,
      unwrapMislabeledHtmlBlocks: true,
    });

    await act(async () => {
      renderer.render(
        <MessageText
          message={messageLoading}
          showThoughts={false}
          appSettings={defaultAppSettings}
          themeId="onyx"
          baseFontSize={16}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const iframeDuringStream = renderer.container.querySelector('iframe');

    await act(async () => {
      renderer.render(
        <MessageText
          message={messageFinished}
          showThoughts={false}
          appSettings={defaultAppSettings}
          themeId="onyx"
          baseFontSize={16}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const iframeAfterFinish = renderer.container.querySelector('iframe');
    expect(iframeAfterFinish).not.toBeNull();
    expect(iframeAfterFinish).toBe(iframeDuringStream);
  });

  it('preserves the artifact iframe when the message has prose before the artifact and closes an open fence', async () => {
    const streamingContent = '为您创建的交互式组件如下：\n\n```amc-live-artifact-html\n<div class="test">Streaming';
    const finishedContent =
      '为您创建的交互式组件如下：\n\n```amc-live-artifact-html\n<div class="test">Streaming</div>\n```';

    const messageLoading: ChatMessage = {
      id: 'msg-stream-2',
      role: 'model',
      content: streamingContent,
      isLoading: true,
      timestamp: new Date(),
    };

    const messageFinished: ChatMessage = {
      id: 'msg-stream-2',
      role: 'model',
      content: finishedContent,
      isLoading: false,
      timestamp: new Date(),
    };

    const defaultAppSettings = createAppSettings({
      isLiveArtifactsEnabled: true,
      unwrapMislabeledHtmlBlocks: true,
    });

    await act(async () => {
      renderer.render(
        <MessageText
          message={messageLoading}
          showThoughts={false}
          appSettings={defaultAppSettings}
          themeId="onyx"
          baseFontSize={16}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const iframeDuringStream = renderer.container.querySelector('iframe');

    await act(async () => {
      renderer.render(
        <MessageText
          message={messageFinished}
          showThoughts={false}
          appSettings={defaultAppSettings}
          themeId="onyx"
          baseFontSize={16}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const iframeAfterFinish = renderer.container.querySelector('iframe');
    expect(iframeAfterFinish).not.toBeNull();
    expect(iframeAfterFinish).toBe(iframeDuringStream);
  });

  it('preserves the artifact iframe when the message has prose before an unclosed bare HTML fragment', async () => {
    const streamingContent =
      '为您创建的交互式组件如下：\n\n<div style="--amc-live-artifact-accent: #3b82f6;" class="test">Streaming';
    const finishedContent =
      '为您创建的交互式组件如下：\n\n<div style="--amc-live-artifact-accent: #3b82f6;" class="test">Streaming</div>';

    const messageLoading: ChatMessage = {
      id: 'msg-stream-3',
      role: 'model',
      content: streamingContent,
      isLoading: true,
      timestamp: new Date(),
    };

    const messageFinished: ChatMessage = {
      id: 'msg-stream-3',
      role: 'model',
      content: finishedContent,
      isLoading: false,
      timestamp: new Date(),
    };

    const defaultAppSettings = createAppSettings({
      isLiveArtifactsEnabled: true,
      unwrapMislabeledHtmlBlocks: true,
    });

    await act(async () => {
      renderer.render(
        <MessageText
          message={messageLoading}
          showThoughts={false}
          appSettings={defaultAppSettings}
          themeId="onyx"
          baseFontSize={16}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const iframeDuringStream = renderer.container.querySelector('iframe');

    await act(async () => {
      renderer.render(
        <MessageText
          message={messageFinished}
          showThoughts={false}
          appSettings={defaultAppSettings}
          themeId="onyx"
          baseFontSize={16}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    const iframeAfterFinish = renderer.container.querySelector('iframe');
    expect(iframeAfterFinish).not.toBeNull();
    expect(iframeAfterFinish).toBe(iframeDuringStream);
  });
});
