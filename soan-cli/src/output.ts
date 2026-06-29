import { existsSync, mkdirSync, writeFileSync, writeSync } from 'node:fs';
import { dirname } from 'node:path';

export function ensureParentDirectory(path: string | undefined): void {
  if (path === undefined || path === '') {
    return;
  }

  const parent = dirname(path);
  if (parent !== '.') {
    mkdirSync(parent, { recursive: true });
  }
}

export function assertOutputWritable(path: string | undefined, force: boolean): void {
  if (path === undefined || path === '' || force) {
    return;
  }

  if (existsSync(path)) {
    throw new Error(`Output path already exists. Use --force to overwrite: ${path}`);
  }
}

export function writeImageBuffer(path: string | undefined, buffer: Buffer, force: boolean, format: 'jpeg' | 'png'): void {
  if (path !== undefined && path !== '') {
    ensureParentDirectory(path);
    writeFileSync(path, buffer, { flag: force ? 'w' : 'wx' });
    return;
  }

  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  writeSync(1, `data:${mime};base64,${buffer.toString('base64')}`);
}
