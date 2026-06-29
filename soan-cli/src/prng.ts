export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  if (state === 0) {
    state = 0x6d2b79f5;
  }

  return () => {
    // Mulberry32 is compact and deterministic across Node versions because it
    // only uses 32-bit integer operations. That matters more here than
    // statistical strength: the seed is for reproducible glyph choices, not
    // cryptography.
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export async function withSeededMathRandom<T>(seed: number | undefined, task: () => Promise<T>): Promise<T> {
  if (seed === undefined) {
    return task();
  }

  const originalRandom = Math.random;
  Math.random = createSeededRandom(seed);
  try {
    return await task();
  } finally {
    Math.random = originalRandom;
  }
}
