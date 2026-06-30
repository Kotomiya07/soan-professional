# soan-professional-cli 日本語版

[![CI](https://github.com/Kotomiya07/soan-professional/actions/workflows/ci.yml/badge.svg)](https://github.com/Kotomiya07/soan-professional/actions/workflows/ci.yml)
[![Publish](https://github.com/Kotomiya07/soan-professional/actions/workflows/publish.yml/badge.svg)](https://github.com/Kotomiya07/soan-professional/actions/workflows/publish.yml)
[![npm version](https://img.shields.io/npm/v/soan-professional-cli.svg?label=npm)](https://www.npmjs.com/package/soan-professional-cli)
![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933)
![CLI release](https://img.shields.io/badge/release-v1.0.0-2563eb)
![License](https://img.shields.io/badge/license-MIT-blue)
![Dictionary license](https://img.shields.io/badge/dictionary-CC%20BY--NC--SA%204.0-orange)
[![English](https://img.shields.io/badge/README-English-blue)](./README.md)

`soan-professional-cli` は、Soan v1.1.0 互換レンダラーを使いながら、Professional ワークフローに必要な再現性制御をCLIから使えるようにする画像生成ツールです。Pro記法、決定的なglyph/layout選択、metadata sidecar、JPEG XMP、page layout制御、中古和文UniDic解析を扱えます。

このリポジトリからnpm公開するパッケージは `soan-professional-cli` です。repo内にはCLIの検証・デモ用パッケージも含まれます。

## インストール

npm公開後:

```bash
npm install -g soan-professional-cli
soan --version
```

ソースから使う場合:

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

同等のコマンド名を3つ提供します。

- `soan`
- `soan-cli`
- `soan-pro`

## 中古和文 UniDic

辞書はnpm packageには同梱していません。GitHub Release assetとして別配布します。中古和文UniDicは、このCLI本体のMIT licenseとは別にCC BY-NC-SA 4.0で配布されます。非営利・継承条件と attribution は、展開後の `unidic-chuko-v202512/README.md` を確認してください。

```bash
expected_sha256="5e548c834dd043e7909c46cc20f56a9f1d80dc7ea103361bf0b4a541f77610e9"
curl -L -O https://github.com/Kotomiya07/soan-professional/releases/download/dict-chuko-v202512/unidic-chuko-v202512.tar.gz
echo "${expected_sha256}  unidic-chuko-v202512.tar.gz" | sha256sum -c -
tar -tzf unidic-chuko-v202512.tar.gz | awk '/(^|\/)\.\.($|\/)|^\// { print "unsafe tar path: " $0 > "/dev/stderr"; bad=1 } END { exit bad }'
tar -xzf unidic-chuko-v202512.tar.gz
export SOAN_MECAB_DIC="$PWD/unidic-chuko-v202512"
```

`--kobun` または `--old-japanese` と一緒に使います。

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

## 機能

- `［字母］` / `［ID］` によるPro記法
- `/` による手動bunsetsu / renmen境界
- `--seed` によるglyph / layout選択の再現性
- `--generated-at` 固定時のbyte-level reproducible JPEG
- `--gamma` によるガンマ補正
- `--num-lines`, `--char-spacing`, `--line-spacing`, `--page-width`, `--page-height` による組版制御
- `--manual-positions` によるglyph手動位置調整
- `--old-japanese` / `--kobun` による中古和文UniDic解析
- `--metadata-output` によるcanonical sidecar metadata
- JPEG APP1 XMPへのProfessional metadata埋め込み
- PNG出力
- 設定済みdatasetと同梱fallback画像からの `［ID］` 逆引き

## メタデータ

`--metadata-output` のsidecar JSONがv1.0.0のcanonical reproducibility recordです。JPEGには同じProfessional metadata JSONを単一のAPP1 XMP packetとして埋め込みます。XMPがJPEG APP1のサイズ上限を超える場合はcompact XMPを試し、それでも大きい場合はJPEGとsidecarを出力したうえで `xmp.embedded: false` と理由を記録します。

`--seed` はglyph / layout選択を再現するための値です。JPEG bytesまで固定したい場合は、XMPに入るtimestampも変化しないように `--generated-at <ISO timestamp>` を指定してください。

## 開発

リポジトリrootから検証します。

```bash
pixi run check
npm --prefix soan-cli audit
```

公開前チェック:

```bash
cd soan-cli
npm run test:e2e
npm pack --dry-run
npm publish --access public --dry-run
```

## ディレクトリ

- `soan-cli/`: npm package本体
- `packages/core/`: repo内検証用のrenderer-independent contracts
- `packages/demo/`: PixiJSを使わない静的CLI demo
- `package/`: bundled Soan v1.1.0 compatibility dependency
- `dictionaries/`: ローカル開発用辞書配置。npm tarballには含めません
- `PLANS.md`: 移植計画と検証履歴

## スコープ

- PixiJS interactive editingはv1.0.0 CLI packageの範囲外です。
- Pro glyph指示があるレンダリングでは、位置指定を曖昧にしないため、その実行に限って実効 `renmenPriority` を `0` にします。
- `［ID］` は設定済みdatasetと同梱fallback画像から解決します。CLIはglobal dataset registryを提供しません。

## 謝辞・参照

本プロジェクトは、ROIS-DS人文学オープンデータ共同利用センター（CODH）のJavaScriptライブラリ [そあん（soan）](https://codh.rois.ac.jp/software/soan/) を基盤にしています。Soanは、古活字画像を用いて現代日本語テキストを描画するライブラリです。

CLIのProfessional制御面は、[そあん（soan）プロフェッショナル版](https://dev.2sc1815j.net/soan/) のワークフローを参考にしています。プロフェッショナル版では、全角角括弧による字母・字形指定、スラッシュによる形態素解析の切れ目指定、古文モード、シード値、古活字画像の位置調整、検索・差し替えなどが提供されています。

中古和文UniDicはCC BY-NC-SA 4.0で別配布されます。attributionとlicense詳細は、release asset内の辞書READMEを確認してください。

## License

CLI packageはMIT licenseです。中古和文UniDicは別途CC BY-NC-SA 4.0で配布されます。
