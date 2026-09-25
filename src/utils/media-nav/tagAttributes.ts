// Regular expression matching HTML/XML tag attributes: name="value", name='value', or unquoted name=value
const ATTRIBUTE_PATTERN = /([a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;

export const parseTagAttributes = (attributeString: string): Record<string, string> => {
  const attributes: Record<string, string> = {};
  let match: RegExpExecArray | null;
  ATTRIBUTE_PATTERN.lastIndex = 0;
  while ((match = ATTRIBUTE_PATTERN.exec(attributeString)) !== null) {
    const attributeName = match[1];
    const attributeValue = match[2] ?? match[3] ?? match[4] ?? '';
    attributes[attributeName] = attributeValue;
  }
  return attributes;
};
