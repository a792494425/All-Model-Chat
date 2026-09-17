const normalizePathSeparators = (value: string): string => value.replace(/\\/g, '/');

export const normalizeRelativePath = (value: string): string => normalizePathSeparators(value).replace(/^\/+/, '');

export const getFilePath = (file: File): string => normalizePathSeparators(file.webkitRelativePath || file.name);

export const attachRelativePath = (
  file: File,
  relativePath: string,
  options: { preserveExisting?: boolean } = {},
): File => {
  if (options.preserveExisting && file.webkitRelativePath) {
    return file;
  }

  try {
    Object.defineProperty(file, 'webkitRelativePath', {
      configurable: true,
      value: normalizeRelativePath(relativePath),
      writable: true,
    });
  } catch {
    // If native File instance is sealed or property is non-configurable in specific browser engines,
    // continue safely without throwing.
  }

  return file;
};
