import { describe, expect, it } from 'vitest';
import {
  assertSafeTarEntries,
  chukoDictionaryPathFromParentDirectory,
  defaultChukoDictionaryPath,
  defaultDictionaryParentDirectory,
} from '../src/dictionary.js';

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

describe('defaultDictionaryParentDirectory', () => {
  it('uses macOS Application Support for the default install parent', () => {
    expect(
      defaultDictionaryParentDirectory({
        platform: 'darwin',
        env: {},
        homeDirectory: '/Users/ryo',
      }),
    ).toBe('/Users/ryo/Library/Application Support/soan-professional/dictionaries');
  });

  it('uses XDG data home on Linux when it is available', () => {
    expect(
      defaultDictionaryParentDirectory({
        platform: 'linux',
        env: { XDG_DATA_HOME: '/data' },
        homeDirectory: '/home/ryo',
      }),
    ).toBe('/data/soan-professional/dictionaries');
  });

  it('falls back to ~/.local/share on Linux', () => {
    expect(
      defaultDictionaryParentDirectory({
        platform: 'linux',
        env: {},
        homeDirectory: '/home/ryo',
      }),
    ).toBe('/home/ryo/.local/share/soan-professional/dictionaries');
  });

  it('uses LOCALAPPDATA on Windows', () => {
    expect(
      defaultDictionaryParentDirectory({
        platform: 'win32',
        env: { LOCALAPPDATA: 'C:\\Users\\ryo\\AppData\\Local' },
        homeDirectory: 'C:\\Users\\ryo',
      }),
    ).toBe('C:\\Users\\ryo\\AppData\\Local\\soan-professional\\dictionaries');
  });

  it('uses the same default dictionary path as dict path prints without --output', () => {
    expect(
      defaultChukoDictionaryPath({
        platform: 'darwin',
        env: {},
        homeDirectory: '/Users/ryo',
      }),
    ).toBe(
      '/Users/ryo/Library/Application Support/soan-professional/dictionaries/unidic-chuko-v202512',
    );
  });

  it('keeps explicit --output directories as the dictionary parent', () => {
    expect(chukoDictionaryPathFromParentDirectory('/tmp/soan-dicts')).toBe(
      '/tmp/soan-dicts/unidic-chuko-v202512',
    );
  });
});
