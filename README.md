# soan-professional-cli v2.0.0

Soan Professional CLI は、既存の Soan v1.1.0 レンダリングエンジンを互換レイヤーとして使いながら、Professional 版の CLI 向け制御を移植した画像生成ツールです。v2.0.0 は CLI / core / demo の互換リリースであり、PixiJS ブラウザ編集 UI は範囲外です。

## 現在の公開単位

公開対象は `soan-cli/` の npm package `soan-professional-cli@2.0.0` です。インストール後は次の bin を提供します。

- `soan`
- `soan-cli`
- `soan-pro`

## 実装済み CLI 機能

- Pro 記法 `［字母］` / `［ID］` の実レンダリング反映
- `/` による手動 bunsetsu / renmen 境界
- `--seed` による glyph / layout 選択の再現性
- `--generated-at` による metadata timestamp 固定と XMP 込み JPEG の byte-level 再現性
- `--gamma` による出力画像のガンマ補正
- `--num-lines`, `--char-spacing`, `--line-spacing` による v1.2 CLI 組版制御
- `--old-japanese` / `--kobun` による MeCab / 中古和文 UniDic 解析
- `--page-width`, `--page-height` による page layout
- `--manual-positions` による glyph 手動位置調整
- `--metadata-output` による canonical sidecar JSON
- JPEG APP1 XMP への Professional metadata 埋め込み
- PNG 出力
- 設定済み dataset 全体からの `［ID］` 逆引き

## セットアップ

このリポジトリでは `pixi` task から npm を呼び出します。

```bash
pixi run install
pixi run check
```

`pixi run check` は core build, unit test, CLI build, MeCab 込み CLI e2e, smoke を実行します。

## 基本コマンド

```bash
pixi run build
cd soan-cli
node dist/cli.js \
  --text "か［加］/な" \
  --seed 42 \
  --generated-at 2026-06-29T00:00:00.000Z \
  --gamma 1.1 \
  --output ./tmp/sample.jpg \
  --metadata-output ./tmp/sample.json \
  --force
```

中古和文 UniDic 解析モード:

```bash
cd soan-cli
node dist/cli.js \
  --text "けふ/こそ" \
  --kobun \
  --mecab-dic ../dictionaries/unidic-chuko-v202512 \
  --seed 5 \
  --output ./tmp/kobun.jpg \
  --metadata-output ./tmp/kobun.json \
  --force
```

## 公開前ゲート

```bash
pixi run check
npm --prefix soan-cli audit --omit=dev
cd soan-cli
npm run test:e2e
npm --cache ./tmp/npm-cache pack --dry-run
npm --cache ./tmp/npm-cache publish --dry-run
```

tarball install smoke も確認済みです。

```bash
cd soan-cli
npm --cache ./tmp/npm-cache pack
tmpdir=$(mktemp -d /private/tmp/soan-pack-final.XXXXXX)
cd "$tmpdir"
npm --cache /Users/ryo/soan/soan-cli/tmp/npm-cache init -y
npm --cache /Users/ryo/soan/soan-cli/tmp/npm-cache install /Users/ryo/soan/soan-cli/soan-professional-cli-2.0.0.tgz
npx soan --version
npx soan --text 'か［1］' --seed 3 --output ./id.jpg --metadata-output ./id.json --force
npx soan --text 'けふ/こそ' --kobun --seed 3 --output ./kobun.jpg --metadata-output ./kobun.json --force
```

## ディレクトリ

- `soan-cli/`: npm package 本体
- `packages/core/`: renderer-independent core contracts
- `packages/demo/`: PixiJSを使わない静的CLI demo
- `soan-cli/src/`: TypeScript CLI 実装
- `soan-cli/test/`: Vitest unit tests
- `package/`: Soan v1.1.0 互換 dependency
- `package/soan/soan.min.js`: Professional CLI 用に最小パッチした互換 renderer
- `PLANS.md`: 移植計画、実装履歴、検証履歴

## メタデータ契約

`--metadata-output` の sidecar JSON が v2.0.0 の canonical reproducibility record です。JPEG には同じ Professional metadata JSON を単一の APP1 XMP packet として埋め込みます。XMP が JPEG APP1 のサイズ上限を超える場合は compact XMP を試し、それでも大きい場合は JPEG と sidecar を出力したうえで `xmp.embedded: false` と理由を記録します。PNG は sidecar JSON のみを正式記録とします。

`--seed` は glyph / layout 選択を再現するための値です。JPEG bytes まで固定したい場合は、XMP に入る timestamp も変化しないように `--generated-at <ISO timestamp>` を指定してください。

## 制限

- Pro glyph 指示があるレンダリングでは、位置指定を成立させるため、その実行に限って実効 `renmenPriority` を `0` にします。この値は sidecar の `soanConfig.renmenPriority` にも実効値として記録します。
- `［ID］` は設定済み dataset と同梱 fallback 画像から解決します。未指定 dataset を探索する global registry は持ちません。
- `dictionaries/unidic-chuko-v202512` はローカル辞書配置です。npm tarball には同梱せず、配布先では `--mecab-dic` または `SOAN_MECAB_DIC` で辞書を指定します。
- PixiJS interactive editing は v2.0.0 の範囲外です。
