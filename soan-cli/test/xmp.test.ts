import { describe, expect, it } from 'vitest';
import { injectXmpMetadata, tryInjectXmpMetadata } from '../src/xmp.js';
import type { GenerationMetadata } from '../src/types.js';

function metadataFixture(): GenerationMetadata {
  return {
    engine: 'soan-v1.1.0-compat',
    professionalSlice: true,
    sourceText: 'か［加］',
    renderText: 'か',
    gamma: 1,
    format: 'jpeg',
    directives: [{ kind: 'jibo', position: 0, raw: '加', jibo: '加' }],
    boundaries: [],
    xmp: { embedded: true },
    soanConfig: {
      datasets: [{ url: 'https://codh.rois.ac.jp/soan/dataset/001.json' }],
      allowUnavailableChar: false,
      renmenPriority: 1,
      charsPerLine: 20,
      lineGap: 0.5,
      marginTop: 100,
      marginBottom: 100,
      marginLeft: 100,
      marginRight: 100,
      height: 'auto',
      charSpacing: 0,
      lineSpacing: 0,
      morphologyMode: 'modern',
      fontFamily: 'serif',
      fontColor: '#000000',
      scale: 1,
      paperTexture: '',
      white: '#ffffff',
      black: '#000000',
    },
    generatedAt: '2026-06-29T00:00:00.000Z',
  };
}

describe('injectXmpMetadata', () => {
  it('inserts an APP1 XMP segment after the JPEG SOI marker', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const injected = injectXmpMetadata(jpeg, metadataFixture());

    expect(injected.subarray(0, 4)).toEqual(Buffer.from([0xff, 0xd8, 0xff, 0xe1]));
    expect(injected.toString('utf8')).toContain('http://ns.adobe.com/xap/1.0/');
    expect(injected.toString('utf8')).toContain('&quot;jibo&quot;:&quot;加&quot;');
  });

  it('rejects non-JPEG buffers', () => {
    expect(() => injectXmpMetadata(Buffer.from([0x89, 0x50, 0x4e, 0x47]), metadataFixture())).toThrow(
      'XMP metadata can only be embedded into JPEG buffers',
    );
  });

  it('falls back to compact XMP when full metadata is too large', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const metadata = {
      ...metadataFixture(),
      renderedGlyphs: Array.from({ length: 4000 }, (_, index) => ({
        url: `https://example.test/${index}.png`,
        token: 'か',
        line: 0,
        available: true,
        isFallback: false,
        jibo: '加',
      })),
      selectedGlyphs: [
        {
          url: 'https://example.test/000001.png',
          token: 'か',
          line: 0,
          available: true,
          isFallback: false,
          jibo: '加',
          position: 0,
          glyphId: 1,
        },
      ],
    };

    const result = tryInjectXmpMetadata(jpeg, metadata);

    expect(result.embedded).toBe(true);
    expect(result.mode).toBe('compact');
    expect(result.buffer.toString('utf8')).toContain('&quot;mode&quot;:&quot;compact&quot;');
  });

  it('falls back to sidecar-only metadata when even compact XMP is too large', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const metadata = {
      ...metadataFixture(),
      sourceText: 'か'.repeat(70000),
      renderText: 'か'.repeat(70000),
    };

    const result = tryInjectXmpMetadata(jpeg, metadata);

    expect(result.embedded).toBe(false);
    expect(result.buffer).toBe(jpeg);
    expect(result.reason).toContain('XMP metadata is too large');
  });
});
