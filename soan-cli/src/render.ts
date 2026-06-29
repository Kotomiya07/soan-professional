import { createRequire } from 'node:module';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { applyGammaToRgba } from './gamma.js';
import { withSeededMathRandom } from './prng.js';
import type { CanvasLike, CliOptions, GenerationMetadata, SoanFactory, SoanInstance } from './types.js';

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

async function renderWithSoan(soan: SoanInstance, text: string, seed: number | undefined) {
  return withSeededMathRandom(seed, () =>
    soan.getTextImageFromTextPromise(text, {
      canvas: createCanvas(1, 1),
      force: true,
    }),
  );
}

export async function generateImage(options: CliOptions, metadata: GenerationMetadata): Promise<Buffer> {
  const soan = createSoan(soanConfigFromOptions(options));
  if (soan === undefined) {
    throw new Error('Failed to initialize Soan');
  }

  const renderResult = await renderWithSoan(soan, metadata.renderText, options.seed);
  const canvas = renderResult.opt.canvas;

  // Prefer Soan's JPEG/XMP helper for the default path because it preserves
  // the upstream metadata behavior. For PNG and gamma-adjusted output we must
  // re-encode from pixels, so the Pro reproducibility record is emitted as a
  // sidecar JSON file by the CLI.
  const baseBuffer =
    options.format === 'jpeg' && options.gamma === 1 && soan.getBufferWithXMPFromCanvasPromise !== undefined
      ? await soan.getBufferWithXMPFromCanvasPromise(canvas)
      : encodeCanvas(canvas, options.format, options.quality);

  return applyGammaToBuffer(baseBuffer, options.format, options.quality, options.gamma);
}

export { soanConfigFromOptions };
