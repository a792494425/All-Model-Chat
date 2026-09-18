import React from 'react';
import type { LibraryItem } from '@/types';
import { isImageFileType, isVideoFileType, isAudioFileType, getLibraryFileType } from './libraryFiles';
import { isTextFile, isMarkdownFile } from '@/utils/file/fileTypeClassification';

export const isTextSnippetCandidate = (item: LibraryItem): boolean => {
  if (isImageFileType(item.type, item.name)) return false;
  if (isVideoFileType(item.type, item.name)) return false;
  if (isAudioFileType(item.type, item.name)) return false;
  const kind = getLibraryFileType(item.type, item.name);
  if (kind === 'pdf' || kind === 'spreadsheet' || kind === 'presentation') return false;

  return isTextFile({ name: item.name, type: item.type }) || isMarkdownFile({ name: item.name, type: item.type });
};

export const extractSnippetLines = (content: string): string[] => {
  return content
    .slice(0, 2048)
    .split(/\r?\n/)
    .slice(0, 6)
    .map((l) => (l.length > 80 ? l.slice(0, 80) + '…' : l));
};

const CODE_KEYWORDS = new Set([
  'import',
  'export',
  'from',
  'default',
  'const',
  'let',
  'var',
  'function',
  'return',
  'if',
  'else',
  'for',
  'while',
  'class',
  'extends',
  'interface',
  'type',
  'async',
  'await',
  'def',
  'self',
  'public',
  'private',
  'static',
  'new',
  'try',
  'catch',
  'throw',
  'package',
  'use',
  'fn',
  'mut',
  'struct',
  'true',
  'false',
  'null',
  'undefined',
  'nil',
  'None',
  'True',
  'False',
  'select',
  'where',
  'insert',
  'update',
  'delete',
]);

export const renderHighlightedCodeLine = (text: string, ext: string): React.ReactNode => {
  const trimmed = text.trim();
  if (!trimmed) {
    return <span className="inline-block">&nbsp;</span>;
  }
  if ((ext === 'MD' || ext === 'MARKDOWN') && trimmed.startsWith('#')) {
    return <span className="text-[#89b4fa] font-bold">{text}</span>;
  }
  if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) {
    return <span className="text-[#6c7086] italic">{text}</span>;
  }
  if (ext === 'JSON' && trimmed.startsWith('"')) {
    const colonIdx = text.indexOf(':');
    if (colonIdx !== -1) {
      const key = text.slice(0, colonIdx);
      const rest = text.slice(colonIdx);
      return (
        <>
          <span className="text-[#89b4fa]">{key}</span>
          <span className="text-[#cdd6f4]">{rest}</span>
        </>
      );
    }
  }

  const tokens = text
    .split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`|\b[a-zA-Z_$][a-zA-Z0-9_$]*\b|[^\w\s"'`]+|\s+)/g)
    .filter(Boolean);
  return (
    <>
      {tokens.map((tok, i) => {
        if (tok.startsWith('"') || tok.startsWith("'") || tok.startsWith('`')) {
          return (
            <span key={i} className="text-[#a6e3a1]">
              {tok}
            </span>
          );
        }
        if (CODE_KEYWORDS.has(tok)) {
          return (
            <span key={i} className="text-[#cba6f7] font-medium">
              {tok}
            </span>
          );
        }
        if (/^\d+(\.\d+)?$/.test(tok)) {
          return (
            <span key={i} className="text-[#fab387]">
              {tok}
            </span>
          );
        }
        if (tok === '=' || tok === '=>' || tok === '==' || tok === '===' || tok === ':' || tok === '+' || tok === '-') {
          return (
            <span key={i} className="text-[#89dceb]">
              {tok}
            </span>
          );
        }
        return <span key={i}>{tok}</span>;
      })}
    </>
  );
};
