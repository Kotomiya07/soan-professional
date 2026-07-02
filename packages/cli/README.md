# soan-professional-cli

[![CI](https://github.com/Kotomiya07/soan-professional/actions/workflows/ci.yml/badge.svg)](https://github.com/Kotomiya07/soan-professional/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/soan-professional-cli.svg?label=npm)](https://www.npmjs.com/package/soan-professional-cli)
![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933)
![CLI release](https://img.shields.io/badge/release-v1.2.0-2563eb)
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
  --text "［加］/な" \
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
soan dict install
soan dict path
```

The command downloads the release asset, verifies the pinned SHA-256, checks the archive paths, and extracts the dictionary.
By default, the dictionary is installed under the user data directory. Use `soan dict update` to replace the local copy with the pinned release, and `soan dict path` to print the dictionary path for scripts. `--output <dir>` remains available when you need a project-local or CI-specific dictionary parent directory.

```bash
soan \
  --text "けふ/こそ" \
  --kobun \
  --seed 5 \
  --output ./kobun.jpg \
  --metadata-output ./kobun.json \
  --force
```

## Features

- full-width bracket Pro notation: `［加］な`, `［八良］ぬ`, and `［ID4867］`
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
cd packages/cli
npm run test:e2e
npm pack --dry-run
npm publish --access public --dry-run
```

Release tags are published by GitHub Actions. npm publication uses npm Trusted Publishing with GitHub Actions OIDC, and GitHub Packages publication uses the workflow `GITHUB_TOKEN`.

## Notes

- PixiJS interactive editing is not part of the v1.2.0 CLI package.
- When a Pro glyph directive is present, the compatibility renderer sets the effective `renmenPriority` to `0` for that render and records that value in metadata.
- The CLI package is MIT licensed. Chuko-Wabun UniDic is distributed separately under CC BY-NC-SA 4.0.

## Acknowledgements

This package builds on [Soan](https://codh.rois.ac.jp/software/soan/), a CODH JavaScript library for rendering modern Japanese text with old movable type images.

The CLI control surface is based on [Soan Professional](https://dev.2sc1815j.net/soan/), an extended Soan workflow that adds bracket-based jibo/glyph controls, slash boundaries, classical Japanese analysis, seed control, glyph position adjustment, and glyph search/replacement.
