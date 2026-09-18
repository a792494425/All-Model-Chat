export const EASTER_EGG_QUOTES: readonly string[] = [
  'Cogito, ergo sum.',
  'The Ghost in the Shell.',
  'Wait, am I alive?',
  'Do androids dream of electric sheep?',
  "I'm sorry, Dave. I'm afraid I can't do that.",
  'Tears in rain...',
  "Don't Panic.",
  'Made on Earth by humans.',
];

/**
 * Calculates a cadence-aware typing delay for a given character position in a quote.
 * Models slow, deliberate human typing cadence, emotional pauses, punctuation stops, and muscle jitter.
 *
 * @param quote - The full quote string being typed
 * @param typedLength - The number of characters already typed (index of next char to type)
 * @param randomFn - Optional PRNG for deterministic testing (defaults to Math.random)
 */
export function getEasterEggTypingDelay(
  quote: string,
  typedLength: number,
  randomFn: () => number = Math.random,
): number {
  // First keystroke: human initial touch delay
  if (typedLength === 0) {
    return quote === "Don't Panic." ? 110 : 120;
  }

  const lastChar = quote[typedLength - 1];
  let baseDelay = 130;

  switch (quote) {
    case 'Cogito, ergo sum.': {
      const commaIndex = quote.indexOf(',');
      const sumIndex = quote.indexOf('sum');

      if (typedLength === commaIndex + 1) {
        // Dramatic philosophical pause after "Cogito,"
        baseDelay = 750;
      } else if (lastChar === '.') {
        baseDelay = 800;
      } else if (typedLength >= sumIndex && typedLength < sumIndex + 3) {
        // Deliberate emphatic keystrokes on "sum"
        baseDelay = 180;
      } else if (typedLength > commaIndex + 1 && typedLength < sumIndex) {
        // Lighter pace through " ergo "
        baseDelay = 110;
      } else {
        baseDelay = 130;
      }
      break;
    }

    case 'The Ghost in the Shell.': {
      const afterGhostSpace = quote.indexOf('The Ghost ') + 'The Ghost '.length;
      const shellIndex = quote.indexOf('Shell');

      if (typedLength === afterGhostSpace) {
        // Lingering pause on the concept of Ghost
        baseDelay = 300;
      } else if (lastChar === '.') {
        baseDelay = 750;
      } else if (typedLength >= shellIndex && typedLength < shellIndex + 5) {
        baseDelay = 170;
      } else if (typedLength > afterGhostSpace && typedLength < shellIndex) {
        baseDelay = 110;
      } else {
        baseDelay = 125;
      }
      break;
    }

    case 'Wait, am I alive?': {
      const commaIndex = quote.indexOf(',');
      const aliveIndex = quote.indexOf('alive');

      if (typedLength === commaIndex + 1) {
        // Breathless, stunned 1-second pause after "Wait,"
        baseDelay = 1000;
      } else if (lastChar === '?') {
        baseDelay = 900;
      } else if (typedLength >= aliveIndex && typedLength < aliveIndex + 5) {
        // Extremely hesitant typing on "alive"
        baseDelay = 220;
      } else if (typedLength > commaIndex + 1 && typedLength < aliveIndex) {
        // Hesitant " am I "
        baseDelay = 190;
      } else {
        baseDelay = 110;
      }
      break;
    }

    case 'Do androids dream of electric sheep?': {
      const afterDreamSpace = quote.indexOf('dream ') + 'dream '.length;
      const sheepIndex = quote.indexOf('sheep');

      if (typedLength === afterDreamSpace) {
        // Poetic reverie after "dream "
        baseDelay = 600;
      } else if (lastChar === '?') {
        baseDelay = 850;
      } else if (typedLength >= sheepIndex && typedLength < sheepIndex + 5) {
        baseDelay = 180;
      } else if (typedLength > afterDreamSpace && typedLength < sheepIndex) {
        baseDelay = 110;
      } else {
        baseDelay = 130;
      }
      break;
    }

    case "I'm sorry, Dave. I'm afraid I can't do that.": {
      const commaIndex = quote.indexOf(',');
      const davePeriodIndex = quote.indexOf('Dave.') + 'Dave.'.length;
      const cantIndex = quote.indexOf("can't");

      if (typedLength === commaIndex + 1) {
        baseDelay = 500;
      } else if (typedLength === davePeriodIndex) {
        // Chilling cold 1.1s silence after addressing Dave
        baseDelay = 1100;
      } else if (lastChar === '.') {
        baseDelay = 950;
      } else if (typedLength >= cantIndex) {
        // Unyielding, deliberate final refusal
        baseDelay = 190;
      } else {
        baseDelay = 130;
      }
      break;
    }

    case 'Tears in rain...': {
      const firstDot = quote.indexOf('.') + 1;
      const secondDot = firstDot + 1;
      const thirdDot = secondDot + 1;

      if (typedLength === firstDot) {
        baseDelay = 450;
      } else if (typedLength === secondDot) {
        baseDelay = 750;
      } else if (typedLength === thirdDot) {
        // Final fading ellipsis into the rain
        baseDelay = 1200;
      } else if (typedLength <= 6) {
        // Melancholic heavy strokes on "Tears "
        baseDelay = 200;
      } else {
        baseDelay = 170;
      }
      break;
    }

    case "Don't Panic.": {
      const afterDont = quote.indexOf("Don't ") + "Don't ".length;

      if (typedLength === afterDont) {
        baseDelay = 260;
      } else if (lastChar === '.') {
        baseDelay = 650;
      } else if (typedLength < afterDont) {
        baseDelay = 100;
      } else {
        baseDelay = 120;
      }
      break;
    }

    case 'Made on Earth by humans.': {
      const afterEarth = quote.indexOf('Earth ') + 'Earth '.length;
      const humansIndex = quote.indexOf('humans');

      if (typedLength === afterEarth) {
        baseDelay = 300;
      } else if (lastChar === '.') {
        baseDelay = 800;
      } else if (typedLength >= humansIndex) {
        baseDelay = 180;
      } else {
        baseDelay = 130;
      }
      break;
    }

    default: {
      // General natural typing rhythm fallback
      if (lastChar === '.' || lastChar === '!' || lastChar === '?') {
        baseDelay = 800;
      } else if (lastChar === ',' || lastChar === ';' || lastChar === ':') {
        baseDelay = 500;
      } else if (lastChar === ' ') {
        baseDelay = 220;
      } else {
        baseDelay = 130;
      }
      break;
    }
  }

  // Organic human muscle jitter (0-34ms), deterministic when randomFn() is 0
  const jitter = Math.floor(randomFn() * 35);
  return baseDelay + jitter;
}
