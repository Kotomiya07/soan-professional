import { parseArgs } from 'node:util';
import { parseArgsWithHelp, usage } from 'minus-h';
import type { CliOptions, DatasetConfig, OutputFormat } from './types.js';
import { assertGamma } from './gamma.js';
import { defaultChukoDictionaryPath } from './mecab.js';

export const CLI_VERSION = '2.0.0';

function printHelp(): void {
  console.log(`soan-professional-cli ${CLI_VERSION}

Usage:
  soan --text <text> --output <file> [options]

Core options:
  -t, --text <text>                 Text to render. Supports Pro notation: ［字母］, ［ID］, /
  -o, --output <file>               Output image path. Writes a data URL to stdout when omitted.
      --metadata-output <file>      Write reproducibility metadata JSON.
      --format <jpeg|png>           Output format. Default: jpeg
      --quality <0-1>               JPEG quality. Default: 0.92
      --seed <integer>              Deterministic rendering seed.
      --generated-at <iso>          Metadata timestamp. Fix this for byte-level reproducible XMP output.
      --gamma <0.1-2.2>             Gamma correction. Default: 1
      --chars-per-line <integer>    Characters per line. Default: 20
      --line-gap <number>           Line gap. Default: 0.5
      --renmen-priority <0-1>       Renmen priority. Default: 1
      --num-lines <integer>         Target number of vertical lines.
      --char-spacing <integer>      Extra character spacing in 1/100 character units.
      --line-spacing <integer>      Extra line spacing in 1/100 character units.
      --old-japanese, --kobun       Preserve historical surface text instead of modern reading conversion.
      --margin <px>                 Set all margins when individual margins are omitted.
      --margin-top <px>             Top margin. Default: 100
      --margin-bottom <px>          Bottom margin. Default: 100
      --margin-left <px>            Left margin. Default: 100
      --margin-right <px>           Right margin. Default: 100
      --height <auto|fit>           Output height behavior. Default: auto
      --page-width <px>             Force output page width.
      --page-height <px>            Force output page height.
      --manual-positions <json>     JSON array of {position,offsetX,offsetY}.
      --mecab-dic <dir>             Chuko-Wabun UniDic dictionary directory for --kobun.
      --mecab-command <cmd>         MeCab executable. Default: mecab
      --font-family <family>        Fallback font family. Default: serif
      --font-color <css-color>      Fallback font color. Default: #000000
      --scale <number>              Output scale. Default: 1
      --paper-texture <file>        Paper texture path.
      --white <css-color>           Dataset white color mapping. Default: #ffffff
      --black <css-color>           Dataset black color mapping. Default: #000000
      --datasets <json>             Dataset config JSON. Repeatable.
      --allow-unavailable-char      Render unavailable glyphs with fallback text.
      --force                       Overwrite output files.
      --version                     Print version.
      --help                        Print this help.

Unsupported in v2.0.0 CLI package:
  PixiJS interactive editing.
`);
}

