import React from 'react';
import { McpToolCallBlock } from './McpToolCallBlock';

interface McpToolCallGroupProps {
  calls: unknown[];
  responses: unknown[];
}

const getStatus = (responsePart: unknown): 'invoking' | 'success' | 'error' => {
  if (!responsePart) return 'invoking';
  const maybe = responsePart as { functionResponse?: { response?: unknown } };
  const resp = maybe.functionResponse?.response as Record<string, unknown> | undefined;
  if (resp && (resp.error !== undefined || resp.isError)) return 'error';
  return 'success';
};

export const McpToolCallGroup: React.FC<McpToolCallGroupProps> = ({ calls, responses }) => {
  if (!calls.length) return null;
  return (
    <div className="my-2 space-y-2">
      {calls.map((call, index) => {
        const responsePart = responses[index] as unknown;
        const status = getStatus(responsePart);
        return <McpToolCallBlock key={index} call={call as any} responsePart={responsePart as any} status={status} />;
      })}
    </div>
  );
};
