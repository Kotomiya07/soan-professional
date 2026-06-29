# soan-professional-cli

`soan-professional-cli` is a TypeScript CLI for generating Soan images with the Professional control surface that can be supported by the Soan v1.1.0 compatibility renderer.

The CLI keeps the proven Soan v1.1.0 rendering engine and adds reproducible Professional controls:

- full-width bracket Pro notation: `かな［加］` and `かな［15338］`, enforced during glyph selection
- slash boundaries: `はな/の`, enforced as manual bunsetsu split points
- deterministic `--seed` by temporarily replacing `Math.random` during rendering
- gamma post-processing with `--gamma`
- sidecar reproducibility metadata with `--metadata-output`, including selected glyph URLs and parsed glyph IDs
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
  --text "サンプル［15338］/かな" \
  --seed 42 \
  --gamma 1.1 \
  --chars-per-line 20 \
  --output ./tmp/sample.jpg \
  --metadata-output ./tmp/sample.json \
  --force
```

`--metadata-output` records the original text, render text, seed, gamma, parsed Pro directives, slash boundaries, Soan layout options, raw rendered glyphs, and `selectedGlyphs` with parsed glyph IDs when the URL format exposes them.

Useful release checks:

```bash
pixi run check
pixi run smoke
cd soan-cli
node dist/cli.js --version
node dist/cli.js --help
node dist/cli.js --text "か［加］/な" --seed 7 --output ./tmp/pro-smoke.jpg --metadata-output ./tmp/pro-smoke.json --force
node dist/cli.js --text "サンプル" --format png --gamma 1.1 --output ./tmp/smoke.png --metadata-output ./tmp/smoke-png.json --force
npm pack --dry-run
```

## Implementation Notes

The local `package/soan/soan.cjs` wrapper uses `@napi-rs/canvas` instead of `canvas` because the machine has very little free disk space and `canvas` falls back to a native source build on this macOS arm64 environment. This also matches the `PLANS.md` direction of preferring a native-build-free Canvas adapter.

The CLI treats generated JSON sidecars as the canonical Professional reproducibility record. XMP remains available on the unmodified Soan JPEG path, but gamma and PNG output require re-encoding, so sidecar JSON is the reliable v2 metadata contract.

When a Pro glyph directive is present, the compatibility renderer sets `renmenPriority` to `0` for that render. The upstream selector can otherwise choose multi-character renmen tokens before position-based directives are applied, which would make single-character `［字母］` / `［ID］` controls ambiguous.
