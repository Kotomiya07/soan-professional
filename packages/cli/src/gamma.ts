/**
 * Gamma is applied by the rendering engine to the glyph layer before the paper
 * texture is composited. The reference implementation accepts every positive
 * value, so validation only rejects non-positive and non-finite input.
 */
export function assertGamma(gamma: number): void {
  if (!Number.isFinite(gamma) || gamma <= 0) {
    throw new Error(`--gamma must be greater than 0: ${gamma}`);
  }
}
