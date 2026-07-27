import { createRequire } from 'node:module';
import { createCanvas } from '@napi-rs/canvas';
import type {
  CanvasLike,
  CliOptions,
  GenerationMetadata,
  LayoutMetadata,
  SoanFactory,
  SoanInstance,
  SoanRenderOptions,
} from './types.js';

const require = createRequire(import.meta.url);

function loadSoanFactory(): SoanFactory {
  try {
    return require('../vendor/soan/soan/soan.cjs') as SoanFactory;
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'MODULE_NOT_FOUND') {
      return require('soan') as SoanFactory;
    }
    throw error;
  }
}

const createSoan = loadSoanFactory();

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
    pageWidth: options.pageWidth,
    pageHeight: options.pageHeight,
    numLines: options.numLines,
    linesPerPage: options.linesPerPage,
    textureImageLayoutMode: options.textureImageLayoutMode,
    charSpacing: options.charSpacing,
    lineSpacing: options.lineSpacing,
    morphologyMode: options.morphologyMode,
    morphologyEngine: options.morphologyEngine,
    border: options.border,
    centerPage: options.centerPage,
    mecabDictionaryPath: options.mecabDictionaryPath,
    fontFamily: options.fontFamily,
    fontColor: options.fontColor,
    scale: options.scale,
    paperTexture: options.paperTexture,
    white: options.white,
    black: options.black,
    // The reference implementation gamma-corrects the glyph layer before the
    // paper texture is composited, so gamma belongs to the render config
    // rather than to a post-processing pass over the encoded image.
    gamma: options.gamma,
  };
}

function encodeCanvas(canvas: CanvasLike, format: 'jpeg' | 'png', quality: number): Buffer {
  if (format === 'png') {
    return canvas.toBuffer('image/png');
  }
  return canvas.toBuffer('image/jpeg', { quality });
}

export function soanRenderOptionsFromMetadata(
  metadata: GenerationMetadata,
  seed?: number,
): SoanRenderOptions {
  return {
    canvas: createCanvas(1, 1),
    force: true,
    // The renderer seeds only glyph-candidate selection, matching the reference
    // implementation; paper texture placement stays unseeded.
    seed,
    // ［字母］/［IDn］ resolve as dictionary keys, so renmen selection stays
    // active alongside directives exactly as in the reference implementation.
    renmenPriority: metadata.soanConfig.renmenPriority,
    numLines: metadata.soanConfig.numLines,
    charSpacing: metadata.soanConfig.charSpacing,
    lineSpacing: metadata.soanConfig.lineSpacing,
    morphologyMode: metadata.soanConfig.morphologyMode,
    professionalMorphologyTokens: metadata.morphologyTokens,
    pageWidth: metadata.soanConfig.pageWidth,
    pageHeight: metadata.soanConfig.pageHeight,
    border: metadata.soanConfig.border,
    centerPage: metadata.soanConfig.centerPage,
    manualPositions: metadata.manualPositions,
    layoutVersion: metadata.layout.version,
    layoutAttempts: metadata.layout.attempts,
  };
}

async function renderWithSoan(soan: SoanInstance, metadata: GenerationMetadata, seed: number) {
  return soan.getTextImageFromTextPromise(
    metadata.renderText,
    soanRenderOptionsFromMetadata(metadata, seed),
  );
}

function createSoanQuietly(options: CliOptions): SoanInstance | undefined {
  const originalLog = console.log;
  console.log = (...args: readonly unknown[]) => {
    const [first] = args;
    if (
      typeof first === 'string' &&
      first.startsWith('Soan: Library for rendering modern Japanese')
    ) {
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
  readonly layout: LayoutMetadata;
}

export async function generateImage(
  options: CliOptions,
  metadata: GenerationMetadata,
): Promise<GeneratedImage> {
  const soan = createSoanQuietly(options);
  if (soan === undefined) {
    throw new Error('Failed to initialize Soan');
  }

  const renderResult = await renderWithSoan(soan, metadata, options.seed);
  const canvas = renderResult.opt.canvas;
  const layoutStats = renderResult.opt.layoutStats ?? { passes: 0, trailingGap: 0 };

  // The CLI owns Professional metadata injection after rendering. Encoding
  // directly avoids producing an upstream Soan XMP segment plus a second CLI
  // XMP segment in the same JPEG. Gamma is already applied by the renderer to
  // the glyph layer before paper compositing, so there is no re-encode here.
  return {
    buffer: encodeCanvas(canvas, options.format, options.quality),
    renderedGlyphs: renderResult.result,
    image: {
      width: canvas.width ?? 0,
      height: canvas.height ?? 0,
    },
    layout: {
      version: options.layoutVersion,
      attempts: options.layoutAttempts,
      passes: layoutStats.passes,
      trailingGap: layoutStats.trailingGap,
    },
  };
}

export { soanConfigFromOptions };
