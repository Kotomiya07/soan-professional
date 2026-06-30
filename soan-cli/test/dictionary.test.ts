import { describe, expect, it } from 'vitest';
import { assertSafeTarEntries } from '../src/dictionary.js';

describe('assertSafeTarEntries', () => {
  it('accepts normal relative dictionary paths', () => {
    expect(() => {
      assertSafeTarEntries(['unidic-chuko-v202512/', 'unidic-chuko-v202512/sys.dic']);
    }).not.toThrow();
  });

  it('rejects absolute paths', () => {
    expect(() => {
      assertSafeTarEntries(['/tmp/sys.dic']);
    }).toThrow('Unsafe dictionary archive path');
  });

  it('rejects parent traversal paths', () => {
    expect(() => {
      assertSafeTarEntries(['unidic-chuko-v202512/../../sys.dic']);
    }).toThrow('Unsafe dictionary archive path');
  });
});
