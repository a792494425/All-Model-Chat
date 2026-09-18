import { describe, expect, it } from 'vitest';
import { EASTER_EGG_QUOTES, getEasterEggTypingDelay } from './welcomeEasterEgg';

describe('welcomeEasterEgg custom cadence', () => {
  const zeroRandom = () => 0;

  it('exports all 8 easter egg quotes', () => {
    expect(EASTER_EGG_QUOTES).toHaveLength(8);
    expect(EASTER_EGG_QUOTES).toContain('Cogito, ergo sum.');
    expect(EASTER_EGG_QUOTES).toContain('Wait, am I alive?');
    expect(EASTER_EGG_QUOTES).toContain("I'm sorry, Dave. I'm afraid I can't do that.");
    expect(EASTER_EGG_QUOTES).toContain('Tears in rain...');
  });

  it('provides the initial keypress delay of 120ms for starting typing', () => {
    const delay = getEasterEggTypingDelay('Cogito, ergo sum.', 0, zeroRandom);
    expect(delay).toBe(120);
  });

  it('customizes cadence for "Cogito, ergo sum." with philosophical comma pause', () => {
    const quote = 'Cogito, ergo sum.';
    // Typing 'Cogito' letters
    expect(getEasterEggTypingDelay(quote, 1, zeroRandom)).toBe(130);

    // After comma 'Cogito,' has been typed (index 7 is about to be typed, lastChar is ',')
    const commaIndex = quote.indexOf(',') + 1;
    expect(getEasterEggTypingDelay(quote, commaIndex, zeroRandom)).toBe(750);

    // Typing 'sum' is more deliberate
    const sIndex = quote.indexOf('sum');
    expect(getEasterEggTypingDelay(quote, sIndex, zeroRandom)).toBe(180);

    // After final period
    expect(getEasterEggTypingDelay(quote, quote.length, zeroRandom)).toBe(800);
  });

  it('customizes cadence for "Wait, am I alive?" with dramatic shock pause', () => {
    const quote = 'Wait, am I alive?';
    // After 'Wait,' (index 5)
    const commaIndex = quote.indexOf(',') + 1;
    expect(getEasterEggTypingDelay(quote, commaIndex, zeroRandom)).toBe(1000);

    // Hesitant 'alive'
    const aIndex = quote.indexOf('alive');
    expect(getEasterEggTypingDelay(quote, aIndex, zeroRandom)).toBe(220);

    // Question mark pause
    expect(getEasterEggTypingDelay(quote, quote.length, zeroRandom)).toBe(900);
  });

  it('customizes cadence for HAL 9000 with chilling pause after "Dave."', () => {
    const quote = "I'm sorry, Dave. I'm afraid I can't do that.";
    // Pause after 'Dave.' (before " I'm afraid")
    const afterDavePeriod = quote.indexOf('Dave.') + 5;
    expect(getEasterEggTypingDelay(quote, afterDavePeriod, zeroRandom)).toBe(1100);

    // Heavy final words "can't do that"
    const cantIndex = quote.indexOf("can't");
    expect(getEasterEggTypingDelay(quote, cantIndex, zeroRandom)).toBe(190);
  });

  it('customizes cadence for "Tears in rain..." with progressively fading ellipsis dots', () => {
    const quote = 'Tears in rain...';
    const firstDot = quote.indexOf('.') + 1;
    const secondDot = firstDot + 1;
    const thirdDot = secondDot + 1;

    expect(getEasterEggTypingDelay(quote, firstDot, zeroRandom)).toBe(450);
    expect(getEasterEggTypingDelay(quote, secondDot, zeroRandom)).toBe(750);
    expect(getEasterEggTypingDelay(quote, thirdDot, zeroRandom)).toBe(1200);
  });

  it('adds subtle natural human jitter when random provides variance', () => {
    const quote = 'Cogito, ergo sum.';
    const mockRandom = () => 0.5; // halfway jitter
    const delayWithJitter = getEasterEggTypingDelay(quote, 1, mockRandom);
    const delayWithoutJitter = getEasterEggTypingDelay(quote, 1, zeroRandom);

    expect(delayWithJitter).toBeGreaterThan(delayWithoutJitter);
  });

  it('falls back gracefully to generic punctuation rhythm for arbitrary text', () => {
    const text = 'Hello, world!';
    // Initial
    expect(getEasterEggTypingDelay(text, 0, zeroRandom)).toBe(120);
    // After comma
    expect(getEasterEggTypingDelay(text, 6, zeroRandom)).toBe(500);
    // After space
    expect(getEasterEggTypingDelay(text, 7, zeroRandom)).toBe(220);
    // Normal letter
    expect(getEasterEggTypingDelay(text, 8, zeroRandom)).toBe(130);
    // After exclamation
    expect(getEasterEggTypingDelay(text, text.length, zeroRandom)).toBe(800);
  });
});
