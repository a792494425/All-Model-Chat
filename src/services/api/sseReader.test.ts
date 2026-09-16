import { describe, expect, it, vi } from 'vitest';
import { parseSseJsonEvents, parseSseRawDataChunks, readSseStream } from './sseReader';

describe('parseSseRawDataChunks', () => {
  it('parses single and multiple SSE events separated by double newline', () => {
    const buffer = 'data: hello\n\ndata: world\n\n';
    const { events, rest } = parseSseRawDataChunks(buffer);

    expect(events).toEqual(['hello', 'world']);
    expect(rest).toBe('');
  });

  it('preserves multi-line data fields within a single event', () => {
    const buffer = 'data: line 1\ndata: line 2\n\n';
    const { events, rest } = parseSseRawDataChunks(buffer);

    expect(events).toEqual(['line 1\nline 2']);
    expect(rest).toBe('');
  });

  it('keeps incomplete trailing chunk in rest', () => {
    const buffer = 'data: complete\n\ndata: incom';
    const { events, rest } = parseSseRawDataChunks(buffer);

    expect(events).toEqual(['complete']);
    expect(rest).toBe('data: incom');
  });
});

describe('parseSseJsonEvents', () => {
  it('parses valid JSON data chunks and ignores [DONE]', () => {
    const buffer = 'data: {"text":"a"}\n\ndata: [DONE]\n\ndata: {"text":"b"}\n\n';
    const { events, rest } = parseSseJsonEvents<{ text: string }>(buffer);

    expect(events).toEqual([{ text: 'a' }, { text: 'b' }]);
    expect(rest).toBe('');
  });

  it('silently skips malformed JSON chunks', () => {
    const buffer = 'data: not json\n\ndata: {"valid":true}\n\n';
    const { events, rest } = parseSseJsonEvents<{ valid: boolean }>(buffer);

    expect(events).toEqual([{ valid: true }]);
    expect(rest).toBe('');
  });
});

describe('readSseStream', () => {
  const createMockResponse = (chunks: string[]): { response: Response; cancelSpy: ReturnType<typeof vi.fn> } => {
    const encoder = new TextEncoder();
    const cancelSpy = vi.fn().mockResolvedValue(undefined);
    let index = 0;

    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (index < chunks.length) {
          controller.enqueue(encoder.encode(chunks[index++]));
        } else {
          controller.close();
        }
      },
      cancel(reason) {
        return cancelSpy(reason);
      },
    });

    const response = new Response(stream);
    return { response, cancelSpy };
  };

  it('reads stream events to completion', async () => {
    const { response } = createMockResponse(['data: {"id":1}\n\n', 'data: {"id":2}\n\n']);
    const controller = new AbortController();
    const received: Array<{ id: number }> = [];

    await readSseStream(
      response,
      controller.signal,
      (buf) => parseSseJsonEvents<{ id: number }>(buf),
      (event) => received.push(event),
    );

    expect(received).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('stops early when isDone matches an event', async () => {
    const { response, cancelSpy } = createMockResponse([
      'data: {"step":1}\n\ndata: {"step":2}\n\n',
      'data: {"step":3}\n\n',
    ]);
    const controller = new AbortController();
    const received: Array<{ step: number }> = [];

    await readSseStream(
      response,
      controller.signal,
      (buf) => parseSseJsonEvents<{ step: number }>(buf),
      (event) => received.push(event),
      (event) => event.step === 2,
    );

    expect(received).toEqual([{ step: 1 }, { step: 2 }]);
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('aborts and cancels the reader when signal aborts', async () => {
    const controller = new AbortController();
    let pullCount = 0;
    const cancelSpy = vi.fn().mockResolvedValue(undefined);

    const stream = new ReadableStream<Uint8Array>({
      async pull(streamController) {
        pullCount += 1;
        if (pullCount === 1) {
          streamController.enqueue(new TextEncoder().encode('data: chunk1\n\n'));
        } else {
          // Simulate a stalled stream waiting for network data
          await new Promise<void>((resolve) => {
            controller.signal.addEventListener('abort', () => resolve(), { once: true });
          });
        }
      },
      cancel(reason) {
        return cancelSpy(reason);
      },
    });

    const response = new Response(stream);
    const received: string[] = [];

    const promise = readSseStream(response, controller.signal, parseSseRawDataChunks, (event) => received.push(event));

    // Give it a tick to process chunk 1
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(received).toEqual(['chunk1']);

    // Abort signal
    controller.abort();
    await promise;

    expect(cancelSpy).toHaveBeenCalled();
  });

  it('exits immediately if abortSignal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const { response, cancelSpy } = createMockResponse(['data: {"id":1}\n\n']);
    const received: unknown[] = [];

    await readSseStream(
      response,
      controller.signal,
      (buf) => parseSseJsonEvents(buf),
      (event) => received.push(event),
    );

    expect(received).toHaveLength(0);
    expect(cancelSpy).toHaveBeenCalled();
  });
});
