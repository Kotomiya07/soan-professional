import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, posix, resolve, win32 } from 'node:path';
import { spawnSync } from 'node:child_process';

export const CHUKO_DICTIONARY_NAME = 'unidic-chuko-v202512';
export const CHUKO_DICTIONARY_ARCHIVE = `${CHUKO_DICTIONARY_NAME}.tar.gz`;
export const CHUKO_DICTIONARY_SHA256 =
  '5e548c834dd043e7909c46cc20f56a9f1d80dc7ea103361bf0b4a541f77610e9';
export const CHUKO_DICTIONARY_URL =
  'https://github.com/Kotomiya07/soan-professional/releases/download/dict-chuko-v202512/unidic-chuko-v202512.tar.gz';
export const DICTIONARY_APP_DIRECTORY_NAME = 'soan-professional';
export const DICTIONARY_PARENT_DIRECTORY_NAME = 'dictionaries';

export interface DefaultDictionaryPathOptions {
  readonly platform?: NodeJS.Platform;
  readonly env?: NodeJS.ProcessEnv;
  readonly homeDirectory?: string;
}

export interface DownloadDictionaryOptions {
  readonly outputDirectory: string;
  readonly force: boolean;
  readonly url?: string;
  readonly expectedSha256?: string;
}

export interface DownloadDictionaryResult {
  readonly dictionaryPath: string;
  readonly archivePath: string;
  readonly sha256: string;
}

export function defaultDictionaryParentDirectory(
  options: DefaultDictionaryPathOptions = {},
): string {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const homeDirectory = options.homeDirectory ?? homedir();

  if (platform === 'win32') {
    const localAppData = env.LOCALAPPDATA ?? win32.join(homeDirectory, 'AppData', 'Local');
    return win32.join(
      localAppData,
      DICTIONARY_APP_DIRECTORY_NAME,
      DICTIONARY_PARENT_DIRECTORY_NAME,
    );
  }

  if (platform === 'darwin') {
    return posix.join(
      homeDirectory,
      'Library',
      'Application Support',
      DICTIONARY_APP_DIRECTORY_NAME,
      DICTIONARY_PARENT_DIRECTORY_NAME,
    );
  }

  const xdgDataHome = env.XDG_DATA_HOME ?? posix.join(homeDirectory, '.local', 'share');
  return posix.join(xdgDataHome, DICTIONARY_APP_DIRECTORY_NAME, DICTIONARY_PARENT_DIRECTORY_NAME);
}

export function chukoDictionaryPathFromParentDirectory(outputDirectory: string): string {
  return join(resolve(outputDirectory), CHUKO_DICTIONARY_NAME);
}

export function defaultChukoDictionaryPath(options: DefaultDictionaryPathOptions = {}): string {
  const platform = options.platform ?? process.platform;
  const parentDirectory = defaultDictionaryParentDirectory(options);
  return platform === 'win32'
    ? win32.join(parentDirectory, CHUKO_DICTIONARY_NAME)
    : posix.join(parentDirectory, CHUKO_DICTIONARY_NAME);
}

function assertSafeTarEntry(entry: string): void {
  if (entry === '' || entry.startsWith('/') || entry.startsWith('\\')) {
    throw new Error(`Unsafe dictionary archive path: ${entry}`);
  }

  const parts = entry.split(/[\\/]+/);
  if (parts.includes('..')) {
    throw new Error(`Unsafe dictionary archive path: ${entry}`);
  }
}

export function assertSafeTarEntries(entries: readonly string[]): void {
  for (const entry of entries) {
    assertSafeTarEntry(entry.trim());
  }
}

function runTar(args: readonly string[], errorContext: string): string {
  const result = spawnSync('tar', args, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.error !== undefined) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    throw new Error(`${errorContext}: ${stderr === '' ? `tar exited ${result.status}` : stderr}`);
  }

  return result.stdout;
}

function sha256File(path: string): string {
  const hash = createHash('sha256');
  hash.update(readFileSync(path));
  return hash.digest('hex');
}

async function downloadFile(url: string, path: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Dictionary download failed: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(path, buffer, { flag: 'wx' });
}

export async function downloadChukoDictionary(
  options: DownloadDictionaryOptions,
): Promise<DownloadDictionaryResult> {
  const outputDirectory = resolve(options.outputDirectory);
  const dictionaryPath = chukoDictionaryPathFromParentDirectory(outputDirectory);
  const archivePath = join(outputDirectory, CHUKO_DICTIONARY_ARCHIVE);

  if (options.force) {
    rmSync(dictionaryPath, { recursive: true, force: true });
    rmSync(archivePath, { force: true });
  } else if (existsSync(dictionaryPath)) {
    throw new Error(`Dictionary already exists. Use --force to replace: ${dictionaryPath}`);
  } else if (existsSync(archivePath)) {
    throw new Error(`Dictionary archive already exists. Use --force to replace: ${archivePath}`);
  }

  mkdirSync(outputDirectory, { recursive: true });

  try {
    await downloadFile(options.url ?? CHUKO_DICTIONARY_URL, archivePath);

    const sha256 = sha256File(archivePath);
    const expectedSha256 = options.expectedSha256 ?? CHUKO_DICTIONARY_SHA256;
    if (sha256 !== expectedSha256) {
      throw new Error(
        `Dictionary SHA-256 mismatch for ${basename(archivePath)}: expected ${expectedSha256}, got ${sha256}`,
      );
    }

    const entries = runTar(['-tzf', archivePath], 'Failed to inspect dictionary archive')
      .split(/\r?\n/)
      .filter((entry) => entry !== '');
    assertSafeTarEntries(entries);

    runTar(['-xzf', archivePath, '-C', outputDirectory], 'Failed to extract dictionary archive');

    return {
      dictionaryPath,
      archivePath,
      sha256,
    };
  } catch (error: unknown) {
    rmSync(dictionaryPath, { recursive: true, force: true });
    rmSync(archivePath, { force: true });
    throw error;
  }
}
