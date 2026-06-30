import { accessSync, constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { MorphologyToken } from './types.js';

export interface MecabOptions {
  readonly command: string;
  readonly dictionaryPath: string;
}

export function defaultChukoDictionaryPath(): string {
  return resolve(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    'dictionaries',
    'unidic-chuko-v202512',
  );
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

function splitUnidicLine(line: string): MorphologyToken | undefined {
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
    line: 0,
    surface,
    reading: reading === '' ? surface : reading,
    lemma,
    pos: pos === '' ? '古文' : pos,
  };
}

export async function analyzeWithMecab(
  text: string,
  options: MecabOptions,
): Promise<readonly MorphologyToken[]> {
  if (!isReadableDictionary(options.dictionaryPath)) {
    throw new Error(`MeCab dictionary is not readable: ${options.dictionaryPath}`);
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

  child.stdin.end(text);

  const code = await new Promise<number | null>((resolveProcess, reject) => {
    child.on('error', reject);
    child.on('close', resolveProcess);
  });

  if (code !== 0) {
    throw new Error(`MeCab failed with exit code ${code ?? 'unknown'}: ${stderr.trim()}`);
  }

  const tokens: MorphologyToken[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const token = splitUnidicLine(line);
    if (token !== undefined) {
      tokens.push(token);
    }
  }
  return tokens;
}
