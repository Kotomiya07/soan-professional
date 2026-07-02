import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../src/prng.js';

describe('createSeededRandom', () => {
  it('returns the same sequence for the same seed', () => {
    const left = createSeededRandom(42);
    const right = createSeededRandom(42);

    expect([left(), left(), left()]).toEqual([right(), right(), right()]);
  });
});
