# soan-professional-cli

[![CI](https://github.com/Kotomiya07/soan-professional/actions/workflows/ci.yml/badge.svg)](https://github.com/Kotomiya07/soan-professional/actions/workflows/ci.yml)
[![Publish](https://github.com/Kotomiya07/soan-professional/actions/workflows/publish.yml/badge.svg)](https://github.com/Kotomiya07/soan-professional/actions/workflows/publish.yml)
[![npm version](https://img.shields.io/npm/v/soan-professional-cli.svg?label=npm)](https://www.npmjs.com/package/soan-professional-cli)
![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933)
![CLI release](https://img.shields.io/badge/release-v2.0.0-2563eb)
![License](https://img.shields.io/badge/license-MIT-blue)
![Dictionary license](https://img.shields.io/badge/dictionary-CC%20BY--NC--SA%204.0-orange)
[![日本語](https://img.shields.io/badge/README-%E6%97%A5%E6%9C%AC%E8%AA%9E-blue)](./README.ja.md)

`soan-professional-cli` generates Soan images from the command line with the reproducible controls needed by the Professional workflow. It keeps the Soan v1.1.0 compatibility renderer and adds deterministic glyph/layout selection, Pro notation, metadata sidecars, JPEG XMP, page layout controls, and optional Chuko-Wabun UniDic analysis.

The npm package published from this repository is `soan-professional-cli`. The repository also contains local validation/demo packages used to build and test the CLI.

## Installation

After the package is published to npm:

```bash
npm install -g soan-professional-cli
soan --version
```

From a source checkout:

```bash
pixi run install
pixi run build
```

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

The package provides three equivalent command names:

- `soan`
- `soan-cli`
- `soan-pro`

## Chuko-Wabun UniDic

The dictionary is distributed as a separate GitHub Release asset and is not bundled into the npm package. Chuko-Wabun UniDic is licensed under CC BY-NC-SA 4.0, separately from this CLI package's MIT license. Keep the non-commercial/share-alike terms and the attribution shown in `unidic-chuko-v202512/README.md`.

```bash
expected_sha256="5e548c834dd043e7909c46cc20f56a9f1d80dc7ea103361bf0b4a541f77610e9"
curl -L -O https://github.com/Kotomiya07/soan-professional/releases/download/dict-chuko-v202512/unidic-chuko-v202512.tar.gz
echo "${expected_sha256}  unidic-chuko-v202512.tar.gz" | sha256sum -c -
tar -tzf unidic-chuko-v202512.tar.gz | awk '/(^|\/)\.\.($|\/)|^\// { print "unsafe tar path: " $0 > "/dev/stderr"; bad=1 } END { exit bad }'
tar -xzf unidic-chuko-v202512.tar.gz
export SOAN_MECAB_DIC="$PWD/unidic-chuko-v202512"
```

Use it with `--kobun` or `--old-japanese`:

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

- Pro notation with `［字母］` and `［ID］` directives
- Manual bunsetsu / renmen boundaries with `/`
- Reproducible glyph and layout selection with `--seed`
- Byte-level reproducible JPEG output when `--generated-at` is fixed
- Gamma correction with `--gamma`
- Layout controls: `--num-lines`, `--char-spacing`, `--line-spacing`, `--page-width`, and `--page-height`
- Manual glyph offsets with `--manual-positions`
- Chuko-Wabun UniDic analysis with `--old-japanese` / `--kobun`
- Canonical sidecar metadata with `--metadata-output`
- Professional metadata embedded as JPEG APP1 XMP when it fits
- PNG output
- Glyph lookup by `［ID］` from the configured datasets and bundled fallback images

## Metadata

The sidecar JSON written by `--metadata-output` is the canonical reproducibility record for v2.0.0. JPEG output also receives the same Professional metadata JSON as a single APP1 XMP packet when the packet fits in one APP1 segment. If full metadata is too large, the CLI tries compact XMP; if that is still too large, it writes the JPEG and sidecar and records `xmp.embedded: false` with the reason.

`--seed` fixes glyph/layout selection. For byte-identical JPEGs, also pass `--generated-at <ISO timestamp>` so the XMP metadata timestamp is stable.

## Development

Run the local verification suite from the repository root:

```bash
pixi run check
npm --prefix soan-cli audit
```

Useful release checks:

```bash
cd soan-cli
npm run test:e2e
npm pack --dry-run
npm publish --access public --dry-run
```

## Repository Layout

- `soan-cli/`: npm package source
- `packages/core/`: renderer-independent contracts used by repository validation
- `packages/demo/`: static non-Pixi CLI demo
- `package/`: bundled Soan v1.1.0 compatibility dependency
- `dictionaries/`: local development dictionary location, not included in the npm tarball
- `PLANS.md`: migration plan and validation notes

## Scope Notes

- PixiJS interactive editing is outside the v2.0.0 CLI package.
- Pro glyph directives set the effective `renmenPriority` to `0` for that render so position-based single-glyph controls stay unambiguous.
- `［ID］` resolves from the configured datasets and bundled fallback images; the CLI does not provide a global dataset registry.

## License

The CLI package is MIT licensed. Chuko-Wabun UniDic is distributed separately under CC BY-NC-SA 4.0.
