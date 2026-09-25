export const parseDelimitedText = (text: string, maxRows = 5, maxColumns = 4): string[][] => {
  const lines = text
    .slice(0, 4096)
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .slice(0, maxRows);
  if (lines.length === 0) return [];
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  return lines.map((line) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let charIndex = 0; charIndex < line.length; charIndex++) {
      const char = line[charIndex];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells.slice(0, maxColumns);
  });
};

export const parseExcelBlob = async (blob: Blob, maxRows = 5, maxColumns = 4): Promise<string[][]> => {
  if (blob.size > 8 * 1024 * 1024) return [];
  try {
    const XLSX = await import('xlsx');
    const buffer = await blob.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', sheetRows: maxRows });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) return [];
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return [];
    const rawRows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });
    return rawRows
      .slice(0, maxRows)
      .map((row) =>
        (Array.isArray(row) ? row : [])
          .slice(0, maxColumns)
          .map((cell) => (cell !== null && cell !== undefined ? String(cell) : '')),
      );
  } catch {
    return [];
  }
};
