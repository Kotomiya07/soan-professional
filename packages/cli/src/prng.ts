import seedrandom from 'seedrandom';

/**
 * seedrandom seeds from arbitrary values by hashing the string representation, but
 * the bundled types only declare the string overload. The renderer passes the
 * numeric seed straight through, and seedrandom hashes a number differently
 * from its own string form, so the number must reach it unconverted.
 */
type NumericSeedrandom = (seed: number) => seedrandom.PRNG;

const seedNumeric = seedrandom as unknown as NumericSeedrandom;

/**
 * Builds the same generator the renderer uses for glyph selection, so a seed
 * reported by the CLI replays identically.
 */
export function createSeededRandom(seed: number): () => number {
  return seedNumeric(seed);
}

/**
 * Draws a seed the way the reference implementation does when none was given:
 * a signed 32-bit integer from an unseeded generator, reported back to the
 * user so the render can be reproduced.
 */
export function generateSeed(): number {
  return seedrandom().int32();
}
