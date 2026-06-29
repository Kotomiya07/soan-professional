import { describe, expect, it } from 'vitest';
import { parseExtendedText } from '../src/extended-text.js';

describe('parseExtendedText', () => {
  it('removes slash boundaries from render text and records boundary positions', () => {
    const parsed = parseExtendedText('はな/の');

    expect(parsed.renderText).toBe('はなの');
    expect(parsed.boundaries).toEqual([{ position: 2 }]);
  });

  it('records full-width jibo directives on the previous rendered character', () => {
    const parsed = parseExtendedText('か［加］な');

    expect(parsed.renderText).toBe('かな');
    expect(parsed.directives).toEqual([{ kind: 'jibo', position: 0, raw: '加', jibo: '加' }]);
  });

  it('records full-width numeric directives as glyph ids', () => {
    const parsed = parseExtendedText('か［4867］な');

    expect(parsed.renderText).toBe('かな');
    expect(parsed.directives).toEqual([{ kind: 'id', position: 0, raw: '4867', id: 4867 }]);
  });
});
