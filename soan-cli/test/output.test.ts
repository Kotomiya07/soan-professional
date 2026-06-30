import { mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { writeImageBuffer } from '../src/output.js';

describe('writeImageBuffer', () => {
  it('refuses to overwrite through a symbolic link even with force', () => {
    const dir = mkdtempSync(join(tmpdir(), 'soan-output-'));
    const target = join(dir, 'target.jpg');
    const link = join(dir, 'link.jpg');
    writeFileSync(target, 'existing');
    symlinkSync(target, link);

    expect(() => writeImageBuffer(link, Buffer.from('new'), true, 'jpeg')).toThrow(
      'Refusing to write through symbolic link',
    );
  });
});
