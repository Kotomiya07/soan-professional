import { parseArgs } from 'node:util';
import { parseArgsWithHelp, usage } from 'minus-h';
import type { CliOptions, DatasetConfig, OutputFormat } from './types.js';
import { assertGamma } from './gamma.js';

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
      --seed <integer>              Deterministic rendering seed.
      --gamma <0.1-2.2>             Gamma correction. Default: 1
      --chars-per-line <integer>    Characters per line. Default: 20
      --line-gap <number>           Line gap. Default: 0.5
      --renmen-priority <0-1>       Renmen priority. Default: 1
      --paper-texture <file>        Paper texture path.
      --force                       Overwrite output files.
      --version                     Print version.
      --help                        Print this help.
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
    datasets: { type: 'string', multiple: true, default: ['{"url":"http://codh.rois.ac.jp/soan/dataset/001.json"}'] as string[], description: '利用する古活字データセット情報の配列' },
    allowUnavailableChar: { type: 'boolean', default: false, description: '古活字画像が登録されていない文字も許容する' },
    'allow-unavailable-char': { type: 'boolean', description: '古活字画像が登録されていない文字も許容する（allowUnavailableCharの別名）' },
    renmenPriority: { type: 'string', default: '1', description: '連綿活字の優先度（0:非連綿優先～1:連綿優先）' },
    'renmen-priority': { type: 'string', description: '連綿活字の優先度（renmenPriorityの別名）' },
    charsPerLine: { type: 'string', default: '20', description: '字詰数（0:自動的に行を折り返さない）' },
    'chars-per-line': { type: 'string', description: '字詰数（charsPerLineの別名）' },
    lineGap: { type: 'string', default: '0.5', description: '行間' },
    'line-gap': { type: 'string', description: '行間（lineGapの別名）' },
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
  const parsedRenmenPriority = parseNumber('renmenPriority', renmenPriority);
  const parsedCharsPerLine = parseInteger('charsPerLine', charsPerLine);
  const parsedLineGap = parseNumber('lineGap', lineGap);
  const parsedMarginTop = parseInteger('marginTop', marginTop);
  const parsedMarginBottom = parseInteger('marginBottom', marginBottom);
  const parsedMarginLeft = parseInteger('marginLeft', marginLeft);
  const parsedMarginRight = parseInteger('marginRight', marginRight);
  const parsedScale = parseNumber('scale', String(values.scale));
  const parsedQuality = parseNumber('quality', String(values.quality));

  assertRange('renmenPriority', parsedRenmenPriority, 0, 1);
  assertAtLeast('charsPerLine', parsedCharsPerLine, 0);
  assertAtLeast('lineGap', parsedLineGap, 0);
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
    fontFamily,
    fontColor,
    scale: parsedScale,
    paperTexture,
    white: String(values.white),
    black: String(values.black),
    seed,
    gamma,
    format: format satisfies OutputFormat,
    quality: parsedQuality,
  };
}
