import { accessSync, constants } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import type { MorphologyToken } from './types.js';
export { defaultChukoDictionaryPath } from './dictionary.js';

export interface MecabOptions {
  readonly command: string;
  readonly dictionaryPath: string;
}

export function isReadableDictionary(path: string): boolean {
  try {
    accessSync(resolve(path, 'sys.dic'), constants.R_OK);
    accessSync(resolve(path, 'dicrc'), constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Mirrors the rendering engine's analysis-unit segmentation: lines split on
 * newline, then on 。 (which stays attached to the preceding unit), then on the
 * Professional half-width "/" boundary (which is dropped).
 */
export function splitAnalysisUnits(renderText: string): readonly string[] {
  const units: string[] = [];
  for (const line of renderText.split('\n')) {
    const sentences = line.split('。');
    for (let index = 0; index < sentences.length; index += 1) {
      const sentence = index < sentences.length - 1 ? `${sentences[index]}。` : sentences[index];
      for (const unit of sentence.split('/')) {
        if (unit === '') {
          continue;
        }
        units.push(unit);
      }
    }
  }
  return units;
}

/**
 * The engine selects hentaigana by exact part-of-speech match (例: 助詞), so
 * the UniDic compound form 助詞-係助詞 must collapse to its major category.
 */
export function majorPartOfSpeech(pos: string): string {
  const major = pos.split('-')[0].trim();
  return major === '' ? '古文' : major;
}

/**
 * Character count as the engine sees it after normalization: NFD with the
 * voicing marks stripped. Its other rewrites (katakana→hiragana, small kana)
 * are one-to-one, so only combining marks can change the length.
 */
export function normalizedCharLength(text: string): number {
  return Array.from(text.normalize('NFD').replace(/[゙-゚]/g, '')).length;
}

function splitUnidicLine(line: string, unitOffset: number): MorphologyToken | undefined {
  if (line === '' || line === 'EOS') {
    return undefined;
  }

  const columns = line.split('\t');
  const surface = columns[0];
  if (surface === '') {
    return undefined;
  }
  const reading = columns[1] ?? '';
  const lemma = columns[3] ?? surface;
  const pos = columns[4] ?? '';

  return {
    line: unitOffset,
    surface,
    reading: reading === '' ? surface : reading,
    lemma,
    pos: majorPartOfSpeech(pos),
  };
}

export async function analyzeWithMecab(
  text: string,
  options: MecabOptions,
): Promise<readonly MorphologyToken[]> {
  if (!isReadableDictionary(options.dictionaryPath)) {
    throw new Error(`MeCab dictionary is not readable: ${options.dictionaryPath}`);
  }

  const units = splitAnalysisUnits(text);
  if (units.length === 0) {
    return [];
  }

  const args = ['-d', options.dictionaryPath, '-O', 'unidic'];
  const child = spawn(options.command, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk;
  });

  // One input line per analysis unit: MeCab closes each with EOS, which maps
  // the token groups back to their units.
  child.stdin.end(units.join('\n'));

  const code = await new Promise<number | null>((resolveProcess, reject) => {
    child.on('error', reject);
    child.on('close', resolveProcess);
  });

  if (code !== 0) {
    throw new Error(`MeCab failed with exit code ${code ?? 'unknown'}: ${stderr.trim()}`);
  }

  // The engine replaces each analysis unit with the concatenation of its token
  // surfaces before advancing its offset counter, so the next unit's offset is
  // the accumulated normalized surface length — not the input length. The two
  // differ when MeCab drops characters (e.g. whitespace) from its output.
  const tokens: MorphologyToken[] = [];
  let unitIndex = 0;
  let offset = 0;
  let surfaceLength = 0;
  for (const line of stdout.split(/\r?\n/)) {
    if (unitIndex >= units.length) {
      break;
    }
    if (line === 'EOS') {
      offset += surfaceLength > 0 ? surfaceLength : normalizedCharLength(units[unitIndex]);
      surfaceLength = 0;
      unitIndex += 1;
      continue;
    }
    const token = splitUnidicLine(line, offset);
    if (token !== undefined) {
      tokens.push(token);
      surfaceLength += normalizedCharLength(token.surface);
    }
  }
  return tokens;
}
