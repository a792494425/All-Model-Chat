import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { McpPickerMenu } from './McpPickerMenu';
import { renderWithProviders } from '@/test/render/providerRenderer';
import { useSettingsStore } from '@/stores/settingsStore';
import { useMcpRuntimeStore } from '@/stores/mcpRuntimeStore';

const seedSettings = () => {
  useSettingsStore.setState({
    appSettings: {
      ...useSettingsStore.getState().appSettings,
      mcpServers: [
        { id: 'alpha', name: 'Alpha Server', enabled: true, transport: 'http', url: 'https://a.example.com' },
        { id: 'beta', name: 'Beta Server', enabled: true, transport: 'http', url: 'https://b.example.com' },
      ],
    } as never,
  });
};

describe('McpPickerMenu', () => {
  beforeEach(() => {
    useMcpRuntimeStore.setState({ masterEnabled: true, selectedServerIds: null });
    seedSettings();
  });

  const openMenu = () => {
    renderWithProviders(<McpPickerMenu />);
    fireEvent.click(screen.getByTestId('mcp-picker-button'));
  };

  it('lists the master switch and every enabled server', () => {
    openMenu();
    expect(screen.getByTestId('mcp-picker-master')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Alpha Server')).toBeInTheDocument();
    expect(screen.getByText('Beta Server')).toBeInTheDocument();
  });

  it('narrows selection when a server is toggled off and shows the active count badge', async () => {
    openMenu();
    fireEvent.click(screen.getByTestId('mcp-picker-server-alpha'));

    await waitFor(() => expect(useMcpRuntimeStore.getState().selectedServerIds).toEqual(['beta']));
    act(() => {
      screen.getAllByTestId('mcp-picker-button').forEach((el) => el.blur());
    });
    expect(screen.getByTestId('mcp-picker-count')).toHaveTextContent('1');
  });

  it('master switch disables MCP entirely for the next turn', async () => {
    openMenu();
    fireEvent.click(screen.getByTestId('mcp-picker-master'));
    await waitFor(() => expect(useMcpRuntimeStore.getState().masterEnabled).toBe(false));
    expect(screen.getByTestId('mcp-picker-server-alpha')).toHaveAttribute('aria-checked', 'false');
  });
});
