export interface WordAnnotation {
  text: string;
  start_offset: string; // e.g. "1.200s"
  end_offset: string; // e.g. "1.550s"
  speaker?: string;
}

export interface SubtitleCue {
  id: number;
  startSeconds: number;
  endSeconds: number;
  startTimeSrt: string; // "00:00:01,200"
  endTimeSrt: string; // "00:00:01,550"
  startTimeVtt: string; // "00:00:01.200"
  endTimeVtt: string; // "00:00:01.550"
  text: string;
  speaker?: string;
}

/**
 * Parses offset string (e.g. "1.250s", "12s") to float seconds.
 */
export function parseOffsetSeconds(offset: string): number {
  if (!offset || typeof offset !== 'string') return 0;
  const match = offset.trim().match(/^([0-9]+(?:\.[0-9]+)?)s?$/i);
  if (!match) return 0;
  return parseFloat(match[1]);
}

/**
 * Formats seconds into SRT timestamp format: HH:MM:SS,mmm
 */
export function formatTimestampSrt(seconds: number): string {
  return formatTimestamp(seconds, ',');
}

/**
 * Formats seconds into WebVTT timestamp format: HH:MM:SS.mmm
 */
export function formatTimestampVtt(seconds: number): string {
  return formatTimestamp(seconds, '.');
}

function formatTimestamp(totalSeconds: number, millisecondSeparator: string): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = Math.floor(safeSeconds % 60);
  const milliseconds = Math.round((safeSeconds % 1) * 1000);

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const mmm = String(milliseconds).padStart(3, '0');

  return `${hh}:${mm}:${ss}${millisecondSeparator}${mmm}`;
}

const TERMINAL_PUNCTUATION_REGEX = /[.?!。？！]$/;
const CJK_REGEX = /[\u4e00-\u9fa5\u3040-\u30ff]/;

/**
 * Groups fine-grained word annotations from Gemini 3.5 Transcribe into natural subtitle lines.
 */
export function groupWordsIntoCues(words: WordAnnotation[]): SubtitleCue[] {
  if (!words || words.length === 0) return [];

  const cues: SubtitleCue[] = [];
  let currentWords: WordAnnotation[] = [];

  const flushCurrentWords = () => {
    if (currentWords.length === 0) return;

    const firstWord = currentWords[0];
    const lastWord = currentWords[currentWords.length - 1];

    const startSeconds = parseOffsetSeconds(firstWord.start_offset);
    const endSeconds = Math.max(startSeconds, parseOffsetSeconds(lastWord.end_offset));

    // Combine words cleanly (avoid spaces between adjacent CJK characters)
    let combinedText = '';
    for (let i = 0; i < currentWords.length; i++) {
      const w = currentWords[i].text.trim();
      if (!w) continue;

      if (combinedText.length === 0) {
        combinedText = w;
      } else {
        const lastChar = combinedText[combinedText.length - 1];
        const firstChar = w[0];
        const isBothCjk = CJK_REGEX.test(lastChar) && CJK_REGEX.test(firstChar);
        combinedText += isBothCjk ? w : ` ${w}`;
      }
    }

    cues.push({
      id: cues.length + 1,
      startSeconds,
      endSeconds,
      startTimeSrt: formatTimestampSrt(startSeconds),
      endTimeSrt: formatTimestampSrt(endSeconds),
      startTimeVtt: formatTimestampVtt(startSeconds),
      endTimeVtt: formatTimestampVtt(endSeconds),
      text: combinedText,
      speaker: firstWord.speaker,
    });

    currentWords = [];
  };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    if (currentWords.length > 0) {
      const prevWord = currentWords[currentWords.length - 1];
      const prevEnd = parseOffsetSeconds(prevWord.end_offset);
      const currStart = parseOffsetSeconds(word.start_offset);

      const silenceGap = currStart - prevEnd;
      const isPauseBreak = silenceGap > 0.45;
      const isPunctuationBreak = TERMINAL_PUNCTUATION_REGEX.test(prevWord.text.trim());
      const isSpeakerChange = Boolean(word.speaker && prevWord.speaker && word.speaker !== prevWord.speaker);

      const firstStart = parseOffsetSeconds(currentWords[0].start_offset);
      const isDurationLimit = currStart - firstStart >= 5.5;
      const textLength = currentWords.reduce((acc, w) => acc + w.text.length, 0);
      const isLengthLimit = textLength >= 60;

      if (isPauseBreak || isPunctuationBreak || isSpeakerChange || isDurationLimit || isLengthLimit) {
        flushCurrentWords();
      }
    }

    currentWords.push(word);
  }

  flushCurrentWords();
  return cues;
}

/**
 * Serializes SubtitleCue[] into standard SubRip (.srt) format.
 */
export function generateSrtContent(cues: SubtitleCue[]): string {
  return cues
    .map((cue) => {
      const speakerPrefix = cue.speaker ? `[${cue.speaker}] ` : '';
      return `${cue.id}\n${cue.startTimeSrt} --> ${cue.endTimeSrt}\n${speakerPrefix}${cue.text}\n`;
    })
    .join('\n');
}

/**
 * Serializes SubtitleCue[] into standard WebVTT (.vtt) format.
 * Supports line positioning (defaults to line:84% so cues float above video control bars).
 */
export function generateVttContent(cues: SubtitleCue[], options?: { line?: string }): string {
  const lineParam = options?.line !== undefined ? options.line : '84%';
  const lineSuffix = lineParam ? ` line:${lineParam}` : '';

  const cuesBody = cues
    .map((cue) => {
      const speakerPrefix = cue.speaker ? `<v ${cue.speaker}>` : '';
      const speakerSuffix = cue.speaker ? '</v>' : '';
      return `${cue.id}\n${cue.startTimeVtt} --> ${cue.endTimeVtt}${lineSuffix}\n${speakerPrefix}${cue.text}${speakerSuffix}\n`;
    })
    .join('\n');

  return `WEBVTT\n\n${cuesBody}`;
}

/**
 * Triggers a browser file download for text/blob content.
 */
export function downloadTextFile(filename: string, content: string, mimeType = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
