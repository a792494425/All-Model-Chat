import type { OpenAIResponsesStreamEvent } from './openaiResponsesTypes';
import { readSseStream } from './sseReader';

const parseOpenAIResponsesSseEvents = (buffer: string): { events: OpenAIResponsesStreamEvent[]; rest: string } => {
  const events: OpenAIResponsesStreamEvent[] = [];
  let searchStart = 0;
  let boundaryIndex = buffer.indexOf('\n\n', searchStart);

  while (boundaryIndex !== -1) {
    const rawEvent = buffer.slice(searchStart, boundaryIndex);
    const dataLines = rawEvent
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');

    if (dataLines && dataLines !== '[DONE]') {
      try {
        events.push(JSON.parse(dataLines) as OpenAIResponsesStreamEvent);
      } catch {
        // Skip malformed SSE lines
      }
    }

    searchStart = boundaryIndex + 2;
    boundaryIndex = buffer.indexOf('\n\n', searchStart);
  }

  return { events, rest: buffer.slice(searchStart) };
};

const isOpenAIResponsesTerminalEvent = (event: OpenAIResponsesStreamEvent): boolean =>
  event.type === 'response.completed' || event.type === 'response.failed' || event.type === 'error';

export const readOpenAIResponsesStreamEvents = (
  response: Response,
  abortSignal: AbortSignal,
  onEvent: (event: OpenAIResponsesStreamEvent) => void,
): Promise<void> =>
  readSseStream(response, abortSignal, parseOpenAIResponsesSseEvents, onEvent, isOpenAIResponsesTerminalEvent);
