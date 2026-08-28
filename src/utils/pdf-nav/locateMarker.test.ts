import { describe, expect, it } from 'vitest';
import {
  buildPdfLocateDirective,
  parsePdfLocateMarkers,
  stripPdfLocateMarkers,
  toPdfNavHighlight,
} from './locateMarker';

describe('parsePdfLocateMarkers', () => {
  it('returns content untouched when no markers exist', () => {
    const content = 'Just a normal answer.';
    expect(parsePdfLocateMarkers(content)).toEqual({ cleanContent: content, locates: [] });
  });

  it('extracts a full marker with doc, page, box and snippet', () => {
    const content =
      '表格说明了营收情况。\n<pdf-locate doc="report.pdf" page="3" box="120,80,340,560">营收表格</pdf-locate>';
    const { cleanContent, locates } = parsePdfLocateMarkers(content);
    expect(cleanContent.trim()).toBe('表格说明了营收情况。');
    expect(locates).toHaveLength(1);
    expect(locates[0]).toEqual({
      docName: 'report.pdf',
      pageNumber: 3,
      box2d: [120, 80, 340, 560],
      snippet: '营收表格',
    });
  });

  it('supports a marker without doc and box attributes', () => {
    const content = '见 <pdf-locate page="7">图 2</pdf-locate> 说明。';
    const { cleanContent, locates } = parsePdfLocateMarkers(content);
    expect(cleanContent).toBe('见  说明。');
    expect(locates).toHaveLength(1);
    expect(locates[0]).toEqual({ docName: undefined, pageNumber: 7, box2d: undefined, snippet: '图 2' });
  });

  it('extracts multiple markers in order', () => {
    const content = [
      'a <pdf-locate page="1">one</pdf-locate>',
      'b <pdf-locate doc="b.pdf" page="12" box="1,2,3,4">two</pdf-locate>',
    ].join('\n');
    const { locates } = parsePdfLocateMarkers(content);
    expect(locates.map((locate) => locate.pageNumber)).toEqual([1, 12]);
    expect(locates[1].docName).toBe('b.pdf');
    expect(locates[1].box2d).toEqual([1, 2, 3, 4]);
  });

  it('strips an unterminated marker tail (mid-stream)', () => {
    const content = '答案开始 <pdf-locate page="4" box="1,2,3,4">部分摘';
    const { cleanContent, locates } = parsePdfLocateMarkers(content);
    expect(cleanContent).toBe('答案开始 ');
    expect(locates).toEqual([]);
  });

  it('strips an attribute-only unterminated marker without ">"', () => {
    const content = '答案 <pdf-locate page="4"';
    expect(stripPdfLocateMarkers(content)).toBe('答案 ');
  });

  it('ignores markers with an invalid page number', () => {
    const content = '<pdf-locate page="abc">x</pdf-locate> 尾部';
    const { cleanContent, locates } = parsePdfLocateMarkers(content);
    expect(locates).toEqual([]);
    expect(cleanContent.trim()).toBe('尾部');
  });

  it('tolerates malformed box values', () => {
    const content = '<pdf-locate page="2" box="10,20,30">x</pdf-locate>';
    const { locates } = parsePdfLocateMarkers(content);
    expect(locates[0].box2d).toBeUndefined();
  });
});

describe('stripPdfLocateMarkers', () => {
  it('removes markers but keeps surrounding text', () => {
    const content = '前文 <pdf-locate page="9">q</pdf-locate> 后文';
    expect(stripPdfLocateMarkers(content)).toBe('前文  后文');
  });
});

describe('toPdfNavHighlight', () => {
  it('maps a locate to a highlight payload', () => {
    expect(
      toPdfNavHighlight({ docName: 'a.pdf', pageNumber: 5, box2d: [1, 2, 3, 4], snippet: 's' }, { messageId: 'm1' }),
    ).toEqual({ messageId: 'm1', docName: 'a.pdf', pageNumber: 5, box2d: [1, 2, 3, 4], snippet: 's' });
  });
});

describe('buildPdfLocateDirective', () => {
  it('lists the document names when provided', () => {
    const directive = buildPdfLocateDirective(['a.pdf', 'b.pdf']);
    expect(directive).toContain('"a.pdf", "b.pdf"');
    expect(directive).toContain('<pdf-locate doc="FILE_NAME" page="PAGE_NUMBER"');
  });

  it('omits the name list when empty', () => {
    expect(buildPdfLocateDirective([])).not.toContain('available PDF file names');
  });
});
