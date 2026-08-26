import React from 'react';
import { McpToolCallBlock, type McpToolCallStatus } from './McpToolCallBlock';

interface McpToolCallGroupProps {
  calls: unknown[];
  responses: unknown[];
  /** Whether the parent generation is still running; a call left without a response once it stops was cancelled. */
  turnActive: boolean;
}

const getStatus = (responsePart: unknown, turnActive: boolean): McpToolCallStatus => {
  if (!responsePart) return turnActive ? 'invoking' : 'cancelled';
  const maybe = responsePart as { functionResponse?: { response?: unknown } };
  const resp = maybe.functionResponse?.response as Record<string, unknown> | undefined;
  if (resp && (resp.error !== undefined || resp.isError)) return 'error';
  return 'success';
};

export const McpToolCallGroup: React.FC<McpToolCallGroupProps> = ({ calls, responses, turnActive }) => {
  if (!calls.length) return null;
  return (
    <div className="my-2 space-y-2">
      {calls.map((call, index) => {
        const responsePart = responses[index] as unknown;
        const status = getStatus(responsePart, turnActive);
        return (
          <McpToolCallBlock key={index} call={call as any} responsePart={responsePart as any} status={status} />
        );
      })}
    </div>
  );
};
