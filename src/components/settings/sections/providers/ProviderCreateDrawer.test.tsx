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
    }),
  ];

  it('renders custom provider modal fields and no tabs', () => {
    const onComplete = vi.fn();
    const onClose = vi.fn();

    act(() => {
      renderer.render(
        <ProviderCreateDrawer isOpen={true} onClose={onClose} existingConnections={existing} onComplete={onComplete} />,
      );
    });

    // Verify there are no tabs or preset matrices
    expect(renderer.container.querySelector('[data-testid="tab-preset"]')).toBeNull();
    expect(renderer.container.querySelector('[data-testid="tab-duplicate"]')).toBeNull();

    // Verify core custom provider fields exist
    const nameInput = renderer.container.querySelector<HTMLInputElement>('input[placeholder="Name"]');
    expect(nameInput?.value).toBe('Custom Provider');

    const urlInput = renderer.container.querySelector<HTMLInputElement>('#provider-drawer-baseurl');
    expect(urlInput).not.toBeNull();

    const keyInput = renderer.container.querySelector<HTMLInputElement>('#provider-drawer-apikey');
    expect(keyInput).not.toBeNull();

    const confirmBtn = renderer.container.querySelector<HTMLButtonElement>(
      '[data-testid="add-provider-confirm-button"]',
    );
    expect(confirmBtn).not.toBeNull();
  });

  it('allows creating a custom provider with custom values', () => {
    const onComplete = vi.fn();
    const onClose = vi.fn();

    act(() => {
      renderer.render(
        <ProviderCreateDrawer isOpen={true} onClose={onClose} existingConnections={[]} onComplete={onComplete} />,
      );
    });

    const inputs = Array.from(renderer.container.querySelectorAll<HTMLInputElement>('input'));
    const nameInput = inputs[0];
    const notesInput = inputs[1];
    const urlInput = renderer.container.querySelector<HTMLInputElement>('#provider-drawer-baseurl');
    const keyInput = renderer.container.querySelector<HTMLInputElement>('#provider-drawer-apikey');

    const imageInput = renderer.container.querySelector<HTMLInputElement>('input[placeholder*="http"]');
    expect(imageInput).not.toBeNull();

    act(() => {
      fireEvent.change(nameInput!, { target: { value: 'My OneAPI Proxy' } });
      fireEvent.change(notesInput!, { target: { value: 'Work Team' } });
      fireEvent.change(imageInput!, { target: { value: 'https://example.com/logo.png' } });
      fireEvent.change(urlInput!, { target: { value: 'https://oneapi.example.com/v1' } });
      fireEvent.change(keyInput!, { target: { value: 'sk-proxy-123456' } });
    });

    // Switch protocol to Anthropic
    const anthropicBtn = Array.from(renderer.container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Anthropic',
    );
    expect(anthropicBtn).toBeDefined();

    act(() => {
      anthropicBtn?.click();
    });

    const saveBtn = renderer.container.querySelector<HTMLButtonElement>('[data-testid="add-provider-confirm-button"]');
    act(() => {
      saveBtn?.click();
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'My OneAPI Proxy',
        baseUrl: 'https://oneapi.example.com/v1',
        apiKey: 'sk-proxy-123456',
        protocol: 'anthropic',
        templateId: 'custom-anthropic',
        icon: 'https://example.com/logo.png',
        notes: 'Work Team',
        enabled: true,
      }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handles closing the modal via cancel button', () => {
    const onComplete = vi.fn();
    const onClose = vi.fn();

    act(() => {
      renderer.render(
        <ProviderCreateDrawer isOpen={true} onClose={onClose} existingConnections={[]} onComplete={onComplete} />,
      );
    });

    const cancelBtn = Array.from(renderer.container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Cancel' || b.textContent?.trim() === '取消',
    );
    expect(cancelBtn).toBeDefined();

    act(() => {
      cancelBtn?.click();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
  });
});