const argsConfig = {
  description: 'Professional CLI for Soan image generation',
  options: {
    text: { type: 'string', short: 't', description: '（必須）古活字組版画像化する文字列。Pro記法 ［字母］/［ID］ と / 境界を利用可' },
    output: { type: 'string', short: 'o', description: '出力先ファイル名（未指定時はstdout）' },
    metadataOutput: { type: 'string', description: '再現性メタデータJSONの出力先' },
    'metadata-output': { type: 'string', description: '再現性メタデータJSONの出力先（metadataOutputの別名）' },
    force: { type: 'boolean', default: false, description: '出力先に同名ファイルがあるときも上書きする' },
    datasets: { type: 'string', multiple: true, default: ['{"url":"https://codh.rois.ac.jp/soan/dataset/001.json"}'] as string[], description: '利用する古活字データセット情報の配列' },
    allowUnavailableChar: { type: 'boolean', default: false, description: '古活字画像が登録されていない文字も許容する' },
    'allow-unavailable-char': { type: 'boolean', description: '古活字画像が登録されていない文字も許容する（allowUnavailableCharの別名）' },
    renmenPriority: { type: 'string', default: '1', description: '連綿活字の優先度（0:非連綿優先～1:連綿優先）' },
    'renmen-priority': { type: 'string', description: '連綿活字の優先度（renmenPriorityの別名）' },
    charsPerLine: { type: 'string', default: '20', description: '字詰数（0:自動的に行を折り返さない）' },
    'chars-per-line': { type: 'string', description: '字詰数（charsPerLineの別名）' },
    lineGap: { type: 'string', default: '0.5', description: '行間' },
    'line-gap': { type: 'string', description: '行間（lineGapの別名）' },
    numLines: { type: 'string', description: '行数指定。指定時は本文字数から字詰数を導出する' },
    'num-lines': { type: 'string', description: '行数指定（numLinesの別名）' },
    charSpacing: { type: 'string', default: '0', description: '字間微調整（1/100文字単位）' },
    'char-spacing': { type: 'string', description: '字間微調整（charSpacingの別名）' },
    lineSpacing: { type: 'string', default: '0', description: '行間微調整（1/100文字単位）' },
    'line-spacing': { type: 'string', description: '行間微調整（lineSpacingの別名）' },
    oldJapanese: { type: 'boolean', default: false, description: '古文表記保持モード。kuromojiの読み変換を避け、原文表記を使う' },
    'old-japanese': { type: 'boolean', description: '古文表記保持モード（oldJapaneseの別名）' },
    kobun: { type: 'boolean', description: '古文表記保持モード（oldJapaneseの別名）' },
    margin: { type: 'string', description: '天地左右の余白（px）。個別指定がない箇所へ適用' },
    marginTop: { type: 'string', default: '100', description: '天の余白（px）' },
    'margin-top': { type: 'string', description: '天の余白（marginTopの別名）' },
    marginBottom: { type: 'string', default: '100', description: '地の余白（px）' },
    'margin-bottom': { type: 'string', description: '地の余白（marginBottomの別名）' },
    marginLeft: { type: 'string', default: '100', description: '左の余白（px）' },
    'margin-left': { type: 'string', description: '左の余白（marginLeftの別名）' },
    marginRight: { type: 'string', default: '100', description: '右の余白（px）' },
    'margin-right': { type: 'string', description: '右の余白（marginRightの別名）' },
    height: { type: 'string', default: 'auto', choices: ['auto', 'fit'], description: '出力画像の縦幅' },
    pageWidth: { type: 'string', description: 'Professional page layout width in pixels' },
    'page-width': { type: 'string', description: 'Professional page layout width in pixels（pageWidthの別名）' },
    pageHeight: { type: 'string', description: 'Professional page layout height in pixels' },
    'page-height': { type: 'string', description: 'Professional page layout height in pixels（pageHeightの別名）' },
    manualPositions: { type: 'string', description: 'Manual glyph offsets JSON: [{"position":0,"offsetX":10,"offsetY":-5}]' },
    'manual-positions': { type: 'string', description: 'Manual glyph offsets JSON（manualPositionsの別名）' },
    mecabDic: { type: 'string', description: '中古和文UniDic directory for --old-japanese / --kobun' },
    'mecab-dic': { type: 'string', description: '中古和文UniDic directory（mecabDicの別名）' },
    mecabCommand: { type: 'string', default: 'mecab', description: 'MeCab executable path' },
    'mecab-command': { type: 'string', description: 'MeCab executable path（mecabCommandの別名）' },
    fontFamily: { type: 'string', default: 'serif', description: '未登録文字のフォントファミリー' },
    'font-family': { type: 'string', description: '未登録文字のフォントファミリー（fontFamilyの別名）' },
    fontColor: { type: 'string', default: '#000000', description: '未登録文字のフォント色' },
    'font-color': { type: 'string', description: '未登録文字のフォント色（fontColorの別名）' },
    scale: { type: 'string', default: '1', description: '画像作成サイズ倍率' },
    paperTexture: { type: 'string', default: '', description: '用紙テクスチャファイル名' },
    'paper-texture': { type: 'string', description: '用紙テクスチャファイル名（paperTextureの別名）' },
    white: { type: 'string', default: '#ffffff', description: '古活字データセット画像の白にマッピングする描画色' },
    black: { type: 'string', default: '#000000', description: '古活字データセット画像の黒にマッピングする描画色' },
    seed: { type: 'string', description: 'Math.random を固定する再現性シード' },
    generatedAt: { type: 'string', description: 'XMP/sidecar metadata timestamp. 固定するとXMP込みのJPEGも再現しやすい' },
    'generated-at': { type: 'string', description: 'XMP/sidecar metadata timestamp（generatedAtの別名）' },
    gamma: { type: 'string', default: '1', description: '出力画像へのガンマ補正（0.1-2.2）' },
    format: { type: 'string', default: 'jpeg', choices: ['jpeg', 'png'], description: '出力形式' },
    quality: { type: 'string', default: '0.92', description: 'JPEG品質（0-1）' },
  },
} as const;

function parseNumber(name: string, value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`--${name} must be a finite number: ${value}`);
  }
  return parsed;
}

function parseInteger(name: string, value: string): number {
  if (!/^-?\d+$/.test(value)) {
    throw new Error(`--${name} must be an integer: ${value}`);
  }
  const parsed = Number.parseInt(value, 10);
  return parsed;
}

