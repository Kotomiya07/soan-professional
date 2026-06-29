#!/usr/bin/env node
import { parseExtendedText } from './extended-text.js';
import { writeMetadata } from './metadata.js';
import { readCliOptions } from './options.js';
import { ensureParentDirectory, writeImageBuffer } from './output.js';
import { generateImage, soanConfigFromOptions } from './render.js';
import type { GenerationMetadata, SelectedGlyphMetadata, SoanRenderedGlyph } from './types.js';

function glyphIdFromUrl(url: string): number | undefined {
  const fallbackMatch = url.match(/(?:^|\/)(\d+)-/);
  if (fallbackMatch !== null) {
    return Number.parseInt(fallbackMatch[1], 10);
  }

  const codhMatch = url.match(/_(\d+)\.[a-z]+$/i);
  return codhMatch === null ? undefined : Number.parseInt(codhMatch[1], 10);
}

function selectedGlyphsFromRenderedGlyphs(renderedGlyphs: readonly SoanRenderedGlyph[]): readonly SelectedGlyphMetadata[] {
  let position = 0;
  return renderedGlyphs.map((glyph) => {
    const selectedGlyph = {
      ...glyph,
      position,
      glyphId: glyphIdFromUrl(glyph.url),
    };
    position += Array.from(glyph.token).length;
    return selectedGlyph;
  });
}

async function main(): Promise<void> {
  if (process.argv.includes('--version') || process.argv.includes('--help') || process.argv.includes('-h')) {
    readCliOptions();
    return;
  }

  const options = readCliOptions();
  if (options === undefined) {
    process.exitCode = 1;
    return;
  }

  const parsed = parseExtendedText(options.text);
  const metadataBase: GenerationMetadata = {
    engine: 'soan-v1.1.0-compat',
    professionalSlice: true,
    sourceText: parsed.sourceText,
    renderText: parsed.renderText,
    seed: options.seed,
    gamma: options.gamma,
    format: options.format,
    directives: parsed.directives,
    boundaries: parsed.boundaries,
    soanConfig: soanConfigFromOptions(options),
    generatedAt: new Date().toISOString(),
  };

  ensureParentDirectory(options.output);
  ensureParentDirectory(options.metadataOutput);

  const generated = await generateImage(options, metadataBase);
  const metadata: GenerationMetadata = {
    ...metadataBase,
    renderedGlyphs: generated.renderedGlyphs,
    selectedGlyphs: selectedGlyphsFromRenderedGlyphs(generated.renderedGlyphs ?? []),
  };
  const buffer = generated.buffer;
  writeImageBuffer(options.output, buffer, options.force, options.format);
  writeMetadata(options.metadataOutput, metadata);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
