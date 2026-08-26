import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { McpToolCallBlock } from './McpToolCallBlock';
import { toMcpFunctionName } from '@/features/mcp/mcpToolNames';
import { rememberDiscoveredTools, resetToolDisplayRegistry } from '@/features/mcp/toolDisplayNames';
import { useMcpApprovalStore } from '@/stores/mcpApprovalStore';

const renderSuccessBlock = () =>
  render(
    <McpToolCallBlock
      call={{ name: 'mcp_s1_tool_a_abc123', args: { a: 'x'.repeat(5000) } } as any}
      responsePart={{ functionResponse: { name: 'mcp_s1_tool_a_abc123', response: { result: 'ok' } } }}
      status="success"
    />,
  );

describe('McpToolCallBlock', () => {
  beforeEach(() => {
    resetToolDisplayRegistry();
    useMcpApprovalStore.setState({ pending: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });
  it('renders args table and response with truncation after expanding', () => {
    renderSuccessBlock();

    // Finished calls collapse by default; the header toggles them open.
    expect(screen.queryByText(/Truncated/)).toBeNull();
    fireEvent.click(screen.getByText(/mcp_s1_tool_a/));
    expect(screen.getByText(/Truncated/)).toBeInTheDocument();
  });

  it('keeps invoking calls expanded and finished calls collapsed', () => {
    const { rerender } = render(
      <McpToolCallBlock
        call={{ name: 'live', args: { q: 1 } } as any}
        responsePart={null}
        status="invoking"
      />,
    );
    // While running, the detail pane is open without any interaction.
    expect(screen.getAllByText(/"q": 1/).length).toBeGreaterThan(0);

    rerender(
      <McpToolCallBlock
        call={{ name: 'live', args: { q: 1 } } as any}
        responsePart={{ functionResponse: { name: 'live', response: { ok: true } } }}
        status="success"
      />,
    );
    // Completing collapses the block automatically.
    expect(screen.queryByText(/"ok": true/)).toBeNull();
  });

  it('marks calls left without a response as cancelled', () => {
    render(<McpToolCallBlock call={{ name: 'stopped', args: {} } as any} responsePart={null} status="cancelled" />);
    expect(screen.getByTestId('mcp-tool-cancelled')).toBeInTheDocument();
    expect(screen.getByTestId('mcp-tool-status')).toHaveTextContent('Cancelled');
  });

  it('shows a readable server : tool title once discovery info is known', () => {
    const wireName = toMcpFunctionName('filesystem', 'read_file');
    rememberDiscoveredTools({
      servers: [
        {
          serverId: 'filesystem',
          serverName: 'Filesystem',
          tools: [{ name: 'read_file', description: '' }],
        },
      ],
      errors: [],
    });

    render(
      <McpToolCallBlock
        call={{ name: wireName, args: {} } as any}
        responsePart={{ functionResponse: { name: wireName, response: { ok: true } } }}
        status="success"
      />,
    );
    expect(screen.getByText('Filesystem : read_file')).toBeInTheDocument();
  });

  it('shows running with live elapsed seconds for invoking calls', () => {
    vi.useFakeTimers();
    render(<McpToolCallBlock call={{ name: 'live', args: {} } as any} responsePart={null} status="invoking" />);

    expect(screen.getByTestId('mcp-tool-status')).toHaveTextContent('Running');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('mcp-tool-status')).toHaveTextContent('2s');
  });

  it('flags awaiting approval instead of a plain spinner when a matching request is pending', () => {
    const wireName = toMcpFunctionName('s1', 'secret_tool');
    rememberDiscoveredTools({
      servers: [{ serverId: 's1', serverName: 'S1', tools: [{ name: 'secret_tool', description: '' }] }],
      errors: [],
    });
    useMcpApprovalStore.setState({
      pending: {
        request: { serverId: 's1', serverName: 'S1', toolName: 'secret_tool', args: {} },
        resolve: vi.fn(),
      },
    } as never);

    render(
      <McpToolCallBlock
        call={{ name: wireName, args: { path: '/tmp' } } as any}
        responsePart={null}
        status="invoking"
      />,
    );
    expect(screen.getByTestId('mcp-tool-status')).toHaveTextContent('Awaiting approval');
  });

  it('lets a manual override survive status transitions', () => {
    const { rerender } = render(
      <McpToolCallBlock
        call={{ name: 'manual', args: {} } as any}
        responsePart={null}
        status="invoking"
      />,
    );
    // User collapses while running; completing must not force it back open.
    fireEvent.click(screen.getByText('manual'));
    expect(screen.queryByText(/Copy/)).toBeNull();

    rerender(
      <McpToolCallBlock
        call={{ name: 'manual', args: {} } as any}
        responsePart={{ functionResponse: { name: 'manual', response: { ok: true } } }}
        status="success"
      />,
    );
    expect(screen.queryByText(/"ok": true/)).toBeNull();
  });

  it('renders image content inline as an image element', () => {
    render(
      <McpToolCallBlock
        call={{ name: 'shot', args: {} } as any}
        responsePart={{
          functionResponse: {
            name: 'shot',
            response: {
              content: [
                { type: 'text', text: 'Screenshot taken' },
                { type: 'image', data: 'AAAA', mimeType: 'image/png' },
              ],
            },
          },
        }}
        status="success"
      />,
    );
    fireEvent.click(screen.getByText('shot'));
    const img = screen.getByAltText('tool-result-image');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,AAAA');
    expect(screen.getByText('Screenshot taken')).toBeInTheDocument();
  });

  it('falls back to JSON view for responses without content envelope', () => {
    render(
      <McpToolCallBlock
        call={{ name: 'plain', args: {} } as any}
        responsePart={{ functionResponse: { name: 'plain', response: { ok: true } } }}
        status="success"
      />,
    );
    fireEvent.click(screen.getByText('plain'));
    expect(screen.getByText(/"ok": true/)).toBeInTheDocument();
  });
});
