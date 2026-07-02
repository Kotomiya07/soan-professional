import { describe, expect, it } from 'vitest';
import { parseExtendedText } from '../src/extended-text.js';

describe('parseExtendedText', () => {
  it('removes slash boundaries from render text and records boundary positions', () => {
    const parsed = parseExtendedText('はな/の');

    expect(parsed.renderText).toBe('はなの');
    expect(parsed.boundaries).toEqual([{ position: 2 }]);
  });

  it('expands full-width jibo directives into render text at the directive position', () => {
    const parsed = parseExtendedText('［加］［八良］ぬ');

    expect(parsed.renderText).toBe('かはらぬ');
    expect(parsed.directives).toEqual([
      { kind: 'jibo', position: 0, raw: '加', jibo: '加' },
      { kind: 'jibo', position: 1, raw: '八良', jibo: '八良' },
    ]);
  });

  it('keeps legacy postfix jibo directives as compatibility notation', () => {
    const parsed = parseExtendedText('か［加］な');

    expect(parsed.renderText).toBe('かな');
    expect(parsed.directives).toEqual([{ kind: 'jibo', position: 0, raw: '加', jibo: '加' }]);
  });

  it('records full-width numeric directives as glyph ids and expands them with an addressable placeholder', () => {
    const parsed = parseExtendedText('［4867］［八良］ぬ');

    expect(parsed.renderText).toBe('Nはらぬ');
    expect(parsed.directives).toEqual([
      { kind: 'id', position: 0, raw: '4867', id: 4867 },
      { kind: 'jibo', position: 1, raw: '八良', jibo: '八良' },
    ]);
  });

  it('accepts ID-prefixed glyph id directives', () => {
    const parsed = parseExtendedText('［ID4867］ぬ');

    expect(parsed.renderText).toBe('Nぬ');
    expect(parsed.directives).toEqual([{ kind: 'id', position: 0, raw: 'ID4867', id: 4867 }]);
  });

  it('normalizes full-width digits inside directives before parsing ids', () => {
    const parsed = parseExtendedText('［４８６７］な');

    expect(parsed.renderText).toBe('Nな');
    expect(parsed.directives).toEqual([{ kind: 'id', position: 0, raw: '４８６７', id: 4867 }]);
  });

  it('rejects empty full-width directives', () => {
    expect(() => parseExtendedText('か［］な')).toThrow('Professional directive must not be empty');
  });

  it('treats a directive after another directive as another inline replacement', () => {
    const parsed = parseExtendedText('か［加］［可］');

    expect(parsed.renderText).toBe('かか');
    expect(parsed.directives).toEqual([
      { kind: 'jibo', position: 0, raw: '加', jibo: '加' },
      { kind: 'jibo', position: 1, raw: '可', jibo: '可' },
    ]);
  });
});
