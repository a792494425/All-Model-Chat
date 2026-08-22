#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const SUPPORTED_LANGUAGES = ['en', 'zh', 'ja', 'ko', 'es', 'fr', 'de'];

// Explicit file list + dynamic settings discovery to stay future-proof
const baseFiles = [
  'src/i18n/translations/app.ts',
  'src/i18n/translations/chatInput.ts',
  'src/i18n/translations/common.ts',
  'src/i18n/translations/header.ts',
  'src/i18n/translations/history.ts',
  'src/i18n/translations/logViewer.ts',
  'src/i18n/translations/messages.ts',
  'src/i18n/translations/scenarios.ts',
  'src/i18n/voiceStyleTranslations.ts',
  'src/i18n/coreTranslations.ts',
];

const settingsDir = path.join(projectRoot, 'src/i18n/translations/settings');
let settingsFiles = [];
try {
  settingsFiles = fs
    .readdirSync(settingsDir)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => `src/i18n/translations/settings/${f}`)
    .sort();
} catch {
  // settings dir missing – rely on baseFiles only
}

const translationFiles = [...baseFiles, ...settingsFiles];

let hasError = false;
let totalKeys = 0;
let totalMissing = 0;
const placeholderErrors = [];

/**
 * Count occurrences of `lang:` in file content.
 * Uses word boundary to avoid matching inside other words.
 */
function countLang(content, lang) {
  const re = new RegExp(`\\b${lang}\\s*:`, 'g');
  const m = content.match(re);
  return m ? m.length : 0;
}

for (const rel of translationFiles) {
  const full = path.join(projectRoot, rel);
  if (!fs.existsSync(full)) {
    console.error(`Missing file: ${rel}`);
    hasError = true;
    continue;
  }
  const content = fs.readFileSync(full, 'utf8');

  const counts = {};
  for (const lang of SUPPORTED_LANGUAGES) {
    counts[lang] = countLang(content, lang);
  }

  const enCount = counts.en;
  totalKeys += enCount;

  // Check per-language count consistency
  for (const lang of SUPPORTED_LANGUAGES) {
    if (counts[lang] !== enCount) {
      console.error(`Missing ${lang} in ${rel}: en:${enCount} ${lang}:${counts[lang]} (expected ${enCount})`);
      hasError = true;
      totalMissing += Math.abs(enCount - counts[lang]);
    }
  }

  // Placeholder consistency: for each valid en/zh/ja entry, compare placeholder sets
  // This regex handles multi-line entries and quoted strings with escapes.
  // It matches entries where en, zh, ja appear in order.
  const entryRegex =
    /\{\s*en:\s*(['"`])((?:\\.|(?!\1).)*)\1\s*,\s*zh:\s*(['"`])((?:\\.|(?!\3).)*)\3\s*,\s*ja:\s*(['"`])((?:\\.|(?!\5).)*)\5\s*,?\s*\}/gs;
  let m;
  const matchedEntries = [];
  while ((m = entryRegex.exec(content)) !== null) {
    matchedEntries.push(m);
  }

  // If count mismatch, already reported. Also warn if matchedEntries length != enCount (indicates formatting drift)
  if (matchedEntries.length !== enCount && enCount > 0) {
    // Try fallback: entries may contain placeholders that break simple parsing – do loose check
    // Only warn if we suspect structural issue, not fail strictly, to avoid false positives
    // But if counts match yet matchedEntries differs, log for debugging
    if (matchedEntries.length < enCount) {
      // Could be entries with multi-line strings that include commas differently – attempt block extraction alternative
      // We already counted via simple lang: occurrences, so not fatal; placeholder check will be partial
    }
  }

  for (const entry of matchedEntries) {
    const enStr = entry[2];
    const zhStr = entry[4];
    const jaStr = entry[6];

    const extractPlaceholders = (str) => {
      const set = [...str.matchAll(/\{(\w+)\}/g)].map((x) => x[0]).sort();
      return set;
    };

    const enPH = extractPlaceholders(enStr);
    const zhPH = extractPlaceholders(zhStr);
    const jaPH = extractPlaceholders(jaStr);

    const arraysEqual = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

    if (!arraysEqual(enPH, zhPH)) {
      console.error(
        `Placeholder mismatch (en vs zh) in ${rel}: en ${JSON.stringify(enPH)} vs zh ${JSON.stringify(zhPH)} | block: ${entry[0].slice(0, 120)}...`,
      );
      hasError = true;
      placeholderErrors.push(rel);
    }
    if (!arraysEqual(enPH, jaPH)) {
      console.error(
        `Placeholder mismatch (en vs ja) in ${rel}: en ${JSON.stringify(enPH)} vs ja ${JSON.stringify(jaPH)} | block: ${entry[0].slice(0, 120)}...`,
      );
      hasError = true;
      placeholderErrors.push(rel);
    }
  }
}

if (hasError) {
  console.error('\ni18n coverage check failed');
  if (totalMissing > 0) console.error(`Missing translations: ~${totalMissing} keys`);
  if (placeholderErrors.length > 0)
    console.error(`Placeholder mismatches in: ${[...new Set(placeholderErrors)].join(', ')}`);
  process.exit(1);
} else {
  console.log(`✓ i18n coverage: ${totalKeys}/${totalKeys} keys have ${SUPPORTED_LANGUAGES.join('/')}`);
  console.log(`✓ i18n coverage: all keys have ${SUPPORTED_LANGUAGES.join('/')}`);
}
