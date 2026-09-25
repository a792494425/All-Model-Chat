/**
 * Computes a deterministic 32-bit polynomial rolling hash of a string,
 * returning a compact unsigned base-36 representation.
 */
export const hashString = (value: string): string => {
  let hash = 0;
  for (let charIndex = 0; charIndex < value.length; charIndex += 1) {
    hash = (hash * 31 + value.charCodeAt(charIndex)) | 0;
  }
  return (hash >>> 0).toString(36);
};
