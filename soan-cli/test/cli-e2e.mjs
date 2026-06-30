import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const cli = join(repoRoot, 'dist/cli.js');
const workdir = mkdtempSync(join(tmpdir(), 'soan-cli-e2e.'));

function run(args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(
      `CLI failed: node dist/cli.js ${args.join(' ')}\n${result.stderr}\n${result.stdout}`,
    );
  }
  return result;
}

function readJson(name) {
  return JSON.parse(readFileSync(join(workdir, name), 'utf8'));
}

function sha256(name) {
  return createHash('sha256')
    .update(readFileSync(join(workdir, name)))
    .digest('hex');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

run(['--version']);
run(['--help']);

const stdoutResult = run([
  '--text',
  'か',
  '--seed',
  '1',
  '--generated-at',
  '2026-06-29T00:00:00.000Z',
]);
assert(
  stdoutResult.stdout.startsWith('data:image/jpeg;base64,'),
  'stdout output is not a clean JPEG data URL',
);
assert(!stdoutResult.stdout.includes('Soan: Library'), 'Soan banner leaked into stdout data URL');

writeFileSync(join(workdir, 'protected.json'), 'old');
const forceResult = spawnSync(
  process.execPath,
  [
    cli,
    '--text',
    'か',
    '--seed',
    '1',
    '--generated-at',
    '2026-06-29T00:00:00.000Z',
    '--output',
    join(workdir, 'protected.jpg'),
    '--metadata-output',
    join(workdir, 'protected.json'),
  ],
  {
    cwd: repoRoot,
    encoding: 'utf8',
  },
);
assert(forceResult.status !== 0, 'metadata sidecar overwrite without --force should fail');
assert(
  readFileSync(join(workdir, 'protected.json'), 'utf8') === 'old',
  'metadata sidecar was overwritten without --force',
);
assert(
  !existsSync(join(workdir, 'protected.jpg')),
  'image was written after metadata preflight failed',
);

for (const [name, text] of [
  ['plain', 'かな'],
  ['boundary', 'か/な'],
]) {
  run([
    '--text',
    text,
    '--seed',
    '11',
    '--generated-at',
    '2026-06-29T00:00:00.000Z',
    '--output',
    join(workdir, `${name}.jpg`),
    '--metadata-output',
    join(workdir, `${name}.json`),
    '--force',
  ]);
}

run([
  '--text',
  'か［加］/な',
  '--seed',
  '7',
  '--gamma',
  '1.1',
  '--generated-at',
  '2026-06-29T00:00:00.000Z',
  '--output',
  join(workdir, 'jibo-xmp.jpg'),
  '--metadata-output',
  join(workdir, 'jibo-xmp.json'),
  '--force',
]);

run([
  '--text',
  'か［1］',
  '--seed',
  '3',
  '--format',
  'png',
  '--generated-at',
  '2026-06-29T00:00:00.000Z',
  '--output',
  join(workdir, 'id.png'),
  '--metadata-output',
  join(workdir, 'id.json'),
  '--force',
]);

run([
  '--text',
  'けふ/こそ',
  '--kobun',
  '--seed',
  '3',
  '--mecab-dic',
  '../dictionaries/unidic-chuko-v202512',
  '--generated-at',
  '2026-06-29T00:00:00.000Z',
  '--output',
  join(workdir, 'kobun.jpg'),
  '--metadata-output',
  join(workdir, 'kobun.json'),
  '--force',
]);

for (const name of ['deterministic-a', 'deterministic-b']) {
  run([
    '--text',
    'かな',
    '--seed',
    '13',
    '--generated-at',
    '2026-06-29T00:00:00.000Z',
    '--output',
    join(workdir, `${name}.jpg`),
    '--metadata-output',
    join(workdir, `${name}.json`),
    '--force',
  ]);
}

run([
  '--text',
  'あいうえお',
  '--num-lines',
  '1',
  '--char-spacing',
  '4',
  '--line-spacing',
  '15',
  '--page-width',
  '600',
  '--page-height',
  '900',
  '--manual-positions',
  '[{"position":0,"offsetX":12,"offsetY":-8}]',
  '--height',
  'fit',
  '--scale',
  '1.2',
  '--seed',
  '5',
  '--generated-at',
  '2026-06-29T00:00:00.000Z',
  '--output',
  join(workdir, 'layout.jpg'),
  '--metadata-output',
  join(workdir, 'layout.json'),
  '--force',
]);

const plain = readJson('plain.json');
const boundary = readJson('boundary.json');
const jibo = readJson('jibo-xmp.json');
const id = readJson('id.json');
const kobun = readJson('kobun.json');
const layout = readJson('layout.json');

assert(
  plain.selectedGlyphs.map((glyph) => glyph.token).join('|') !==
    boundary.selectedGlyphs.map((glyph) => glyph.token).join('|'),
  'slash boundary did not affect glyph tokenization',
);
assert(jibo.selectedGlyphs[0].jibo === '加', 'jibo directive was not reflected in selected glyphs');
assert(jibo.soanConfig.renmenPriority === 0, 'effective renmenPriority override was not recorded');
assert(jibo.xmp.embedded === true, 'JPEG XMP was not embedded');
const xmpNamespaceCount =
  readFileSync(join(workdir, 'jibo-xmp.jpg'), 'latin1').split('http://ns.adobe.com/xap/1.0/')
    .length - 1;
assert(xmpNamespaceCount === 1, 'JPEG should contain exactly one XMP namespace marker');
assert(id.selectedGlyphs[0].glyphId === 1, 'dataset-wide ID directive did not select glyph ID 1');
assert(
  id.xmp.embedded === false && id.xmp.reason.includes('PNG'),
  'PNG XMP sidecar status is wrong',
);
assert(kobun.soanConfig.morphologyMode === 'old-japanese', 'kobun mode was not recorded');
assert(
  kobun.soanConfig.morphologyEngine === 'mecab-unidic-chuko',
  'MeCab morphology engine was not recorded',
);
assert(
  kobun.morphologyTokens.some((token) => token.surface === 'けふ'),
  'MeCab morphology tokens were not recorded',
);
assert(layout.soanConfig.numLines === 1, 'numLines was not recorded');
assert(layout.soanConfig.pageWidth === 600, 'pageWidth was not recorded');
assert(layout.soanConfig.pageHeight === 900, 'pageHeight was not recorded');
assert(layout.soanConfig.charSpacing === 4, 'charSpacing was not recorded');
assert(layout.soanConfig.lineSpacing === 15, 'lineSpacing was not recorded');
assert(layout.soanConfig.height === 'fit', 'height=fit was not recorded');
assert(layout.soanConfig.scale === 1.2, 'scale was not recorded');
assert(
  layout.manualPositions[0].offsetX === 12 && layout.manualPositions[0].offsetY === -8,
  'manual positions were not recorded',
);
assert(
  layout.selectedGlyphs[0].x !== undefined && layout.selectedGlyphs[0].y !== undefined,
  'rendered glyph positions were not recorded',
);
assert(
  sha256('deterministic-a.jpg') === sha256('deterministic-b.jpg'),
  'same seed and generatedAt did not produce identical JPEG bytes',
);

for (const name of [
  'plain.jpg',
  'boundary.jpg',
  'jibo-xmp.jpg',
  'id.png',
  'kobun.jpg',
  'layout.jpg',
]) {
  assert(statSync(join(workdir, name)).size > 0, `${name} is empty`);
}

console.log(
  JSON.stringify({
    workdir,
    checked: ['jibo', 'id', 'slash', 'kobun', 'layout', 'xmp', 'png', 'deterministic-bytes'],
  }),
);
