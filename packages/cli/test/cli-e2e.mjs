import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
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

function expectedDefaultDictionaryPath() {
  if (process.platform === 'win32') {
    return join(
      process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'),
      'soan-professional',
      'dictionaries',
      'unidic-chuko-v202512',
    );
  }

  if (process.platform === 'darwin') {
    return join(
      homedir(),
      'Library',
      'Application Support',
      'soan-professional',
      'dictionaries',
      'unidic-chuko-v202512',
    );
  }

  return join(
    process.env.XDG_DATA_HOME ?? join(homedir(), '.local', 'share'),
    'soan-professional',
    'dictionaries',
    'unidic-chuko-v202512',
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

run(['--version']);
run(['--help']);
const downloadHelpResult = run(['dict', '--help']);
assert(
  downloadHelpResult.stdout.includes('soan dict install [--output <dir>] [--force]'),
  'dict help did not describe usage',
);
const dictPathResult = run(['dict', 'path', '--output', workdir]);
assert(
  dictPathResult.stdout.trim().endsWith('unidic-chuko-v202512'),
  'dict path did not print the expected dictionary directory',
);
const defaultDictPathResult = run(['dict', 'path']);
assert(
  defaultDictPathResult.stdout.trim() === expectedDefaultDictionaryPath(),
  'dict path did not print the default user data dictionary directory',
);
const removedDownloadDictResult = spawnSync(process.execPath, [cli, 'download-dict', '--help'], {
  cwd: repoRoot,
  encoding: 'utf8',
});
assert(removedDownloadDictResult.status !== 0, 'removed download-dict command should fail');
assert(
  removedDownloadDictResult.stderr.includes('soan dict install'),
  'removed download-dict command should point to soan dict install',
);

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
  '［加］/な',
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
  '［1］',
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
  '../../assets/dictionaries/unidic-chuko-v202512',
  '--generated-at',
  '2026-06-29T00:00:00.000Z',
  '--output',
  join(workdir, 'kobun.jpg'),
  '--metadata-output',
  join(workdir, 'kobun.json'),
  '--force',
]);

const autoSeedResult = run([
  '--text',
  'か',
  '--generated-at',
  '2026-06-29T00:00:00.000Z',
  '--print-image-text',
  '--output',
  join(workdir, 'auto-seed.jpg'),
  '--metadata-output',
  join(workdir, 'auto-seed.json'),
  '--force',
]);
assert(/Seed: -?\d+/.test(autoSeedResult.stderr), 'auto-generated seed was not reported on stderr');
assert(
  autoSeedResult.stderr.includes('Image text: '),
  '--print-image-text did not print the image text',
);

const bothTextResult = spawnSync(process.execPath, [cli, '--text', 'か', '--sample-text'], {
  cwd: repoRoot,
  encoding: 'utf8',
});
assert(bothTextResult.status !== 0, 'combining --text and --sample-text should fail');

run([
  '--text',
  'いろはにほへと',
  '--seed',
  '9',
  '--border',
  '--center-page',
  '--page-width',
  '800',
  '--page-height',
  '1200',
  '--num-lines',
  '2',
  '--generated-at',
  '2026-06-29T00:00:00.000Z',
  '--output',
  join(workdir, 'center-border.png'),
  '--format',
  'png',
  '--metadata-output',
  join(workdir, 'center-border.json'),
  '--force',
]);

