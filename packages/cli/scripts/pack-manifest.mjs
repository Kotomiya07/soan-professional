import { cpSync, existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

const packageJsonPath = new URL('../package.json', import.meta.url);
const backupPath = new URL('../package.json.pack-backup', import.meta.url);
const vendorSoanPath = new URL('../vendor/soan', import.meta.url);
const localSoanPath = new URL('../../legacy-soan', import.meta.url);
const mode = process.argv[2];

function readPackageJson() {
  return JSON.parse(readFileSync(packageJsonPath, 'utf8'));
}

function writePackageJson(packageJson) {
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

function preparePackageManifest() {
  restorePackageManifest();

  const packageJson = readPackageJson();
  writeFileSync(backupPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  if (packageJson.devDependencies !== undefined) {
    delete packageJson.devDependencies.soan;
  }

  writePackageJson(packageJson);
  rmSync(vendorSoanPath, { recursive: true, force: true });
  cpSync(localSoanPath, vendorSoanPath, {
    recursive: true,
    dereference: true,
    filter: (source) => !source.endsWith('/.DS_Store'),
  });
}

function restorePackageManifest() {
  if (existsSync(backupPath)) {
    renameSync(backupPath, packageJsonPath);
  }
  rmSync(vendorSoanPath, { recursive: true, force: true });
}

if (mode === 'prepare') {
  preparePackageManifest();
} else if (mode === 'restore') {
  restorePackageManifest();
} else {
  throw new Error('Usage: node scripts/pack-manifest.mjs <prepare|restore>');
}
