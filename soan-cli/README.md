# soan-professional-cli

[![CI](https://github.com/Kotomiya07/soan-professional/actions/workflows/ci.yml/badge.svg)](https://github.com/Kotomiya07/soan-professional/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/soan-professional-cli.svg?label=npm)](https://www.npmjs.com/package/soan-professional-cli)
![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933)
![CLI release](https://img.shields.io/badge/release-v2.0.0-2563eb)
![License](https://img.shields.io/badge/license-MIT-blue)
![Dictionary license](https://img.shields.io/badge/dictionary-CC%20BY--NC--SA%204.0-orange)
[![日本語](https://img.shields.io/badge/README-%E6%97%A5%E6%9C%AC%E8%AA%9E-blue)](https://github.com/Kotomiya07/soan-professional/blob/main/README.ja.md)

`soan-professional-cli` is a TypeScript CLI for generating Soan images with reproducible Professional controls on top of the Soan v1.1.0 compatibility renderer.

## Installation

```bash
npm install -g soan-professional-cli
soan --version
```

The package provides three equivalent command names:

- `soan`
- `soan-cli`
- `soan-pro`

## Quick Start

```bash
soan \
  --text "か［加］/な" \
  --seed 42 \
  --generated-at 2026-06-29T00:00:00.000Z \
  --gamma 1.1 \
  --output ./sample.jpg \
  --metadata-output ./sample.json \
  --force
```

`--metadata-output` writes the canonical reproducibility sidecar JSON. JPEG output also receives the same Professional metadata as APP1 XMP when it fits.

## Chuko-Wabun UniDic

`--old-japanese` / `--kobun` uses MeCab with Chuko-Wabun UniDic when `mecab` is available and the dictionary is provided by `--mecab-dic` or `SOAN_MECAB_DIC`. The dictionary is distributed separately from the npm package and is licensed under CC BY-NC-SA 4.0.

```bash
expected_sha256="5e548c834dd043e7909c46cc20f56a9f1d80dc7ea103361bf0b4a541f77610e9"
curl -L -O https://github.com/Kotomiya07/soan-professional/releases/download/dict-chuko-v202512/unidic-chuko-v202512.tar.gz
echo "${expected_sha256}  unidic-chuko-v202512.tar.gz" | sha256sum -c -
tar -tzf unidic-chuko-v202512.tar.gz | awk '/(^|\/)\.\.($|\/)|^\// { print "unsafe tar path: " $0 > "/dev/stderr"; bad=1 } END { exit bad }'
tar -xzf unidic-chuko-v202512.tar.gz
export SOAN_MECAB_DIC="$PWD/unidic-chuko-v202512"
```

```bash
soan \
  --text "けふ/こそ" \
  --kobun \
  --mecab-dic ./unidic-chuko-v202512 \
  --seed 5 \
  --output ./kobun.jpg \
  --metadata-output ./kobun.json \
  --force
```

## Features

- full-width bracket Pro notation: `か［加］な` and `か［1］`
- slash boundaries: `はな/の`
- deterministic glyph/layout selection with `--seed`
- byte-level reproducible JPEGs when `--generated-at` is fixed
- gamma post-processing with `--gamma`
- layout controls: `--num-lines`, `--char-spacing`, `--line-spacing`, `--page-width`, and `--page-height`
- MeCab / Chuko-Wabun UniDic analysis with `--old-japanese` / `--kobun`
- manual glyph offsets with `--manual-positions`
- sidecar reproducibility metadata with `--metadata-output`
- JPEG XMP embedding and PNG output

## Development

From the repository root:

```bash
pixi run install
pixi run check
```

Useful release checks:

```bash
cd soan-cli
npm run test:e2e
npm pack --dry-run
npm publish --access public --dry-run
```

## Notes

- PixiJS interactive editing is not part of the v2.0.0 CLI package.
- When a Pro glyph directive is present, the compatibility renderer sets the effective `renmenPriority` to `0` for that render and records that value in metadata.
- The CLI package is MIT licensed. Chuko-Wabun UniDic is distributed separately under CC BY-NC-SA 4.0.