function assertRange(name: string, value: number, min: number, max: number): void {
  if (value < min || value > max) {
    throw new Error(`--${name} must be between ${min} and ${max}: ${value}`);
  }
}

function assertAtLeast(name: string, value: number, min: number): void {
  if (value < min) {
    throw new Error(`--${name} must be at least ${min}: ${value}`);
  }
}

function parseDataset(raw: string): DatasetConfig {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null || !('url' in parsed) || typeof parsed.url !== 'string') {
    throw new Error(`--datasets must be JSON objects with a string url: ${raw}`);
  }

  const priority = 'priority' in parsed && typeof parsed.priority === 'number' ? parsed.priority : undefined;
  return priority === undefined ? { url: parsed.url } : { url: parsed.url, priority };
}

function parseManualPositions(raw: string | undefined) {
  if (raw === undefined || raw === '') {
    return [];
  }

  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('--manual-positions must be a JSON array');
  }

  return parsed.map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`--manual-positions[${index}] must be an object`);
    }
    const position = 'position' in item ? Number(item.position) : NaN;
    const offsetX = 'offsetX' in item ? Number(item.offsetX) : 0;
    const offsetY = 'offsetY' in item ? Number(item.offsetY) : 0;
    if (!Number.isInteger(position) || position < 0 || !Number.isFinite(offsetX) || !Number.isFinite(offsetY)) {
      throw new Error(`--manual-positions[${index}] must contain position, offsetX, and offsetY numbers`);
    }
    return { position, offsetX, offsetY };
  });
}

