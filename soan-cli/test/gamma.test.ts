import { describe, expect, it } from 'vitest';
import { applyGammaToRgba } from '../src/gamma.js';

describe('applyGammaToRgba', () => {
  it('keeps alpha unchanged and adjusts RGB channels', () => {
    const rgba = new Uint8ClampedArray([64, 128, 192, 77]);
    const adjusted = applyGammaToRgba(rgba, 2);

    expect(adjusted[3]).toBe(77);
    expect(adjusted[0]).toBeGreaterThan(64);
    expect(adjusted[1]).toBeGreaterThan(128);
    expect(adjusted[2]).toBeGreaterThan(192);
  });

  it('rejects gamma outside the supported Pro range', () => {
    expect(() => applyGammaToRgba(new Uint8ClampedArray([0, 0, 0, 255]), 3)).toThrow(/gamma/);
  });
});
