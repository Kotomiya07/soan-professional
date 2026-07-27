import { describe, expect, it } from 'vitest';
import { majorPartOfSpeech, normalizedCharLength, splitAnalysisUnits } from '../src/mecab.js';

describe('majorPartOfSpeech', () => {
  it('collapses UniDic compound POS to the major category', () => {
    expect(majorPartOfSpeech('助詞-係助詞')).toBe('助詞');
    expect(majorPartOfSpeech('名詞-普通名詞-副詞可能')).toBe('名詞');
    expect(majorPartOfSpeech('動詞-一般')).toBe('動詞');
  });

  it('keeps a simple POS unchanged', () => {
    expect(majorPartOfSpeech('副詞')).toBe('副詞');
  });

  it('falls back for an empty POS', () => {
    expect(majorPartOfSpeech('')).toBe('古文');
  });
});

describe('splitAnalysisUnits', () => {
  it('splits on the half-width slash boundary and drops it', () => {
    expect(splitAnalysisUnits('けふ/こそ')).toEqual(['けふ', 'こそ']);
  });

  it('keeps 。 attached to the preceding unit like the renderer', () => {
    expect(splitAnalysisUnits('はる。なつ')).toEqual(['はる。', 'なつ']);
  });

  it('splits lines on newline', () => {
    expect(splitAnalysisUnits('あい\nうえ')).toEqual(['あい', 'うえ']);
  });

  it('ignores empty units from doubled separators', () => {
    expect(splitAnalysisUnits('あ//い')).toEqual(['あ', 'い']);
  });
});

describe('normalizedCharLength', () => {
  it('counts plain kana one code point each', () => {
    expect(normalizedCharLength('けふ')).toBe(2);
  });

  it('drops voicing marks like the renderer normalization', () => {
    expect(normalizedCharLength('がぎ')).toBe(2);
    expect(normalizedCharLength('が')).toBe(1);
  });

  it('counts whitespace, matching the renderer when MeCab echoes it', () => {
    expect(normalizedCharLength('けふ ')).toBe(3);
  });
});
