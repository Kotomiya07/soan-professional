import type { SoanRenderedGlyph } from './types.js';

/**
 * v1.2 typesetting improvement: when line-head kinsoku pushes glyphs to the
 * next line, the Professional service retries alternative glyph combinations
 * to reduce the trailing gap at line ends. The compatibility CLI reproduces
 * this by rendering deterministic seed-derived attempts and keeping the
 * attempt with the smallest measured trailing gap.
 */

const ATTEMPT_SEED_STRIDE = 1000003;

export function deriveAttemptSeed(baseSeed: number, attempt: number): number {
  if (!Number.isSafeInteger(baseSeed)) {
    throw new Error(`Layout attempt base seed must be a safe integer: ${baseSeed}`);
  }
  if (!Number.isInteger(attempt) || attempt < 0) {
    throw new Error(`Layout attempt index must be a non-negative integer: ${attempt}`);
  }
  // Attempt 0 must reproduce historical single-attempt rendering exactly.
  return baseSeed + attempt * ATTEMPT_SEED_STRIDE;
}

export function countSoftLines(glyphs: readonly SoanRenderedGlyph[]): number {
  return new Set(glyphs.map((glyph) => glyph.softLine ?? glyph.line)).size;
}

/**
 * Measures the total trailing gap across soft lines: for each line, the
 * distance between that line's last glyph bottom and the deepest line bottom.
 * A perfectly filled layout measures 0.
 */
export function measureTrailingGap(glyphs: readonly SoanRenderedGlyph[]): number {
  const bottoms = new Map<number, number>();
  for (const glyph of glyphs) {
    if (glyph.y === undefined || glyph.height === undefined) {
      continue;
    }
    const line = glyph.softLine ?? glyph.line;
    const bottom = glyph.y + glyph.height;
    const current = bottoms.get(line);
    if (current === undefined || bottom > current) {
      bottoms.set(line, bottom);
    }
  }

  if (bottoms.size <= 1) {
    return 0;
  }

  const deepest = Math.max(...bottoms.values());
  let gap = 0;
  for (const bottom of bottoms.values()) {
    gap += deepest - bottom;
  }
  return gap;
}
