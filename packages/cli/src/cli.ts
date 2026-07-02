#!/usr/bin/env node
import { parseExtendedText } from './extended-text.js';
import { writeMetadata } from './metadata.js';
import { readCliOptions } from './options.js';
import { assertOutputWritable, ensureParentDirectory, writeImageBuffer } from './output.js';
import { generateImage, soanConfigFromOptions } from './render.js';
import {
  chukoDictionaryPathFromParentDirectory,
  defaultDictionaryParentDirectory,
  downloadChukoDictionary,
} from './dictionary.js';
import type {
  CliOptions,
  GenerationMetadata,
  SelectedGlyphMetadata,
  SoanRenderedGlyph,
} from './types.js';
import { tryInjectXmpMetadata } from './xmp.js';
import { analyzeWithMecab } from './mecab.js';
import { parseArgs } from 'node:util';

function printDictionaryHelp(): void {
  console.log(`soan dict

Usage:
  soan dict install [--output <dir>] [--force]
  soan dict update [--output <dir>]
  soan dict path [--output <dir>]

Commands:
  install  Download and extract Chuko-Wabun UniDic.
  update   Replace the local Chuko-Wabun UniDic with the current pinned release.
  path     Print the expected Chuko-Wabun UniDic directory path.

Options:
  -o, --output <dir>  Parent directory. Default: ${defaultDictionaryParentDirectory()}
      --force         Replace an existing unidic-chuko-v202512 directory.
      --help          Print this help.
`);
}

function glyphIdFromUrl(url: string): number | undefined {
  const fallbackMatch = url.match(/(?:^|\/)(\d+)-/);
  if (fallbackMatch !== null) {
    return Number.parseInt(fallbackMatch[1], 10);
  }

  const codhMatch = url.match(/_(\d+)\.[a-z]+$/i);
  return codhMatch === null ? undefined : Number.parseInt(codhMatch[1], 10);
}

function selectedGlyphsFromRenderedGlyphs(
  renderedGlyphs: readonly SoanRenderedGlyph[],
): readonly SelectedGlyphMetadata[] {
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

function assertNumLinesSatisfied(
  options: CliOptions,
  selectedGlyphs: readonly SelectedGlyphMetadata[],
): void {
  if (options.numLines === undefined) {
    return;
  }

  const lineCount = new Set(selectedGlyphs.map((glyph) => glyph.softLine ?? glyph.line)).size;
  if (lineCount !== options.numLines) {
    throw new Error(
      `--num-lines ${options.numLines} could not be satisfied exactly; rendered ${lineCount} lines. ` +
        'Adjust --chars-per-line manually for this text.',
    );
  }
}

function optionsWithNumLinesApplied(options: CliOptions, renderText: string): CliOptions {
  if (options.numLines === undefined) {
    return options;
  }

  const renderLength = Math.max(1, Array.from(renderText).length);
  return {
    ...options,
    // Soan's compatibility layout starts a new soft line when the next glyph
    // reaches the line-height threshold, so an exact length / lines division
    // needs one character of headroom to avoid producing an extra final line.
    charsPerLine: Math.max(1, Math.ceil((renderLength + 1) / options.numLines)),
  };
}

async function main(): Promise<void> {
  const isDictionaryCommand = process.argv[2] === 'dict';
  if (isDictionaryCommand) {
    const command = process.argv[3] ?? 'help';
    const args = process.argv.slice(4);

    if (
      command === 'help' ||
      command === '--help' ||
      command === '-h' ||
      args.includes('--help') ||
      args.includes('-h')
    ) {
      printDictionaryHelp();
      return;
    }

    if (command !== 'install' && command !== 'update' && command !== 'path') {
      throw new Error(`Unknown dictionary command: ${command}`);
    }

    const { values } = parseArgs({
      args,
      options: {
        output: { type: 'string', short: 'o', default: defaultDictionaryParentDirectory() },
        force: { type: 'boolean', default: false },
      },
      allowPositionals: false,
    });

    if (command === 'path') {
      console.log(chukoDictionaryPathFromParentDirectory(values.output));
      return;
    }

    const result = await downloadChukoDictionary({
      outputDirectory: values.output,
      force: command === 'update' ? true : values.force,
    });
    console.log(`Downloaded Chuko-Wabun UniDic: ${result.dictionaryPath}`);
    console.log(`SHA-256: ${result.sha256}`);
    console.log(`Use with: soan --kobun --mecab-dic "${result.dictionaryPath}" --text <text>`);
    return;
  }

  if (process.argv[2] === 'download-dict' || process.argv[2] === 'download-dictionary') {
    throw new Error('Unknown command. Use: soan dict install [--output <dir>] [--force]');
  }

  if (
    process.argv.includes('--version') ||
    process.argv.includes('--help') ||
    process.argv.includes('-h')
  ) {
    readCliOptions();
    return;
  }

  const options = readCliOptions();
  if (options === undefined) {
    process.exitCode = 1;
    return;
  }

  const parsed = parseExtendedText(options.text);
  const effectiveOptions = optionsWithNumLinesApplied(options, parsed.renderText);
  const morphologyTokens =
    effectiveOptions.morphologyMode === 'old-japanese'
      ? await analyzeWithMecab(parsed.renderText, {
          command: effectiveOptions.mecabCommand ?? 'mecab',
          dictionaryPath: effectiveOptions.mecabDictionaryPath ?? '',
        })
      : undefined;
  const soanConfig = {
    ...soanConfigFromOptions(effectiveOptions),
    renmenPriority: parsed.directives.length > 0 ? 0 : effectiveOptions.renmenPriority,
  };
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
    morphologyTokens,
    manualPositions: effectiveOptions.manualPositions,
    xmp: { embedded: false, reason: 'pending-render' },
    soanConfig,
    generatedAt: options.generatedAt,
  };

  ensureParentDirectory(options.output);
  ensureParentDirectory(options.metadataOutput);
  assertOutputWritable(options.output, options.force);
  assertOutputWritable(options.metadataOutput, options.force);

  const generated = await generateImage(effectiveOptions, metadataBase);
  const selectedGlyphs = selectedGlyphsFromRenderedGlyphs(generated.renderedGlyphs ?? []);
  assertNumLinesSatisfied(options, selectedGlyphs);
  const metadataWithoutXmpStatus: GenerationMetadata = {
    ...metadataBase,
    renderedGlyphs: generated.renderedGlyphs,
    selectedGlyphs,
    image: generated.image,
  };
  const xmpResult =
    options.format === 'jpeg'
      ? tryInjectXmpMetadata(generated.buffer, {
          ...metadataWithoutXmpStatus,
          xmp: { embedded: true, mode: 'full' },
        })
      : {
          buffer: generated.buffer,
          embedded: false,
          reason: 'PNG output stores Professional metadata in the JSON sidecar',
        };
  const metadata: GenerationMetadata = {
    ...metadataWithoutXmpStatus,
    xmp: {
      embedded: xmpResult.embedded,
      mode: xmpResult.mode,
      reason: xmpResult.reason,
    },
  };
  const buffer = xmpResult.buffer;
  writeImageBuffer(options.output, buffer, options.force, options.format);
  writeMetadata(options.metadataOutput, metadata, options.force);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
