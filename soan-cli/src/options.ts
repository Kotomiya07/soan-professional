import { parseArgs } from 'node:util';
import { parseArgsWithHelp, usage } from 'minus-h';
import type { CliOptions, DatasetConfig, OutputFormat } from './types.js';
import { assertGamma } from './gamma.js';

const argsConfig = {
  description: 'Professional CLI slice for Soan image generation',
  options: {
    text: { type: 'string', short: 't', description: '（必須）古活字組版画像化する文字列。Pro記法 ［字母］/［ID］ と / 境界を利用可' },
    output: { type: 'string', short: 'o', description: '出力先ファイル名（未指定時はstdout）' },
    metadataOutput: { type: 'string', description: '再現性メタデータJSONの出力先' },
    'metadata-output': { type: 'string', description: '再現性メタデータJSONの出力先（metadataOutputの別名）' },
    force: { type: 'boolean', default: false, description: '出力先に同名ファイルがあるときも上書きする' },
    datasets: { type: 'string', multiple: true, default: ['{"url":"http://codh.rois.ac.jp/soan/dataset/001.json"}'] as string[], description: '利用する古活字データセット情報の配列' },
    allowUnavailableChar: { type: 'boolean', default: false, description: '古活字画像が登録されていない文字も許容する' },
    renmenPriority: { type: 'string', default: '1', description: '連綿活字の優先度（0:非連綿優先～1:連綿優先）' },
    charsPerLine: { type: 'string', default: '20', description: '字詰数（0:自動的に行を折り返さない）' },
    'chars-per-line': { type: 'string', description: '字詰数（charsPerLineの別名）' },
    lineGap: { type: 'string', default: '0.5', description: '行間' },
    'line-gap': { type: 'string', description: '行間（lineGapの別名）' },
    marginTop: { type: 'string', default: '100', description: '天の余白（px）' },
    marginBottom: { type: 'string', default: '100', description: '地の余白（px）' },
    marginLeft: { type: 'string', default: '100', description: '左の余白（px）' },
    marginRight: { type: 'string', default: '100', description: '右の余白（px）' },
    height: { type: 'string', default: 'auto', choices: ['auto', 'fit'], description: '出力画像の縦幅' },
    fontColor: { type: 'string', default: '#000000', description: '未登録文字のフォント色' },
    scale: { type: 'string', default: '1', description: '画像作成サイズ倍率' },
    paperTexture: { type: 'string', default: '', description: '用紙テクスチャファイル名' },
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
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`--${name} must be an integer: ${value}`);
  }
  return parsed;
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
  let values: Record<string, unknown>;
  try {
    values = parseArgs(argsConfig).values;
  } catch {
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

  return {
    text: values.text,
    output: typeof values.output === 'string' ? values.output : undefined,
    metadataOutput,
    force: values.force === true,
    datasets,
    allowUnavailableChar: values.allowUnavailableChar === true,
    renmenPriority: parseNumber('renmenPriority', String(values.renmenPriority)),
    charsPerLine: parseInteger('charsPerLine', charsPerLine),
    lineGap: parseNumber('lineGap', lineGap),
    marginTop: parseInteger('marginTop', String(values.marginTop)),
    marginBottom: parseInteger('marginBottom', String(values.marginBottom)),
    marginLeft: parseInteger('marginLeft', String(values.marginLeft)),
    marginRight: parseInteger('marginRight', String(values.marginRight)),
    height: values.height === 'fit' ? 'fit' : 'auto',
    fontColor: String(values.fontColor),
    scale: parseNumber('scale', String(values.scale)),
    paperTexture: String(values.paperTexture),
    white: String(values.white),
    black: String(values.black),
    seed,
    gamma,
    format: format satisfies OutputFormat,
    quality: parseNumber('quality', String(values.quality)),
  };
}
