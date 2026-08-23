import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { McpToolCallBlock } from './McpToolCallBlock';

describe('McpToolCallBlock', () => {
  it('renders args table and response with truncation', () => {
    render(<McpToolCallBlock call={{name:'mcp_s1_tool_a_abc123', args:{a:'x'.repeat(5000)}} as any} responsePart={{functionResponse:{name:'mcp_s1_tool_a_abc123', response:{result:'ok'}}}} status="success" />);
    expect(screen.getByText(/mcp_s1_tool_a/)).toBeInTheDocument();
    expect(screen.getByText(/Truncated/)).toBeInTheDocument();
  });
});
