import { createRequire } from 'node:module';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { applyGammaToRgba } from './gamma.js';
import { countSoftLines, deriveAttemptSeed, measureTrailingGap } from './layout.js';
import { withSeededMathRandom } from './prng.js';
import type {
  CanvasLike,
  CliOptions,
  GenerationMetadata,
  LayoutMetadata,
  SoanFactory,
  SoanInstance,
  SoanRenderOptions,
  SoanRenderResult,
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
  };
}

function encodeCanvas(canvas: CanvasLike, format: 'jpeg' | 'png', quality: number): Buffer {
  if (format === 'png') {
    return canvas.toBuffer('image/png');
  }
  return canvas.toBuffer('image/jpeg', { quality });
}

async function applyGammaToBuffer(
  buffer: Buffer,
  format: 'jpeg' | 'png',
  quality: number,
  gamma: number,
): Promise<Buffer> {
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
    professionalMorphologyTokens: metadata.morphologyTokens,
    pageWidth: metadata.soanConfig.pageWidth,
    pageHeight: metadata.soanConfig.pageHeight,
    border: metadata.soanConfig.border,
    centerPage: metadata.soanConfig.centerPage,
    manualPositions: metadata.manualPositions,
    professionalDirectives: metadata.directives,
    professionalBoundaries: metadata.boundaries,
  };
}

async function renderWithSoan(soan: SoanInstance, metadata: GenerationMetadata, seed: number) {
  return withSeededMathRandom(seed, () =>
    soan.getTextImageFromTextPromise(metadata.renderText, soanRenderOptionsFromMetadata(metadata)),
  );
}

interface LayoutAttempt {
  readonly attempt: number;
  readonly seed: number;
  readonly renderResult: SoanRenderResult;
  readonly trailingGap: number;
  readonly softLines: number;
}

/**
 * v1.2 typesetting: retry deterministic seed-derived glyph combinations and
 * keep the attempt with the smallest trailing line gap. Attempt 0 uses the
 * base seed, so --layout v1.1 (single attempt) reproduces historical output.
 */
async function renderBestLayout(
  soan: SoanInstance,
  metadata: GenerationMetadata,
  options: CliOptions,
): Promise<{ best: LayoutAttempt; attemptsRun: number }> {
  const maxAttempts = options.layoutVersion === 'v1.2' ? options.layoutAttempts : 1;
  let best: LayoutAttempt | undefined;
  let attemptsRun = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    attemptsRun = attempt + 1;
    const seed = deriveAttemptSeed(options.seed, attempt);
    const renderResult = await renderWithSoan(soan, metadata, seed);
    const candidate: LayoutAttempt = {
      attempt,
      seed,
      renderResult,
      trailingGap: measureTrailingGap(renderResult.result),
      softLines: countSoftLines(renderResult.result),
    };

    if (best === undefined || isBetterLayout(candidate, best, options.numLines)) {
      best = candidate;
    }

    const satisfiesNumLines =
      options.numLines === undefined || candidate.softLines === options.numLines;
    if (candidate.trailingGap === 0 && satisfiesNumLines) {
      break;
    }
    if (candidate.softLines <= 1 && options.numLines === undefined) {
      // A single-line layout has no trailing line gap to reduce.
      break;
    }
  }

  if (best === undefined) {
    throw new Error('Layout rendering produced no attempts');
  }
  return { best, attemptsRun };
}

function isBetterLayout(
  candidate: LayoutAttempt,
  best: LayoutAttempt,
  numLines: number | undefined,
): boolean {
  if (numLines !== undefined) {
    const candidateSatisfies = candidate.softLines === numLines;
    const bestSatisfies = best.softLines === numLines;
    if (candidateSatisfies !== bestSatisfies) {
      return candidateSatisfies;
    }
  }
  return candidate.trailingGap < best.trailingGap;
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

  const { best: bestAttempt, attemptsRun } = await renderBestLayout(soan, metadata, options);
  const renderResult = bestAttempt.renderResult;
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
    layout: {
      version: options.layoutVersion,
      attempts: attemptsRun,
      chosenAttempt: bestAttempt.attempt,
      chosenSeed: bestAttempt.seed,
      trailingGap: bestAttempt.trailingGap,
    },
  };
}

export { soanConfigFromOptions };
