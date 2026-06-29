import { describe, expect, it } from 'vitest';
import { soanRenderOptionsFromMetadata } from '../src/render.js';
import type { GenerationMetadata } from '../src/types.js';

function metadataFixture(): GenerationMetadata {
  return {
    engine: 'soan-v1.1.0-compat',
    professionalSlice: true,
    sourceText: 'N［15338］/O',
    renderText: 'NO',
    seed: 42,
    gamma: 1,
    format: 'jpeg',
    directives: [{ kind: 'id', position: 0, raw: '15338', id: 15338 }],
    boundaries: [{ position: 1 }],
    xmp: { embedded: true },
    soanConfig: {
      datasets: [{ url: 'http://codh.rois.ac.jp/soan/dataset/001.json' }],
      allowUnavailableChar: false,
      renmenPriority: 1,
      charsPerLine: 20,
      lineGap: 0.5,
      marginTop: 100,
      marginBottom: 100,
      marginLeft: 100,
      marginRight: 100,
      height: 'auto',
      numLines: 3,
      charSpacing: 20,
      lineSpacing: 30,
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

describe('soanRenderOptionsFromMetadata', () => {
  it('passes Professional directives and boundaries to the Soan compatibility renderer', () => {
    const metadata = metadataFixture();
    const options = soanRenderOptionsFromMetadata(metadata);

    expect(options.professionalDirectives).toBe(metadata.directives);
    expect(options.professionalBoundaries).toBe(metadata.boundaries);
    expect(options.renmenPriority).toBe(0);
    expect(options.numLines).toBe(3);
    expect(options.charSpacing).toBe(20);
    expect(options.lineSpacing).toBe(30);
    expect(options.force).toBe(true);
  });
});
