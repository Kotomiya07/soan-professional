import { createRequire } from 'node:module';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { applyGammaToRgba } from './gamma.js';
import { withSeededMathRandom } from './prng.js';
import type { CanvasLike, CliOptions, GenerationMetadata, SoanFactory, SoanInstance, SoanRenderOptions } from './types.js';

const require = createRequire(import.meta.url);
const createSoan = require('soan') as SoanFactory;

function soanConfigFromOptions(options: CliOptions) {
  return {
    datasets: options.datasets,
    allowUnavailableChar: options.allowUnavailableChar,
    renmenPriority: options.renmenPriority,
    charsPerLine: options.charsPerLine,
    lineGap: options.lineGap,
    marginTop: options.marginTop,
    marginBottom: options.marginBottom,
    marginLeft: options.marginLeft,
    marginRight: options.marginRight,
    height: options.height,
    numLines: options.numLines,
    charSpacing: options.charSpacing,
    lineSpacing: options.lineSpacing,
    morphologyMode: options.morphologyMode,
    fontFamily: options.fontFamily,
    fontColor: options.fontColor,
    scale: options.scale,
    paperTexture: options.paperTexture,
    white: options.white,
    black: options.black,
  };
}

function encodeCanvas(canvas: CanvasLike, format: 'jpeg' | 'png', quality: number): Buffer {
  if (format === 'png') {
    return canvas.toBuffer('image/png');
  }
  return canvas.toBuffer('image/jpeg', { quality });
}

async function applyGammaToBuffer(buffer: Buffer, format: 'jpeg' | 'png', quality: number, gamma: number): Promise<Buffer> {
  if (gamma === 1) {
    return buffer;
  }

  const image = await loadImage(buffer);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  applyGammaToRgba(imageData.data, gamma);
  context.putImageData(imageData, 0, 0);

  return encodeCanvas(canvas, format, quality);
}

export function soanRenderOptionsFromMetadata(metadata: GenerationMetadata): SoanRenderOptions {
  const hasForcedGlyph = metadata.directives.length > 0;
  return {
    canvas: createCanvas(1, 1),
    force: true,
    // Forced glyph directives are position-based. The compatibility engine can
    // choose multi-character renmen tokens before final glyph selection, so
    // directive-bearing renders use single-character preference to keep those
    // positions addressable without a full selector rewrite.
    renmenPriority: hasForcedGlyph ? 0 : metadata.soanConfig.renmenPriority,
    numLines: metadata.soanConfig.numLines,
    charSpacing: metadata.soanConfig.charSpacing,
    lineSpacing: metadata.soanConfig.lineSpacing,
    morphologyMode: metadata.soanConfig.morphologyMode,
    professionalDirectives: metadata.directives,
    professionalBoundaries: metadata.boundaries,
  };
}

async function renderWithSoan(soan: SoanInstance, metadata: GenerationMetadata, seed: number | undefined) {
  return withSeededMathRandom(seed, () =>
    soan.getTextImageFromTextPromise(metadata.renderText, soanRenderOptionsFromMetadata(metadata)),
  );
}

function createSoanQuietly(options: CliOptions): SoanInstance | undefined {
  const originalLog = console.log;
  console.log = (...args: readonly unknown[]) => {
    const [first] = args;
    if (typeof first === 'string' && first.startsWith('Soan: Library for rendering modern Japanese')) {
      return;
    }
    originalLog(...args);
  };
  try {
    return createSoan(soanConfigFromOptions(options));
  } finally {
    console.log = originalLog;
  }
}

export interface GeneratedImage {
  readonly buffer: Buffer;
  readonly renderedGlyphs: GenerationMetadata['renderedGlyphs'];
  readonly image: GenerationMetadata['image'];
}

export async function generateImage(options: CliOptions, metadata: GenerationMetadata): Promise<GeneratedImage> {
  const soan = createSoanQuietly(options);
  if (soan === undefined) {
    throw new Error('Failed to initialize Soan');
  }

  const renderResult = await renderWithSoan(soan, metadata, options.seed);
  const canvas = renderResult.opt.canvas;

  // The CLI owns Professional metadata injection after rendering. Encoding
  // directly avoids producing an upstream Soan XMP segment plus a second CLI
  // XMP segment in the same JPEG.
  const baseBuffer = encodeCanvas(canvas, options.format, options.quality);

  return {
    buffer: await applyGammaToBuffer(baseBuffer, options.format, options.quality, options.gamma),
    renderedGlyphs: renderResult.result,
    image: {
      width: canvas.width ?? 0,
      height: canvas.height ?? 0,
    },
  };
}

export { soanConfigFromOptions };
