# soan-cli Professional slice

`soan-cli` is now a TypeScript CLI slice for generating Soan images while the full Professional rewrite in `PLANS.md` is still in progress.

This slice intentionally keeps the proven Soan v1.1.0 rendering engine and adds the minimum Professional surface needed for reproducible CLI image generation:

- full-width bracket Pro notation: `かな［加］` and `かな［15338］`
- slash boundaries: `はな/の`
- deterministic `--seed` by temporarily replacing `Math.random` during rendering
- gamma post-processing with `--gamma`
- sidecar reproducibility metadata with `--metadata-output`
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

`--metadata-output` records the original text, render text, seed, gamma, parsed Pro directives, slash boundaries, and Soan layout options. The current vertical slice records `［字母］` and `［ID］` directives for reproducibility, but glyph forcing is not yet wired into Soan v1.1.0 internals.

## Implementation Notes

The local `package/soan/soan.cjs` wrapper uses `@napi-rs/canvas` instead of `canvas` because the machine has very little free disk space and `canvas` falls back to a native source build on this macOS arm64 environment. This also matches the `PLANS.md` direction of preferring a native-build-free Canvas adapter.

The CLI keeps generated metadata as a JSON sidecar for now. XMP remains available on the unmodified Soan JPEG path, but gamma and PNG output require re-encoding, so sidecar JSON is the reliable Professional reproducibility path for this slice.
