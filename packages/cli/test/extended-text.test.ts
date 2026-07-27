import { describe, expect, it } from 'vitest';
import { directiveDictionaryKey, parseExtendedText } from '../src/extended-text.js';

describe('parseExtendedText', () => {
  it('records slash boundary positions while leaving the marker for the engine to strip', () => {
    const parsed = parseExtendedText('はな/の');

    // Professional splits on the half-width slash inside the rendering engine,
    // so the marker stays in the render text and is dropped during layout.
    expect(parsed.renderText).toBe('はな/の');
    expect(parsed.boundaries).toEqual([{ position: 2 }]);
    expect(parsed.glyphCount).toBe(3);
  });

  it('keeps full-width jibo directives as dictionary keys in the render text', () => {
    const parsed = parseExtendedText('［加］［八良］ぬ');

    // ［八良］ stays one token so renmen (連綿) glyphs remain selectable.
    expect(parsed.renderText).toBe('［加］［八良］ぬ');
    expect(parsed.directives).toEqual([
      { kind: 'jibo', position: 0, raw: '加', jibo: '加' },
      { kind: 'jibo', position: 1, raw: '八良', jibo: '八良' },
    ]);
    expect(parsed.glyphCount).toBe(3);
  });

  it('counts a bracket token as a single glyph position', () => {
    const parsed = parseExtendedText('か［加］な');

    expect(parsed.renderText).toBe('か［加］な');
    expect(parsed.directives).toEqual([{ kind: 'jibo', position: 1, raw: '加', jibo: '加' }]);
    expect(parsed.glyphCount).toBe(3);
  });

  it('normalizes bare numeric directives to the ID dictionary key', () => {
    const parsed = parseExtendedText('［4867］［八良］ぬ');

    expect(parsed.renderText).toBe('［ID4867］［八良］ぬ');
    expect(parsed.directives).toEqual([
      { kind: 'id', position: 0, raw: '4867', id: 4867 },
      { kind: 'jibo', position: 1, raw: '八良', jibo: '八良' },
    ]);
  });

  it('accepts ID-prefixed glyph id directives', () => {
    const parsed = parseExtendedText('［ID4867］ぬ');

    expect(parsed.renderText).toBe('［ID4867］ぬ');
    expect(parsed.directives).toEqual([{ kind: 'id', position: 0, raw: 'ID4867', id: 4867 }]);
  });

  it('normalizes full-width digits inside directives before parsing ids', () => {
    const parsed = parseExtendedText('［４８６７］な');

    expect(parsed.renderText).toBe('［ID4867］な');
    expect(parsed.directives).toEqual([{ kind: 'id', position: 0, raw: '４８６７', id: 4867 }]);
  });

  it('rejects empty full-width directives', () => {
    expect(() => parseExtendedText('か［］な')).toThrow('Professional directive must not be empty');
  });

  it('keeps half-width square brackets as literal text', () => {
    const parsed = parseExtendedText('[加]な');

    expect(parsed.renderText).toBe('[加]な');
    expect(parsed.directives).toEqual([]);
    expect(parsed.boundaries).toEqual([]);
  });

  it('keeps full-width slashes as literal text instead of boundaries', () => {
    const parsed = parseExtendedText('か／な');

    expect(parsed.renderText).toBe('か／な');
    expect(parsed.boundaries).toEqual([]);
  });

  it('keeps consecutive directives as separate dictionary keys', () => {
    const parsed = parseExtendedText('か［加］［可］');

    expect(parsed.renderText).toBe('か［加］［可］');
    expect(parsed.directives).toEqual([
      { kind: 'jibo', position: 1, raw: '加', jibo: '加' },
      { kind: 'jibo', position: 2, raw: '可', jibo: '可' },
    ]);
  });
});

describe('directiveDictionaryKey', () => {
  it('renders both id notations as the same dictionary key', () => {
    expect(directiveDictionaryKey({ kind: 'id', position: 0, raw: '4867', id: 4867 })).toBe(
      '［ID4867］',
    );
    expect(directiveDictionaryKey({ kind: 'id', position: 0, raw: 'ID4867', id: 4867 })).toBe(
      '［ID4867］',
    );
  });

  it('renders a jibo directive as its bracket form', () => {
    expect(directiveDictionaryKey({ kind: 'jibo', position: 0, raw: '八良', jibo: '八良' })).toBe(
      '［八良］',
    );
  });
});
