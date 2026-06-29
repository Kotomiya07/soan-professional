#!/usr/bin/env node
import { parseExtendedText } from './extended-text.js';
import { writeMetadata } from './metadata.js';
import { readCliOptions } from './options.js';
import { ensureParentDirectory, writeImageBuffer } from './output.js';
import { generateImage, soanConfigFromOptions } from './render.js';
import type { GenerationMetadata } from './types.js';

async function main(): Promise<void> {
  const options = readCliOptions();
  if (options === undefined) {
    process.exitCode = 1;
    return;
  }

  const parsed = parseExtendedText(options.text);
  const metadata: GenerationMetadata = {
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

  const buffer = await generateImage(options, metadata);
  writeImageBuffer(options.output, buffer, options.force, options.format);
  writeMetadata(options.metadataOutput, metadata);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
