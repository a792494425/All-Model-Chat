import { isRecord } from '../../../shared/predicates';

export interface McpResultSegment {
  kind: 'text' | 'image' | 'json';
  text?: string;
  src?: string;
}

const placeholderFor = (type: string): string => `[${type.charAt(0).toUpperCase()}${type.slice(1)} delivered to user]`;

/**
 * Model-facing view of an MCP CallToolResult. Binary parts (image/audio/blob)
 * would blow up the prompt with base64, so they become short placeholders —
 * the user still sees the real media rendered in the tool call block.
 */
export const summarizeMcpResultForModel = (result: unknown): unknown => {
  if (!isRecord(result) || !Array.isArray(result.content)) {
    return result;
  }

  const content = result.content.map((item: unknown) => {
    if (!isRecord(item)) return item;
    const type = typeof item.type === 'string' ? item.type : '';
    if (type === 'image' || type === 'audio') {
      return { type: 'text', text: placeholderFor(type) };
    }
    if (type === 'resource' && isRecord(item.resource)) {
      const resource = item.resource;
      if (typeof resource.text === 'string') {
        return { type: 'text', text: resource.text };
      }
      return {
        type: 'text',
        text: `[Binary resource ${String(resource.uri ?? '')} delivered to user]`,
      };
    }
    return item;
  });

  return { ...result, content };
};

const asBase64Image = (item: Record<string, unknown>): McpResultSegment | undefined => {
  const data = typeof item.data === 'string' ? item.data : '';
  if (!data) return undefined;
  const mime = typeof item.mimeType === 'string' && item.mimeType ? item.mimeType : 'image/png';
  return { kind: 'image', src: `data:${mime};base64,${data}` };
};

/**
 * UI-facing segmentation of a stored functionResponse payload for rendering.
 */
export const extractMcpResultSegments = (response: unknown): McpResultSegment[] => {
  const source = isRecord(response) && isRecord(response.result) ? response.result : response;
  if (isRecord(source) && Array.isArray(source.content)) {
    const segments: McpResultSegment[] = [];
    for (const item of source.content) {
      if (!isRecord(item)) continue;
      if (item.type === 'text' && typeof item.text === 'string') {
        segments.push({ kind: 'text', text: item.text });
      } else if (item.type === 'image') {
        const image = asBase64Image(item);
        if (image) segments.push(image);
      } else {
        segments.push({ kind: 'json', text: JSON.stringify(item, null, 2).slice(0, 4000) });
      }
    }
    if (segments.length > 0) return segments;
  }

  return [{ kind: 'json', text: JSON.stringify(response ?? {}, null, 2).slice(0, 4000) }];
};