export function readCliOptions(): CliOptions | undefined {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp();
    return undefined;
  }

  if (process.argv.includes('--version')) {
    console.log(CLI_VERSION);
    return undefined;
  }

  let values: Record<string, unknown>;
  try {
    values = parseArgs(argsConfig).values;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    parseArgsWithHelp(argsConfig);
    return undefined;
  }

  if (typeof values.text !== 'string' || values.text === '') {
    console.error('Specify --text <text>');
    usage(argsConfig);
    return undefined;
  }

  const gamma = parseNumber('gamma', String(values.gamma));
  assertGamma(gamma);

  const seed = typeof values.seed === 'string' ? parseInteger('seed', values.seed) : undefined;
  const datasets = Array.isArray(values.datasets) ? values.datasets.map((item) => parseDataset(String(item))) : [];
  const format = values.format === 'png' ? 'png' : 'jpeg';
  const metadataOutput =
    typeof values['metadata-output'] === 'string'
      ? values['metadata-output']
      : typeof values.metadataOutput === 'string'
        ? values.metadataOutput
        : undefined;
  const charsPerLine = typeof values['chars-per-line'] === 'string' ? values['chars-per-line'] : String(values.charsPerLine);
  const lineGap = typeof values['line-gap'] === 'string' ? values['line-gap'] : String(values.lineGap);
  const numLines = typeof values['num-lines'] === 'string' ? values['num-lines'] : values.numLines;
  const charSpacing = typeof values['char-spacing'] === 'string' ? values['char-spacing'] : String(values.charSpacing);
  const lineSpacing = typeof values['line-spacing'] === 'string' ? values['line-spacing'] : String(values.lineSpacing);
  const margin = typeof values.margin === 'string' ? parseInteger('margin', values.margin) : undefined;
  const renmenPriority =
    typeof values['renmen-priority'] === 'string' ? values['renmen-priority'] : String(values.renmenPriority);
  const marginTop = typeof values['margin-top'] === 'string' ? values['margin-top'] : String(values.marginTop ?? margin ?? 100);
  const marginBottom =
    typeof values['margin-bottom'] === 'string' ? values['margin-bottom'] : String(values.marginBottom ?? margin ?? 100);
  const marginLeft = typeof values['margin-left'] === 'string' ? values['margin-left'] : String(values.marginLeft ?? margin ?? 100);
  const marginRight =
    typeof values['margin-right'] === 'string' ? values['margin-right'] : String(values.marginRight ?? margin ?? 100);
  const fontFamily = typeof values['font-family'] === 'string' ? values['font-family'] : String(values.fontFamily);
  const fontColor = typeof values['font-color'] === 'string' ? values['font-color'] : String(values.fontColor);
  const paperTexture = typeof values['paper-texture'] === 'string' ? values['paper-texture'] : String(values.paperTexture);
  const pageWidth = typeof values['page-width'] === 'string' ? values['page-width'] : values.pageWidth;
  const pageHeight = typeof values['page-height'] === 'string' ? values['page-height'] : values.pageHeight;
  const manualPositionsRaw =
    typeof values['manual-positions'] === 'string'
      ? values['manual-positions']
      : typeof values.manualPositions === 'string'
        ? values.manualPositions
        : undefined;
  const mecabDictionaryPath =
    typeof values['mecab-dic'] === 'string'
      ? values['mecab-dic']
      : typeof values.mecabDic === 'string'
        ? values.mecabDic
        : process.env.SOAN_MECAB_DIC ?? defaultChukoDictionaryPath();
  const mecabCommand =
    typeof values['mecab-command'] === 'string'
      ? values['mecab-command']
      : typeof values.mecabCommand === 'string'
        ? values.mecabCommand
        : process.env.SOAN_MECAB_COMMAND ?? 'mecab';
  const parsedRenmenPriority = parseNumber('renmenPriority', renmenPriority);
  const parsedCharsPerLine = parseInteger('charsPerLine', charsPerLine);
  const parsedLineGap = parseNumber('lineGap', lineGap);
  const parsedNumLines = typeof numLines === 'string' ? parseInteger('numLines', numLines) : undefined;
  const parsedPageWidth = typeof pageWidth === 'string' ? parseInteger('pageWidth', pageWidth) : undefined;
  const parsedPageHeight = typeof pageHeight === 'string' ? parseInteger('pageHeight', pageHeight) : undefined;
  const parsedCharSpacing = parseInteger('charSpacing', charSpacing);
  const parsedLineSpacing = parseInteger('lineSpacing', lineSpacing);
  const morphologyMode =
    values.oldJapanese === true || values['old-japanese'] === true || values.kobun === true ? 'old-japanese' : 'modern';
  const parsedMarginTop = parseInteger('marginTop', marginTop);
  const parsedMarginBottom = parseInteger('marginBottom', marginBottom);
  const parsedMarginLeft = parseInteger('marginLeft', marginLeft);
  const parsedMarginRight = parseInteger('marginRight', marginRight);
  const parsedScale = parseNumber('scale', String(values.scale));
  const parsedQuality = parseNumber('quality', String(values.quality));
  const generatedAt =
    typeof values['generated-at'] === 'string'
      ? values['generated-at']
      : typeof values.generatedAt === 'string'
        ? values.generatedAt
        : new Date().toISOString();

  assertRange('renmenPriority', parsedRenmenPriority, 0, 1);
  assertAtLeast('charsPerLine', parsedCharsPerLine, 0);
  assertAtLeast('lineGap', parsedLineGap, 0);
  if (parsedNumLines !== undefined) {
    assertAtLeast('numLines', parsedNumLines, 1);
  }
  if (parsedPageWidth !== undefined) {
    assertAtLeast('pageWidth', parsedPageWidth, 1);
  }
  if (parsedPageHeight !== undefined) {
    assertAtLeast('pageHeight', parsedPageHeight, 1);
  }
  assertAtLeast('charSpacing', parsedCharSpacing, -99);
  assertAtLeast('lineSpacing', parsedLineSpacing, -99);
  assertAtLeast('marginTop', parsedMarginTop, 0);
  assertAtLeast('marginBottom', parsedMarginBottom, 0);
  assertAtLeast('marginLeft', parsedMarginLeft, 0);
  assertAtLeast('marginRight', parsedMarginRight, 0);
  assertAtLeast('scale', parsedScale, 0.01);
  assertRange('quality', parsedQuality, 0, 1);

  return {
    text: values.text,
    output: typeof values.output === 'string' ? values.output : undefined,
    metadataOutput,
    force: values.force === true,
    datasets,
    allowUnavailableChar: values.allowUnavailableChar === true || values['allow-unavailable-char'] === true,
    renmenPriority: parsedRenmenPriority,
    charsPerLine: parsedCharsPerLine,
    lineGap: parsedLineGap,
    marginTop: parsedMarginTop,
    marginBottom: parsedMarginBottom,
    marginLeft: parsedMarginLeft,
    marginRight: parsedMarginRight,
    height: values.height === 'fit' ? 'fit' : 'auto',
    pageWidth: parsedPageWidth,
    pageHeight: parsedPageHeight,
    numLines: parsedNumLines,
    charSpacing: parsedCharSpacing,
    lineSpacing: parsedLineSpacing,
    morphologyMode,
    morphologyEngine: morphologyMode === 'old-japanese' ? 'mecab-unidic-chuko' : 'kuromoji',
    mecabDictionaryPath,
    mecabCommand,
    manualPositions: parseManualPositions(manualPositionsRaw),
    fontFamily,
    fontColor,
    scale: parsedScale,
    paperTexture,
    white: String(values.white),
    black: String(values.black),
    seed,
    generatedAt,
    gamma,
    format: format satisfies OutputFormat,
    quality: parsedQuality,
  };
}
