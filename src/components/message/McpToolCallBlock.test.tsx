import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { McpToolCallBlock } from './McpToolCallBlock';

describe('McpToolCallBlock', () => {
  it('renders args table and response with truncation', () => {
    render(
      <McpToolCallBlock
        call={{ name: 'mcp_s1_tool_a_abc123', args: { a: 'x'.repeat(5000) } } as any}
        responsePart={{ functionResponse: { name: 'mcp_s1_tool_a_abc123', response: { result: 'ok' } } }}
        status="success"
      />,
    );
    expect(screen.getByText(/mcp_s1_tool_a/)).toBeInTheDocument();
    expect(screen.getByText(/Truncated/)).toBeInTheDocument();
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
    expect(screen.getByText(/"ok": true/)).toBeInTheDocument();
  });
});
