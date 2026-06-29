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

  it('normalizes full-width digits inside directives before parsing ids', () => {
    const parsed = parseExtendedText('か［４８６７］な');

    expect(parsed.renderText).toBe('かな');
    expect(parsed.directives).toEqual([{ kind: 'id', position: 0, raw: '４８６７', id: 4867 }]);
  });

  it('rejects empty full-width directives', () => {
    expect(() => parseExtendedText('か［］な')).toThrow('Professional directive must not be empty');
  });

  it('rejects multiple directives attached to the same rendered character', () => {
    expect(() => parseExtendedText('か［加］［可］')).toThrow(
      'Only one Professional directive can be attached to render position 0',
    );
  });
});
