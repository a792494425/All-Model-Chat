import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { setupProviderTestRenderer } from '@/test/render/providerRenderer';
import { createThirdPartyConnection } from '@/test/data/factories';
import { ProviderCreateDrawer } from './ProviderCreateDrawer';

describe('ProviderCreateDrawer', () => {
  const renderer = setupProviderTestRenderer({ providers: { language: 'en' } });

  const existing = [
    createThirdPartyConnection({
      id: 'conn-1',
      name: 'My SiliconFlow',
      apiKey: 'sk-existing',
      baseUrl: 'https://api.siliconflow.cn/v1',
      models: [{ id: 'deepseek-v3', name: 'DeepSeek V3' }],
    }),
  ];

  it('renders preset mode by default and allows switching templates', () => {
    const onComplete = vi.fn();
    const onClose = vi.fn();

    act(() => {
      renderer.render(
        <ProviderCreateDrawer
          isOpen={true}
          onClose={onClose}
          existingConnections={existing}
          onComplete={onComplete}
        />,
      );
    });

    expect(renderer.container.querySelector('[data-testid="tab-preset"]')).not.toBeNull();
    expect(renderer.container.querySelector('[data-testid="tab-duplicate"]')).not.toBeNull();
    expect(renderer.container.querySelector('[data-testid="tab-custom"]')).not.toBeNull();

    // Default template is DeepSeek
    const nameInput = renderer.container.querySelector<HTMLInputElement>('input[placeholder="Name"]');
    expect(nameInput?.value).toBe('DeepSeek');

    // Click OpenAI preset button
    const buttons = Array.from(renderer.container.querySelectorAll('button'));
    const openaiBtn = buttons.find((b) => b.textContent?.includes('OpenAI') && !b.getAttribute('data-testid'));
    expect(openaiBtn).toBeDefined();

    act(() => {
      openaiBtn?.click();
    });

    expect(nameInput?.value).toBe('OpenAI');
  });

  it('allows duplicating from existing connections', () => {
    const onComplete = vi.fn();
    const onClose = vi.fn();

    act(() => {
      renderer.render(
        <ProviderCreateDrawer
          isOpen={true}
          onClose={onClose}
          existingConnections={existing}
          onComplete={onComplete}
          initialMode="duplicate"
        />,
      );
    });

    const nameInput = renderer.container.querySelector<HTMLInputElement>('input[placeholder="Name"]');
    expect(nameInput?.value).toBe('My SiliconFlow Copy');

    // Click save
    const saveBtn = renderer.container.querySelector<HTMLButtonElement>('[data-testid="add-provider-confirm-button"]');
    expect(saveBtn).not.toBeNull();

    act(() => {
      saveBtn?.click();
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    const created = onComplete.mock.calls[0][0];
    expect(created.name).toBe('My SiliconFlow Copy');
    expect(created.baseUrl).toBe('https://api.siliconflow.cn/v1');
    expect(created.apiKey).toBe('sk-existing');
    expect(created.models[0].providerId).toBe(created.id);
  });

  it('allows creating custom providers', () => {
    const onComplete = vi.fn();
    const onClose = vi.fn();

    act(() => {
      renderer.render(
        <ProviderCreateDrawer
          isOpen={true}
          onClose={onClose}
          existingConnections={[]}
          onComplete={onComplete}
          initialMode="custom"
        />,
      );
    });

    const nameInput = renderer.container.querySelector<HTMLInputElement>('input[placeholder="Name"]');
    const urlInput = renderer.container.querySelector<HTMLInputElement>('#provider-drawer-baseurl');

    act(() => {
      fireEvent.change(nameInput!, { target: { value: 'Local vLLM' } });
      fireEvent.change(urlInput!, { target: { value: 'http://localhost:8000/v1' } });
    });

    const saveBtn = renderer.container.querySelector<HTMLButtonElement>('[data-testid="add-provider-confirm-button"]');
    act(() => {
      saveBtn?.click();
    });

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Local vLLM',
        baseUrl: 'http://localhost:8000/v1',
        protocol: 'openai-compatible',
      }),
    );
  });

  it('fetches models via /v1/models in drawer and attaches them to the created provider', async () => {
    const onComplete = vi.fn();
    const openaiCompatibleApi = await import('@/services/api/openaiCompatibleApi');
    vi.spyOn(openaiCompatibleApi, 'fetchOpenAICompatibleModels').mockResolvedValueOnce([
      { id: 'qwen-2.5-72b', name: 'Qwen 2.5 72B' },
      { id: 'deepseek-r1-distill', name: 'DeepSeek R1 Distill' },
    ]);

    act(() => {
      renderer.render(
        <ProviderCreateDrawer
          isOpen={true}
          onClose={vi.fn()}
          existingConnections={[]}
          onComplete={onComplete}
          initialMode="custom"
        />,
      );
    });

    const nameInput = renderer.container.querySelector<HTMLInputElement>('input[placeholder="Name"]');
    const urlInput = renderer.container.querySelector<HTMLInputElement>('#provider-drawer-baseurl');
    const keyInput = renderer.container.querySelector<HTMLInputElement>('#provider-drawer-apikey');

    act(() => {
      fireEvent.change(nameInput!, { target: { value: 'SiliconFlow Test' } });
      fireEvent.change(urlInput!, { target: { value: 'https://api.siliconflow.cn/v1' } });
      fireEvent.change(keyInput!, { target: { value: 'sk-silicon-test' } });
    });

    const fetchBtn = renderer.container.querySelector<HTMLButtonElement>('[data-testid="drawer-fetch-models-button"]');
    expect(fetchBtn).not.toBeNull();

    await act(async () => {
      fetchBtn?.click();
    });

    expect(renderer.container.textContent).toContain('2');

    const saveBtn = renderer.container.querySelector<HTMLButtonElement>('[data-testid="add-provider-confirm-button"]');
    act(() => {
      saveBtn?.click();
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    const created = onComplete.mock.calls[0][0];
    expect(created.models).toHaveLength(2);
    expect(created.models[0].id).toBe('qwen-2.5-72b');
    expect(created.models[1].id).toBe('deepseek-r1-distill');
    expect(created.models[0].providerId).toBe(created.id);
    expect(created.models[0].connectionName).toBe('SiliconFlow Test');
  });

  it('filters presets by category and search keyword', () => {
    act(() => {
      renderer.render(
        <ProviderCreateDrawer
          isOpen={true}
          onClose={vi.fn()}
          existingConnections={[]}
          onComplete={vi.fn()}
        />,
      );
    });

    const searchInput = renderer.container.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
    expect(searchInput).not.toBeNull();

    act(() => {
      fireEvent.change(searchInput!, { target: { value: 'SiliconFlow' } });
    });

    // Should match SiliconFlow
    expect(renderer.container.textContent).toContain('SiliconFlow');

    // Click category Domestic
    const buttons = Array.from(renderer.container.querySelectorAll('button'));
    const domesticBtn = buttons.find((b) => b.textContent === 'Domestic');
    expect(domesticBtn).toBeDefined();

    act(() => {
      domesticBtn?.click();
    });

    expect(renderer.container.textContent).toContain('SiliconFlow');
  });

  it('allows resetting Base URL to default when modified', () => {
    act(() => {
      renderer.render(
        <ProviderCreateDrawer
          isOpen={true}
          onClose={vi.fn()}
          existingConnections={[]}
          onComplete={vi.fn()}
        />,
      );
    });

    const urlInput = renderer.container.querySelector<HTMLInputElement>('#provider-drawer-baseurl');
    expect(urlInput?.value).toBe('https://api.deepseek.com');

    act(() => {
      fireEvent.change(urlInput!, { target: { value: 'https://custom-proxy.internal/v1' } });
    });

    expect(urlInput?.value).toBe('https://custom-proxy.internal/v1');

    // Reset button should now be visible
    const buttons = Array.from(renderer.container.querySelectorAll('button'));
    const resetBtn = buttons.find((b) => b.textContent?.includes('Reset'));
    expect(resetBtn).toBeDefined();

    act(() => {
      resetBtn?.click();
    });

    expect(urlInput?.value).toBe('https://api.deepseek.com');
  });
});
