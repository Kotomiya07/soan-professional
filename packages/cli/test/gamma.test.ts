import { describe, expect, it } from 'vitest';
import { assertGamma } from '../src/gamma.js';

describe('assertGamma', () => {
  it('accepts any positive gamma, matching the Professional API validator', () => {
    expect(() => {
      assertGamma(0.05);
    }).not.toThrow();
    expect(() => {
      assertGamma(1);
    }).not.toThrow();
    expect(() => {
      assertGamma(3);
    }).not.toThrow();
  });

  it('rejects non-positive and non-finite gamma', () => {
    expect(() => {
      assertGamma(0);
    }).toThrow(/gamma/);
    expect(() => {
      assertGamma(-1);
    }).toThrow(/gamma/);
    expect(() => {
      assertGamma(Number.NaN);
    }).toThrow(/gamma/);
  });
});
