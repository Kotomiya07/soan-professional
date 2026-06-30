# soan-professional-cli

`soan-professional-cli` is a TypeScript CLI for generating Soan images with the Professional control surface that can be supported by the Soan v1.1.0 compatibility renderer.

The CLI keeps the proven Soan v1.1.0 rendering engine and adds reproducible Professional controls. The only published package is `soan-professional-cli`; repository-local `packages/core` and `packages/demo` support validation and documentation but are not separately published. PixiJS browser editing is outside this package.

- full-width bracket Pro notation: `か［加］な` and `か［1］`, enforced during glyph selection
- slash boundaries: `はな/の`, enforced as manual bunsetsu split points
- deterministic glyph/layout selection with `--seed`
- byte-level reproducible XMP JPEGs when `--generated-at` is fixed
- gamma post-processing with `--gamma`
- v1.2 layout controls: `--num-lines`, `--char-spacing`, and `--line-spacing`
- MeCab / Chuko-Wabun UniDic analysis with `--old-japanese` / `--kobun`
- page layout with `--page-width` / `--page-height`
- manual glyph offsets with `--manual-positions`
- sidecar reproducibility metadata with `--metadata-output`, including selected glyph URLs and parsed glyph IDs
- JPEG XMP embedding of the same Professional metadata packet
- pixi tasks for install, test, build, and smoke generation

## Setup

Run all commands through pixi from the repository root:

```bash
pixi run install
pixi run test
pixi run build
pixi run smoke
```

The smoke task writes:

- `soan-cli/tmp/smoke.jpg`
- `soan-cli/tmp/smoke.json`

## Usage

```bash
pixi run build
cd soan-cli
node dist/cli.js \
  --text "か［加］/な" \
  --seed 42 \
  --generated-at 2026-06-29T00:00:00.000Z \
  --gamma 1.1 \
  --chars-per-line 20 \
  --output ./tmp/sample.jpg \
  --metadata-output ./tmp/sample.json \
  --force
```

`--metadata-output` records the original text, render text, seed, gamma, parsed Pro directives, slash boundaries, Soan layout options, output image size, raw rendered glyphs, and `selectedGlyphs` with parsed glyph IDs when the URL format exposes them.

`--num-lines` is verified after rendering. If the compatibility renderer cannot produce exactly that number of visual soft lines for the current text, the CLI fails before writing the output. Use `--chars-per-line` directly when you need manual control for a difficult text.

Useful release checks:

```bash
pixi run check
pixi run smoke
cd soan-cli
node dist/cli.js --version
node dist/cli.js --help
node dist/cli.js --text "か［加］/な" --seed 7 --generated-at 2026-06-29T00:00:00.000Z --output ./tmp/pro-smoke.jpg --metadata-output ./tmp/pro-smoke.json --force
node dist/cli.js --text "サンプル" --format png --gamma 1.1 --output ./tmp/smoke.png --metadata-output ./tmp/smoke-png.json --force
npm run test:e2e
npm pack --dry-run
```

## Implementation Notes

The local `package/soan/soan.cjs` wrapper uses `@napi-rs/canvas` instead of `canvas` because the machine has very little free disk space and `canvas` falls back to a native source build on this macOS arm64 environment. This also matches the `PLANS.md` direction of preferring a native-build-free Canvas adapter.

The CLI treats generated JSON sidecars as the canonical Professional reproducibility record. JPEG output also receives a single APP1 XMP packet containing the Professional metadata JSON when it fits in one APP1 segment. If full metadata is too large, the CLI tries compact XMP; if that is still too large, it still writes the JPEG and sidecar and records `xmp.embedded: false` with the reason. PNG output records `xmp.embedded: false` in the sidecar because PNG metadata embedding is outside the v2 CLI contract.

`--seed` fixes glyph/layout selection. For byte-identical JPEGs, also pass `--generated-at <ISO timestamp>` so the XMP metadata timestamp is stable.

When a Pro glyph directive is present, the compatibility renderer sets the effective `renmenPriority` to `0` for that render and records that effective value in metadata. The upstream selector can otherwise choose multi-character renmen tokens before position-based directives are applied, which would make single-character `［字母］` / `［ID］` controls ambiguous.

`--old-japanese` / `--kobun` uses MeCab with Chuko-Wabun UniDic when `mecab` is available and the dictionary is provided by `--mecab-dic` or `SOAN_MECAB_DIC`. The repository-local development dictionary lives at `dictionaries/unidic-chuko-v202512` and is intentionally not bundled into the npm tarball.

Download the dictionary from the separate GitHub Release asset. Chuko-Wabun UniDic is distributed under CC BY-NC-SA 4.0, separately from this CLI package's MIT license. Keep the non-commercial/share-alike terms and attribution shown in `unidic-chuko-v202512/README.md`.

```bash
expected_sha256="5e548c834dd043e7909c46cc20f56a9f1d80dc7ea103361bf0b4a541f77610e9"
curl -L -O https://github.com/Kotomiya07/soan-professional/releases/download/dict-chuko-v202512/unidic-chuko-v202512.tar.gz
echo "${expected_sha256}  unidic-chuko-v202512.tar.gz" | sha256sum -c -
tar -tzf unidic-chuko-v202512.tar.gz | awk '/(^|\/)\.\.($|\/)|^\// { print "unsafe tar path: " $0 > "/dev/stderr"; bad=1 } END { exit bad }'
tar -xzf unidic-chuko-v202512.tar.gz
export SOAN_MECAB_DIC="$PWD/unidic-chuko-v202512"
```

PixiJS interactive editing is not part of the v2.0.0 CLI package.
