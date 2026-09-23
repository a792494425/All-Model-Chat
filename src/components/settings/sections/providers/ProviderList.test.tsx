import { act } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { setupProviderTestRenderer } from '@/test/render/providerRenderer';
import { createThirdPartyConnection } from '@/test/data/factories';
import { ProviderList } from './ProviderList';

describe('ProviderList', () => {
  const renderer = setupProviderTestRenderer({ providers: { language: 'en' } });

  const mockConnections = [
    createThirdPartyConnection({
      id: 'conn-1',
      name: 'DeepSeek',
      templateId: 'deepseek',
      protocol: 'openai-compatible',
      apiKey: 'sk-123',
      baseUrl: 'https://api.deepseek.com',
      models: [{ id: 'deepseek-chat', name: 'DeepSeek Chat', providerId: 'conn-1' }],
      enabled: true,
    }),
  ];

  it('renders configured connections and does not render official Gemini', () => {
    act(() => {
      renderer.render(
        <ProviderList
          connections={mockConnections}
          selectedConnectionId="conn-1"
          onSelectConnection={vi.fn()}
          onReorder={vi.fn()}
          onAddConnection={vi.fn()}
          onEditConnection={vi.fn()}
          onDuplicateConnection={vi.fn()}
          onDeleteConnection={vi.fn()}
          onProbeConnection={vi.fn()}
        />,
      );
    });

    expect(renderer.container.textContent).not.toContain('Google Gemini');
    expect(renderer.container.textContent).toContain('DeepSeek');
  });

  it('selects preset when clicked in unconfigured presets list', () => {
    const handleSelect = vi.fn();

    act(() => {
      renderer.render(
        <ProviderList
          connections={mockConnections}
          selectedConnectionId="conn-1"
          onSelectConnection={handleSelect}
          onReorder={vi.fn()}
          onAddConnection={vi.fn()}
          onEditConnection={vi.fn()}
          onDuplicateConnection={vi.fn()}
          onDeleteConnection={vi.fn()}
          onProbeConnection={vi.fn()}
        />,
      );
    });

    const siliconItem = renderer.container.querySelector<HTMLElement>('[data-testid="preset-item-siliconflow"]');
    expect(siliconItem).not.toBeNull();

    act(() => {
      siliconItem?.click();
    });

    expect(handleSelect).toHaveBeenCalledWith('preset:siliconflow');
  });

  it('calls onAddConnection when clicking the add custom button', () => {
    const handleAdd = vi.fn();

    act(() => {
      renderer.render(
        <ProviderList
          connections={mockConnections}
          selectedConnectionId="conn-1"
          onSelectConnection={vi.fn()}
          onReorder={vi.fn()}
          onAddConnection={handleAdd}
          onEditConnection={vi.fn()}
          onDuplicateConnection={vi.fn()}
          onDeleteConnection={vi.fn()}
          onProbeConnection={vi.fn()}
        />,
      );
    });

    const addBtn = renderer.container.querySelector<HTMLButtonElement>('[data-settings-item="providers-add"]');
    expect(addBtn).not.toBeNull();

    act(() => {
      addBtn?.click();
    });

    expect(handleAdd).toHaveBeenCalledTimes(1);
  });

  it('renders connection notes and custom icon when configured', () => {
    const customConn = [
      createThirdPartyConnection({
        id: 'conn-notes',
        name: 'My Custom Endpoint',
        templateId: 'custom-openai',
        protocol: 'openai-compatible',
        apiKey: 'sk-123',
        baseUrl: 'https://api.my-endpoint.com/v1',
        icon: '🚀',
        notes: 'Work Pro',
        enabled: true,
      }),
    ];

    act(() => {
      renderer.render(
        <ProviderList
          connections={customConn}
          selectedConnectionId="conn-notes"
          onSelectConnection={vi.fn()}
          onReorder={vi.fn()}
          onAddConnection={vi.fn()}
          onEditConnection={vi.fn()}
          onDuplicateConnection={vi.fn()}
          onDeleteConnection={vi.fn()}
          onProbeConnection={vi.fn()}
        />,
      );
    });

    expect(renderer.container.textContent).toContain('Work Pro');
    expect(renderer.container.textContent).toContain('🚀');
  });
});
