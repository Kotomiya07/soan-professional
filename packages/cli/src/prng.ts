export function createSeededRandom(seed: number): () => number {
  const mask = (1n << 64n) - 1n;
  let splitmixState = BigInt.asUintN(64, BigInt(seed));

  function splitmix64(): bigint {
    splitmixState = (splitmixState + 0x9e3779b97f4a7c15n) & mask;
    let value = splitmixState;
    value = ((value ^ (value >> 30n)) * 0xbf58476d1ce4e5b9n) & mask;
    value = ((value ^ (value >> 27n)) * 0x94d049bb133111ebn) & mask;
    return (value ^ (value >> 31n)) & mask;
  }

  let state0 = splitmix64();
  let state1 = splitmix64();
  if (state0 === 0n && state1 === 0n) {
    state1 = 1n;
  }

  // xorshift128+ uses two 64-bit state words. BigInt keeps the integer
  // transitions exact, so the sequence is stable across Node.js versions.
  return () => {
    const x = state0;
    let y = state1;
    state0 = y;
    y ^= (y << 23n) & mask;
    state1 = (y ^ x ^ (y >> 17n) ^ (x >> 26n)) & mask;
    const result = (state1 + x) & mask;
    return Number(result >> 11n) / 9007199254740992;
  };
}

export async function withSeededMathRandom<T>(
  seed: number | undefined,
  task: () => Promise<T>,
): Promise<T> {
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
