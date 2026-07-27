import { describe, expect, it } from 'vitest';
import { createSeededRandom, generateSeed } from '../src/prng.js';

describe('createSeededRandom', () => {
  it('returns the same sequence for the same seed', () => {
    const left = createSeededRandom(42);
    const right = createSeededRandom(42);

    expect([left(), left(), left()]).toEqual([right(), right(), right()]);
  });

  it('returns different sequences for different seeds', () => {
    expect(createSeededRandom(42)()).not.toBe(createSeededRandom(7)());
  });

  it('seeds from the number itself, matching how the renderer seeds', () => {
    // seedrandom hashes 42 and '42' into different states. This pins the first
    // value for the numeric seed, so stringifying it anywhere in the chain
    // would break replay against the renderer and fail here.
    expect(createSeededRandom(42)()).toBeCloseTo(0.0016341939679719736, 15);
  });
});

describe('generateSeed', () => {
  it('draws a signed 32-bit integer', () => {
    const seed = generateSeed();

    expect(Number.isSafeInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(-2147483648);
    expect(seed).toBeLessThanOrEqual(2147483647);
  });
});