run([
  '--text',
  'か',
  '--seed',
  '13',
  '--layout',
  'v1.1',
  '--generated-at',
  '2026-06-29T00:00:00.000Z',
  '--output',
  join(workdir, 'layout-v11.jpg'),
  '--metadata-output',
  join(workdir, 'layout-v11.json'),
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

// Intermediate renmenPriority exercises the seeded renmen-split branch, and a
// negative seed matches the Professional UI's signed 32-bit seed range.
for (const name of ['renmen-mid-a', 'renmen-mid-b']) {
  run([
    '--text',
    'はなをみるかはこれこそ',
    '--renmen-priority',
    '0.5',
    '--seed=-12345',
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

run([
  '--text',
  'けふ /こそ',
  '--kobun',
  '--seed',
  '3',
  '--mecab-dic',
  '../../assets/dictionaries/unidic-chuko-v202512',
  '--generated-at',
  '2026-06-29T00:00:00.000Z',
  '--output',
  join(workdir, 'kobun-space.jpg'),
  '--metadata-output',
  join(workdir, 'kobun-space.json'),
  '--force',
]);

run([
  '--text',
  'はなをみるかは',
  '--paper-texture',
  '../images/texture.jpg',
  '--texture-image-layout-mode',
  '--lines-per-page',
  '12',
  '--seed',
  '5',
  '--generated-at',
  '2026-06-29T00:00:00.000Z',
  '--output',
  join(workdir, 'texture-layout.png'),
  '--metadata-output',
  join(workdir, 'texture-layout.json'),
  '--force',
]);

const plain = readJson('plain.json');
const autoSeed = readJson('auto-seed.json');
const centerBorder = readJson('center-border.json');
const layoutV11 = readJson('layout-v11.json');
const boundary = readJson('boundary.json');
const jibo = readJson('jibo-xmp.json');
const id = readJson('id.json');
const kobun = readJson('kobun.json');
const kobunSpace = readJson('kobun-space.json');
const layout = readJson('layout.json');
const textureLayout = readJson('texture-layout.json');

assert(
  plain.selectedGlyphs.map((glyph) => glyph.token).join('|') !==
    boundary.selectedGlyphs.map((glyph) => glyph.token).join('|'),
  'slash boundary did not affect glyph tokenization',
);
assert(
  jibo.renderText === '［加］/な',
  'jibo directive was not preserved as a dictionary key in render text',
);
assert(jibo.selectedGlyphs[0].jibo === '加', 'jibo directive was not reflected in selected glyphs');
assert(
  jibo.selectedGlyphs[0].markedupChar === 'か',
  'jibo directive did not resolve to the kana it stands for',
);
assert(jibo.imageText === 'かな', 'image text did not resolve directives to their kana');
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
assert(
  kobun.morphologyTokens.every((token) => !token.pos.includes('-')),
  'UniDic parts of speech were not collapsed to their major category',
);
assert(
  kobun.morphologyTokens.some((token) => token.surface === 'こそ' && token.line === 2),
  'analysis-unit offsets after a slash boundary were not assigned',
);
assert(
  kobun.selectedGlyphs.some((glyph) => glyph.token === 'けふ' || glyph.token === 'こそ'),
  'kobun morphology did not reach glyph selection',
);
assert(
  kobunSpace.morphologyTokens.some((token) => token.surface === 'こそ' && token.line === 2),
  'MeCab-dropped whitespace was counted into analysis-unit offsets',
);
assert(
  kobunSpace.selectedGlyphs.some((glyph) => glyph.token === 'こそ'),
  'kobun morphology after whitespace did not reach glyph selection',
);
assert(
  textureLayout.soanConfig.textureImageLayoutMode === true &&
    textureLayout.soanConfig.linesPerPage === 12,
  'texture layout options were not recorded',
);
assert(
  textureLayout.image.width === 200 && textureLayout.image.height === 200,
  'texture layout mode did not size the canvas to the paper texture',
);
assert(layout.soanConfig.numLines === 1, 'numLines was not recorded');
assert(layout.soanConfig.linesPerPage === 10, 'default linesPerPage was not recorded');
assert(
  layout.soanConfig.textureImageLayoutMode === false,
  'textureImageLayoutMode default was not recorded',
);
assert(layout.soanConfig.pageWidth === 600, 'pageWidth was not recorded');
assert(layout.soanConfig.pageHeight === 900, 'pageHeight was not recorded');
assert(layout.image.width === 720, 'scaled pageWidth was not reflected in image width');
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
  layout.selectedGlyphs[0].x > layout.image.width / layout.soanConfig.scale / 2,
  'forced wider page did not right-align glyph layout',
);
assert(
  sha256('deterministic-a.jpg') === sha256('deterministic-b.jpg'),
  'same seed and generatedAt did not produce identical JPEG bytes',
);
assert(
  sha256('renmen-mid-a.jpg') === sha256('renmen-mid-b.jpg'),
  'negative seed with renmenPriority 0.5 did not reproduce identical JPEG bytes',
);
assert(
  Number.isInteger(autoSeed.seed) && autoSeed.seedGenerated === true,
  'auto-generated seed was not recorded in metadata',
);
assert(
  typeof autoSeed.imageText === 'string' && autoSeed.imageText.length > 0,
  'image text was not recorded in metadata',
);
assert(
  centerBorder.soanConfig.border === true && centerBorder.soanConfig.centerPage === true,
  'border / centerPage options were not recorded',
);
assert(
  centerBorder.image.width === 800 && centerBorder.image.height === 1200,
  'centered page dimensions were not applied',
);
assert(
  layoutV11.layout.version === 'v1.1' &&
    layoutV11.layout.attempts === 4 &&
    layoutV11.layout.passes === 0,
  'layout v1.1 metadata was not recorded',
);
assert(
  plain.layout.version === 'v1.2' &&
    plain.layout.attempts === 4 &&
    Number.isInteger(plain.layout.passes) &&
    typeof plain.layout.trailingGap === 'number',
  'layout v1.2 metadata was not recorded',
);

for (const name of [
  'plain.jpg',
  'boundary.jpg',
  'jibo-xmp.jpg',
  'id.png',
  'kobun.jpg',
  'kobun-space.jpg',
  'layout.jpg',
  'texture-layout.png',
  'auto-seed.jpg',
  'center-border.png',
  'layout-v11.jpg',
]) {
  assert(statSync(join(workdir, name)).size > 0, `${name} is empty`);
}

console.log(
  JSON.stringify({
    workdir,
    checked: [
      'jibo',
      'id',
      'slash',
      'kobun',
      'kobun-space-offsets',
      'layout',
      'texture-layout',
      'xmp',
      'png',
      'deterministic-bytes',
      'auto-seed',
      'image-text',
      'border-center',
      'layout-versions',
    ],
  }),
);
