import { describe, expect, it } from 'vitest';
import { soanRenderOptionsFromMetadata } from '../src/render.js';
import type { GenerationMetadata } from '../src/types.js';

function metadataFixture(): GenerationMetadata {
  return {
    engine: 'soan-v1.1.0-compat',
    professionalSlice: true,
    sourceText: 'な［15338］/の',
    renderText: 'な［ID15338］/の',
    seed: 42,
    seedGenerated: false,
    layout: {
      version: 'v1.2',
      attempts: 4,
      passes: 0,
      trailingGap: 0,
    },
    gamma: 1,
    format: 'jpeg',
    directives: [{ kind: 'id', position: 0, raw: '15338', id: 15338 }],
    boundaries: [{ position: 1 }],
    xmp: { embedded: true },
    soanConfig: {
      datasets: [{ url: 'https://codh.rois.ac.jp/soan/dataset/001.json' }],
      allowUnavailableChar: false,
      renmenPriority: 1,
      charsPerLine: 20,
      linesPerPage: 10,
      textureImageLayoutMode: false,
      lineGap: 0.5,
      marginTop: 100,
      marginBottom: 100,
      marginLeft: 100,
      marginRight: 100,
      height: 'auto',
      numLines: 3,
      charSpacing: 20,
      lineSpacing: 30,
      morphologyMode: 'old-japanese',
      border: true,
      centerPage: true,
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
  it('maps the recorded Soan configuration onto compatibility renderer options', () => {
    const metadata = metadataFixture();
    const options = soanRenderOptionsFromMetadata(metadata);

    // Bracket directives resolve as dictionary keys during tokenization, so the
    // renderer needs no directive list and renmen stays enabled.
    expect(options.renmenPriority).toBe(1);
    expect(options.numLines).toBe(3);
    expect(options.charSpacing).toBe(20);
    expect(options.lineSpacing).toBe(30);
    expect(options.morphologyMode).toBe('old-japanese');
    expect(options.border).toBe(true);
    expect(options.centerPage).toBe(true);
    expect(options.layoutVersion).toBe('v1.2');
    expect(options.layoutAttempts).toBe(4);
    expect(options.force).toBe(true);
  });
});
