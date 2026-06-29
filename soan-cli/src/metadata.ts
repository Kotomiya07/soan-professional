import { writeFileSync } from 'node:fs';
import type { GenerationMetadata } from './types.js';

export function writeMetadata(path: string | undefined, metadata: GenerationMetadata, force: boolean): void {
  if (path === undefined || path === '') {
    return;
  }

  writeFileSync(path, `${JSON.stringify(metadata, null, 2)}\n`, { flag: force ? 'w' : 'wx' });
}
