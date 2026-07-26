import { describe, expect, it } from 'vitest';
import { countSoftLines, deriveAttemptSeed, measureTrailingGap } from '../src/layout.js';
import { SAMPLE_TEXT } from '../src/sample-text.js';
import type { SoanRenderedGlyph } from '../src/types.js';

function glyph(partial: Partial<SoanRenderedGlyph>): SoanRenderedGlyph {
  return {
    url: 'tmp/glyph.jpg',
    token: 'か',
    line: 0,
    available: true,
    isFallback: false,
    ...partial,
  };
}

describe('deriveAttemptSeed', () => {
  it('returns the base seed unchanged for attempt 0', () => {
    expect(deriveAttemptSeed(42, 0)).toBe(42);
    expect(deriveAttemptSeed(-7, 0)).toBe(-7);
  });

  it('derives deterministic distinct seeds for later attempts', () => {
    const seeds = [0, 1, 2, 3].map((attempt) => deriveAttemptSeed(42, attempt));
    expect(new Set(seeds).size).toBe(4);
    expect(seeds).toEqual([0, 1, 2, 3].map((attempt) => deriveAttemptSeed(42, attempt)));
  });

  it('rejects invalid inputs', () => {
    expect(() => deriveAttemptSeed(Number.NaN, 0)).toThrow('safe integer');
    expect(() => deriveAttemptSeed(42, -1)).toThrow('non-negative');
  });
});

describe('measureTrailingGap', () => {
  it('measures 0 for a single line', () => {
    const glyphs = [glyph({ softLine: 0, y: 100, height: 100 })];
    expect(measureTrailingGap(glyphs)).toBe(0);
  });

  it('sums the gap between each line bottom and the deepest line bottom', () => {
    const glyphs = [
      glyph({ softLine: 0, y: 100, height: 100 }),
      glyph({ softLine: 0, y: 200, height: 100 }),
      glyph({ softLine: 1, y: 100, height: 100 }),
    ];
    // line 0 bottom: 300, line 1 bottom: 200 -> gap 100
    expect(measureTrailingGap(glyphs)).toBe(100);
  });

  it('ignores glyphs without geometry and falls back to hard lines', () => {
    const glyphs = [
      glyph({ line: 0, y: 0, height: 150 }),
      glyph({ line: 1 }),
      glyph({ line: 1, y: 0, height: 100 }),
    ];
    expect(measureTrailingGap(glyphs)).toBe(50);
  });
});

describe('countSoftLines', () => {
  it('prefers soft lines and falls back to hard lines', () => {
    const glyphs = [
      glyph({ softLine: 0 }),
      glyph({ softLine: 1 }),
      glyph({ line: 1 }),
      glyph({ softLine: 2 }),
    ];
    expect(countSoftLines(glyphs)).toBe(3);
  });
});

describe('SAMPLE_TEXT', () => {
  it('is the Sangetsuki opening used by the Professional web UI sample button', () => {
    expect(SAMPLE_TEXT.startsWith('隴西の李徴は博学才穎')).toBe(true);
    expect(SAMPLE_TEXT.endsWith('。')).toBe(true);
  });
});
