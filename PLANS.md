# そあん（soan）Professional版 移植計画

## 2026-06-29 実装開始メモ

Professional版の全量移植は本計画上43日規模のため、最初の縦切りとして「既存soan v1.1.0をレンダリングエンジンに使い、CLIでPro入力を受けて画像生成できる」範囲を実装した。

実装済み:
- `pixi.toml` に `install` / `test` / `build` / `smoke` task を追加
- `soan-cli` を TypeScript 化し、`dist/cli.js` を生成する構成に変更
- Pro拡張記法パーサーを追加: `［字母］`, `［ID］`, `/` 境界
- `--seed` により Soan の `Math.random` 依存部分をレンダリング中だけ deterministic 化
- `--gamma` による出力画像のガンマ補正
- `--metadata-output` による再現性 sidecar JSON 出力
- `canvas` native build を避けるため、ローカル `packages/legacy-soan/soan/soan.cjs` を `@napi-rs/canvas` に差し替え

検証済み:
- `pixi run test`: 6 tests passed
- `pixi run build`: TypeScript build passed
- `pixi run smoke`: `packages/cli/tmp/smoke.jpg` と `packages/cli/tmp/smoke.json` を生成

## 2026-06-29 v1.2.0 CLI公開候補メモ

oracle（`soan-v2-completion-audit`）から、公開レベルの blocker は Pro 記法が metadata 記録のみでレンダリングに効かないこと、実選択 glyph ID が metadata にないこと、package が private / pre-release のままであること、`any` 型が残ることだと指摘された。

改善済み:
- `packages/legacy-soan/soan/soan.min.js` の互換レイヤーへ Pro option を通し、`［字母］` は候補 jibo filter、`［ID］` は URL ID 直接選択としてレンダリングへ反映
- `/` 境界は kuromoji 後の bunsetsu 配列を手動分割し、`かな` と `か/な` で連綿選択が変わることを smoke で確認
- `selectedGlyphs` metadata を追加し、選択 glyph URL・位置・jibo・URLから抽出できる glyph ID を記録
- `soan-professional-cli@1.2.0` として package metadata を更新し、`soan` / `soan-cli` / `soan-pro` bin を公開
- `--version`, 安定した `--help`, kebab-case aliases, `--margin`, `--font-family`, 数値 range validation を追加
- v1.2 CLI 組版オプションとして `--num-lines`, `--char-spacing`, `--line-spacing` を追加。`--num-lines` はレンダリング後の softLine 数を検証し、正確に満たせない場合は出力前に失敗する
- JPEG 出力へ Professional metadata JSON を APP1 XMP として埋め込み。PNG は sidecar JSON を正式記録とし、`xmp.embedded: false` と理由を記録
- JPEG XMP は APP1 上限を超える場合に compact XMP を試し、それでも超える場合は JPEG と sidecar を出力しつつ `xmp.embedded: false` と理由を記録する fallback を追加
- root `pixi run check` を test/build/smoke の release gate に更新し、package-level `npm run check` と `prepack` も追加
- `--old-japanese` / `--kobun` を古文表記保持モードとして追加。kuromoji の読み変換を避け、原文表記と `/` 手動境界を使って既存 renderer に渡す
- `soan dict install --output <dir>` を追加。GitHub Release asset を取得し、固定 SHA-256 と tar path safety を検証してから中古和文 UniDic を展開する。`soan dict update` は再取得、`soan dict path` は辞書パス確認に使う
- `［ID］` はロード済み dataset の `data` 全体からも逆引きし、本文に同じ文字が出ていない ID でも選択できるようにした
- `packages/cli/src`, `packages/cli/test`, `packages/legacy-soan/soan/soan.d.ts` から明示的な `any` 型を除去

検証済み:
- `pixi run test`: 8 tests passed
- `pixi run build`: TypeScript build passed
- `pixi run smoke`: `packages/cli/tmp/smoke.jpg` と `packages/cli/tmp/smoke.json` を生成し、`15338` ID 指示が選択 glyph に反映
- `node dist/cli.js --text 'か［加］/な' ...`: jibo `加` と slash 境界の反映を metadata で確認
- `node dist/cli.js --text 'かな'` と `node dist/cli.js --text 'か/な'`: 境界なしは `かな` 連綿、境界ありは `か` / `な` 単字に分割されることを確認
- `node dist/cli.js dict install --output <tmp>`: release asset の download、SHA-256 検証、展開、既存辞書の `--force` なし拒否を確認
- `npm --prefix packages/cli audit --omit=dev`: production dependency vulnerabilities 0
- `npm --cache ./tmp/npm-cache pack --dry-run`: tarball contents and bundled `soan` dependency checked
- packed tarball を `/private/tmp/soan-pack-test.*` へ install し、`npx soan --version` と `npx soan --text 'か［加］/な' ...` が成功、metadata の先頭 glyph が jibo `加` になることを確認
- `node dist/cli.js --text 'いろはにほへとちりぬるを' --num-lines 3 --char-spacing 20 --line-spacing 30 ...`: `selectedGlyphs` の softLine が 3 本になり、画像サイズ・組版設定が sidecar に記録されることを確認
- `node dist/cli.js --text 'か［加］/な' --gamma 1.1 ...`: JPEG bytes に `http://ns.adobe.com/xap/1.0/` XMP namespace が入り、sidecar の `xmp.embedded` が `true` になることを確認
- `npm --cache ./tmp/npm-cache publish --dry-run`: bin path 自動補正警告を解消後、dry-run publish が成功（未ログイン警告のみ）
- packed tarball を `/private/tmp/soan-pack-test.DbH3Ja` へ install し、`npx soan --version`、`npx soan --text 'か［加］/な' --num-lines 1 ...`、JPEG XMP namespace、sidecar `xmp.embedded: true` を確認
- `node dist/cli.js --text 'か［1］' ...`: dataset `001.json` の本文非依存 ID `000001` が `selectedGlyphs[0].glyphId === 1` として選択されることを確認
- `node dist/cli.js --text 'けふ/こそ' --old-japanese ...`: metadata に `morphologyMode: old-japanese` が記録され、`けふ` / `こそ` の表記保持と手動境界が反映されることを確認
- packed tarball を `/private/tmp/soan-pack-final.cVrjHw` へ install し、`npx soan --text 'か［1］' ...` と `npx soan --text 'けふ/こそ' --kobun ...` が成功。tarball 経由でも dataset 全体 ID 逆引きと古文表記保持モードが動作することを確認
- 長文 JPEG smoke: `か` 1200字入力で XMP APP1 上限を超えても CLI が失敗せず JPEG と sidecar を生成し、`xmp.embedded: false` と理由を記録することを確認

## 2026-06-30 Professional CLI移植監査メモ

sub-agent 2本と oracle（`soan-professional-completion-audit`）で current-state 監査を実施した。結論は、Professional 全体移植としては PixiJS 編集 UI、MeCab / 中古和文 UniDic、page layout / manual positioning、demo / core monorepo が未実装であり未達。一方、CLI互換リリースとして公開するには、証拠が弱い e2e gate といくつかの実装上の blocker を潰せば現実的、という評価。

改善済み:
- `--generated-at` を追加し、metadata timestamp を固定できるようにした。同一 `--seed` と同一 `--generated-at` なら XMP込みJPEG bytes も再現できる
- PRNG を計画記載に合わせ、BigInt ベースの xorshift128+ 実装へ変更
- `［４８６７］` のような全角数字 directive を NFKC 正規化して ID として扱う
- 同一 render position への複数 Pro directive は黙って無視せず parse 時点で失敗する
- stdout data URL 出力時に Soan 起動バナーが混入しないようにした
- Pro directive があるときの実効 `renmenPriority: 0` を sidecar `soanConfig` に記録し、再現性 metadata と実レンダリング条件のズレを解消
- JPEG 生成時は upstream Soan XMP を使わず、CLI の Professional XMP を単一 APP1 packet として注入するようにした
- `--force` なしでは image だけでなく sidecar metadata も既存ファイルを上書きしない
- 古い `soan-cli/soan-cli.js` を削除し、TypeScript CLI に一本化
- `packages/legacy-soan/soan/soan.d.ts` に Professional option と render result の型契約を追加
- `npm run test:e2e` を追加し、Pro jibo / ID / slash boundary / kobun / layout / JPEG XMP / PNG sidecar / stdout / force保護 / deterministic bytes を自動検証

現時点の制限:
- Pro glyph 指示があるレンダリングでは位置指定を成立させるため、その実行に限って `renmenPriority` を 0 にする
- `［ID］` は設定済み dataset と同梱 fallback 画像から解決する。未指定 dataset をネットワーク探索する汎用 global registry は持たない
- sidecar JSON が canonical metadata。JPEG XMP は同じ metadata packet の埋め込みを行うが、PNG は sidecar のみ
- `--old-japanese` は MeCab/中古和文 UniDic を利用する。辞書はローカル開発時 `assets/dictionaries/unidic-chuko-v202512`、配布先では `soan dict install` または `--mecab-dic` で指定する
- PixiJS インタラクティブ編集は CLI package の範囲外

辞書配布:
- GitHub Release `dict-chuko-v202512` に `unidic-chuko-v202512.tar.gz` と `.sha256` をアップロード
- URL: `https://github.com/Kotomiya07/soan-professional/releases/tag/dict-chuko-v202512`
- 辞書は CC BY-NC-SA 4.0 のため npm package には同梱せず、release asset として分離

## 2026-06-30 Professional残機能移植メモ

ユーザー提供の `unidic-chuko-v202512` を `assets/dictionaries/unidic-chuko-v202512` へ移動し、Nix の `mecab` と組み合わせて利用する構成にした。PixiJS編集UI以外の残件として MeCab / 中古和文 UniDic、page layout / manual positioning、demo / core monorepo を実装した。

改善済み:
- `--old-japanese` / `--kobun` は `mecab -d <dict> -O unidic` を呼び、解析 token を metadata と renderer に渡す
- `--mecab-dic`, `--mecab-command`, `SOAN_MECAB_DIC`, `SOAN_MECAB_COMMAND` を追加
- renderer は `professionalMorphologyTokens` を使って古文 token 境界と品詞を反映する
- `--page-width`, `--page-height` を追加し、canvas page size を明示指定できるようにした
- `--manual-positions '[{"position":0,"offsetX":12,"offsetY":-8}]'` を追加し、renderer draw位置と selectedGlyphs metadata に反映する
- glyph metadata に `x`, `y`, `width`, `height` を追加
- `packages/core` を追加し、page layout / manual positioning / morphology token の renderer-independent core contract を分離
- `packages/demo` を追加し、PixiJSではない静的CLI demoを提供
- `pixi run check` は core build と Nix MeCab shell 内の e2e を含む

## 2026-07-02 monorepo構成整理メモ

他AIの構成レビューを踏まえて、現状の「root直下の `soan-cli` と `package`、monorepo配下の `packages/core` / `packages/demo` が混在する」状態を確認した。結論として、公開単位をすべて `packages/` に寄せる提案は妥当。ただし core / renderer の大規模再分割は現時点の動作範囲に対して過剰なので、まず package boundary が曖昧な箇所だけを移動した。

判断:
- `soan-cli` は npm package 本体なので `packages/cli` へ移す
- 既存 Soan v1.1.0 互換コードの `package` は役割が名前から分からないため `packages/legacy-soan` へ移す
- local dataset / dictionary は npm package と混ざらないよう `assets/datasets` と `assets/dictionaries` へ寄せる
- `packages/core` と `packages/demo` は既存の責務が明確なので維持する

改善済み:
- root `package.json` の workspaces を `packages/*` に統一
- `pixi.toml`, GitHub Actions, package scripts, e2e, package-lock の参照を新パスへ更新
- CLI package の `repository.directory` と local `soan` dependency を `packages/cli` / `packages/legacy-soan` に更新
- legacy Soan の dependency fallback `createRequire` を移動後の CLI package へ向け直した
- 大容量の local dataset / dictionary を `assets/` 配下へ移し、`.gitignore` と README のディレクトリ説明を更新

改善過程:
1. 実 tree、root/package 設定、CI、`PLANS.md`、未コミット差分を確認した
2. 既存変更を保持したまま `git mv` で CLI package を移動した
3. Git index lock を避けるため legacy package は単独で移動し直した
4. 参照更新後に `rg` で旧パスの残存と npm badge の置換副作用を確認し、必要箇所を修正した
5. 移動後の e2e / smoke で `@napi-rs/canvas` の Image/Canvas 型不一致を検出し、legacy 互換層の dependency 解決を CLI package 優先に変更した

検証済み:
- `npm --prefix packages/cli install`: local `soan` link を `packages/legacy-soan` へ更新
- `npm --prefix packages/cli exec tsc -- -p packages/core/tsconfig.json`: core contracts build passed
- `npm --prefix packages/cli run check`: format / lint / typecheck / unit test / build / Nix MeCab e2e / smoke passed
- `nix shell nixpkgs#mecab -c bash -lc 'SOAN_MECAB_COMMAND="$(command -v mecab)" npm --prefix packages/cli run test:e2e'`: `assets/dictionaries/unidic-chuko-v202512` を使う e2e passed
- `npm pack --dry-run` in `packages/cli`: tarball contents include bundled `vendor/soan`; generated pack artifacts were removed afterward

## 2026-07-02 v1.2.2 publish修正メモ

`v1.2.1` は npm Trusted Publishing までは成功したが、直後の registry install smoke が失敗した。初回は npm registry の反映遅延で `1.2.1` が見えず、再実行後は fresh global install 環境で `@napi-rs/canvas` の native binding が見つからないことを確認した。また公開 tarball から起動した `soan --version` が package version ではなく hard-coded `1.2.0` を返す問題も検出した。

改善済み:
- CLI package version を `1.2.2` に更新
- `CLI_VERSION` を `1.2.2` に更新
- `@napi-rs/canvas` を `0.1.100` に固定し、platform native packages を CLI package の `optionalDependencies` に明示
- publish workflow の npm registry install retry を 5 回から 12 回へ増やし、registry 反映遅延で落ちにくくした

検証済み:
- `npm --prefix packages/cli run check`: format / lint / typecheck / unit test / build / Nix MeCab e2e / smoke passed
- `npm --prefix packages/cli exec tsc -- -p packages/core/tsconfig.json`: core contracts build passed
- local packed tarball `soan-professional-cli-1.2.2.tgz` を隔離 cache / tmp prefix へ global installし、`soan`, `soan-cli`, `soan-pro` の `--version` が `1.2.2` を返すことを確認
- 同じ packed install で `soan --text 'か［加］/な' ...` が成功し、metadata の先頭 glyph が jibo `加` になることを確認

## 2026-07-02 Pro字母指定の仕様照合と修正

参照先 `https://dev.2sc1815j.net/soan/about.html` を確認したところ、プロ版の字母指定は `か［加］` のような後置annotationではなく、`［加］［八］らぬ` や `［加］［八良］ぬ` のように、入力本文中のかなを全角角括弧directiveで置き換える記法だった。ID指定も `［4867］` だけでなく `［ID4867］` が例示されていた。

改善過程:

1. 既存実装 `packages/cli/src/extended-text.ts` と `packages/cli/test/extended-text.test.ts` を確認し、現在のテストが `か［加］な` を正として固定していることを確認した。
2. 参照仕様の例に合わせて、`［加］［八良］ぬ` が `かはらぬ` に展開される赤テストを追加した。
3. parserに字母漢字からかなへ戻す最小対応表を追加し、前置・連続directiveをインライン置換として扱うように修正した。
4. 後方互換のため、既存CLI記法 `か［加］` は引き続き「直前文字へのdirective」として解釈する。
5. ID directiveはparser時点ではIDから本文かなを引けないため、renderer内のID直接選択を起動できる既知placeholder `N` を置く設計にした。`ID` prefixと全角数字はNFKC正規化で受け付ける。
6. README、package README、smoke、e2eの代表入力をインライン置換型へ更新した。

検証:

- `uv run --no-sync npm --prefix packages/cli test`: unit tests passed

## 2026-07-02 GitHub Release自動更新

`v*.*.*` tag pushで起動する `publish.yml` に、GitHub Releaseの自動作成・更新を追加した。`workflow_dispatch` は従来通りdry-run扱いで、Releaseやregistryを更新しない。

改善過程:

1. 既存 `publish.yml` は npm / GitHub Packages への公開だけで、GitHub Releaseを作成・更新していないことを確認した。
2. Release assetとして `npm pack` で生成した `soan-professional-cli-<version>.tgz` と `.sha256` を作る step を追加した。
3. `softprops/action-gh-release@v2` で tag名のReleaseをupsertし、auto-generated release notesとasset上書きを有効にした。
4. Release更新に必要なため、publish workflowの `contents` permissionを `read` から `write` に変更した。
5. CI / publish workflow内に残っていた旧Pro記法 `か［加］/な` の smoke を `［加］/な` に更新した。
6. README / README.ja.md のrelease説明を、GitHub Release asset更新まで含む表現に更新した。

## 概要

現代日本語テキストからくずし字（古活字）画像を生成するJavaScriptライブラリ「そあん」に、Professional版の機能を移植する。

**移植方針**: ハイブリッド型（A寄り）
- 既存soan v1.1.0のコアアルゴリズム（2段階レイアウト、字母選択、連綿処理）をTypeScript化して移植
- アーキテクチャ（モジュール分割、レンダラー抽象化）は新規設計
- API仕様・データセットJSON形式は互換を保つ

**アーキテクチャ**: ハイブリッドレンダラー構成
- コアロジック → レンダラー非依存（ピュアTS）
- ブラウザインタラクティブUI → PixiJS v8
- 静的出力・CLI → Canvas 2D アダプター

---

## 既存ソース解析結果

### soan v1.1.0 内部構造

既存の`soan.min.js`（整形後2281行）の関数マッピング:

| 元の関数 | 役割 | 移植先モジュール |
|----------|------|-----------------|
| `S(e)` | 形態素解析（kuromoji.tokenize） | `core/morphology/` |
| `j(e)` | 文節グルーピング（品詞ベース） | `core/morphology/bunsetsu.ts` |
| `_(e, n)` | テキスト正規化（カタカナ→ひらがな、小書き、長音、数字→漢数字） | `core/normalizer.ts` |
| `I(e)` | 踊り字処理（ゝ、〱） | `core/normalizer.ts` |
| `P(e, n, r, a, t)` | 再帰的字母辞書探索（連綿優先度付き） | `core/selector/engine.ts` |
| `O(e, n, r, a)` | データセット利用可能文字チェック | `core/dataset/manager.ts` |
| `D(e)` | データセットJSON読み込み（優先度付き統合） | `core/dataset/loader.ts` |
| `U(e, n)` | テキスト→トークン化パイプライン | `core/pipeline.ts` |
| `N(e, a)` | レンダリングパイプライン（画像ロード→レイアウト→描画） | `renderer-*/` |
| `z(e, n, t, i)` | 禁則処理（行分割判定） | `core/layout/line-break.ts` |
| `V(e, n)` | 約物アキ処理（句読点前後のスペース最適化） | `core/layout/spacing.ts` |
| `W` (XMP関連) | XMPメタデータ構築・埋め込み | `renderer-canvas/xmp.ts` |
| `omtdata` | 組み込み文字画像マッピング（句読点、数字、英字等） | `core/dataset/builtin.ts` |

### 字母選択ルール（既存実装から抽出）

品詞・語中位置に基づく字母自動選択:

| 文字 | 条件 | 字母 |
|------|------|------|
| か | 助詞 | 可 |
| か | 語頭 | 加 |
| か | その他 | 可 |
| し | 語頭 | 志 |
| し | その他 | 之 |
| は | 助詞 | 八（代替: 盤） |
| は | 語頭 | 者 |
| は | その他 | 波 |
| を | 非助詞 | 越 |
| の | 非助詞 | 能 |
| に | 非助詞 | 仁 |

### 既存アーキテクチャパターン

依存注入パターン:
```javascript
// soan.cjs: 環境固有の依存を注入
Soan(config, {window, Image, kuromoji, kuromojiDicPath, path, fs, Canvas, Blob, Buffer});
```

これを参考に、レンダラーアダプターパターンで環境差を吸収する。

### レイアウトアルゴリズム（既存実装）

1. **行分割**: `z()` - 3文字のコンテキスト(前・現・次)で判定
   - W(0): 改行しない
   - H(1): 現文字の後で改行
   - X(2): 現文字の前で改行
2. **約物アキ**: `V()` - 括弧・句読点の前後スペース削減
3. **行間調整**: `Z` 辞書 - 各行の字間を均等化（行長がcharsPerLine×100pxに近づくよう調整）

---

## フェーズ構成

### フェーズ0: プロジェクト基盤構築

**目的**: monorepo構成の確立とビルドパイプラインの整備

**タスク**:
1. プロジェクト初期化（TypeScript + monorepo）
2. パッケージ構成の策定
3. ビルドツール設定（Vite / tsup）
4. テスト環境構築（Vitest）
5. Lint / Format設定（ESLint + Prettier）

**パッケージ構成**:
```
packages/
├── core/           # レンダラー非依存のコアロジック
│   ├── morphology/ # 形態素解析アダプター
│   ├── layout/     # レイアウトエンジン
│   ├── selector/   # 字母選択ロジック
│   └── dataset/    # データセット読み込み・キャッシュ
├── renderer-canvas/ # Canvas 2D レンダラー（Node.js/ブラウザ）
├── renderer-pixi/   # PixiJS レンダラー（ブラウザ専用）
├── cli/             # CLIツール
└── demo/            # デモアプリ
```

**成果物**: ビルド・テスト・Lintが動作するmonorepo

---

### フェーズ1: コアロジック実装

**目的**: レンダラーに依存しない形態素解析・字母選択・レイアウト計算の実装

#### 1-1. データセット管理

| 項目 | 内容 |
|------|------|
| データ取得 | CODH JSON API (`codh.rois.ac.jp/soan/dataset/001.json`) |
| キャッシュ戦略 | IndexedDB（ブラウザ）/ ファイルシステム（Node.js） |
| データ構造 | 文字→字母→画像URL のマッピング |
| 優先度 | 複数データセットの優先度付き統合 |

```typescript
interface Dataset {
  url: string;
  priority: number;
}

interface GlyphEntry {
  id: number;
  char: string;
  jibo: string;        // 字母
  imageUrl: string;
  width: number;
  height: number;
  dataset: string;
}

interface DatasetManager {
  load(datasets: Dataset[]): Promise<void>;
  getGlyphs(char: string): GlyphEntry[];
  getGlyphById(id: number): GlyphEntry | null;
  getGlyphByJibo(char: string, jibo: string): GlyphEntry[];
  getRenmen(chars: string): GlyphEntry[];  // 連綿
}
```

#### 1-2. 形態素解析アダプター

| 環境 | エンジン | 用途 |
|------|----------|------|
| ブラウザ | kuromoji.js | 標準テキスト解析 |
| Node.js | 中古和文UniDic (MeCab) | 古文テキスト高精度解析 |

```typescript
interface MorphemeResult {
  surface: string;       // 表層形
  reading: string;       // 読み
  pos: string;           // 品詞
  baseForm: string;      // 原形
  boundary: boolean;     // 形態素境界
}

interface MorphologyAdapter {
  analyze(text: string): Promise<MorphemeResult[]>;
  isAvailable(): boolean;
}
```

**Professional版追加機能**:
- `/` による形態素境界の手動指定
- 古文モード切替

#### 1-3. 字母選択エンジン

**選択ロジック**:
1. 形態素解析結果から変体仮名の字母を決定
2. 連綿（2文字以上の連続体）の候補を探索
3. シード値によるランダム選択の再現性

**Professional版追加機能**:
- `［加］` 記法による字母直接指定
- `［4867］` 記法によるID直接指定
- 連綿優先度の細かい制御

```typescript
interface SelectionOptions {
  seed?: number;
  renmenPriority: number;       // 0-1
  forceJibo?: Map<number, string>;  // position → jibo
  forceId?: Map<number, number>;    // position → glyph ID
}

interface SelectionResult {
  glyphs: SelectedGlyph[];
  renmenGroups: RenmenGroup[];
}

interface SelectedGlyph {
  position: number;
  entry: GlyphEntry;
  isRenmen: boolean;
  alternatives: GlyphEntry[];  // 代替候補
}
```

#### 1-4. レイアウトエンジン

**2段階レイアウト**（既存soanの方式を踏襲）:
1. 行長制約なしで仮配置
2. 行長を考慮して再調整（改行時に字形を再選択）

**Professional版追加機能（v1.2改良組版）**:
- 行数指定
- 字間・行間の1/100文字単位調整
- ページレイアウト

```typescript
interface LayoutOptions {
  charsPerLine: number;       // 一行の文字数 (0=折り返しなし)
  lineGap: number;            // 行間（文字幅比）
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  height: 'auto' | 'fit';
  scale: number;
  numLines?: number;          // Pro: 行数指定
  charSpacing?: number;       // Pro: 字間微調整 (1/100単位)
  lineSpacing?: number;       // Pro: 行間微調整 (1/100単位)
}

interface LayoutResult {
  width: number;
  height: number;
  lines: LayoutLine[];
}

interface LayoutLine {
  x: number;
  y: number;
  glyphs: PlacedGlyph[];
}

interface PlacedGlyph {
  glyph: SelectedGlyph;
  x: number;
  y: number;
  width: number;
  height: number;
  offsetX: number;    // Pro: 手動位置調整
  offsetY: number;    // Pro: 手動位置調整
}
```

---

### フェーズ2: Canvas 2D レンダラー実装

**目的**: 静的画像出力（CLI・サーバーサイド・ブラウザfallback）

#### 2-1. レンダラーインターフェース

```typescript
interface RenderOptions {
  paperTexture?: string;
  white: string;
  black: string;
  gamma: number;           // Pro: ガンマ補正 (0.1-2.2)
}

interface Renderer {
  render(layout: LayoutResult, options: RenderOptions): Promise<RenderOutput>;
  dispose(): void;
}

interface RenderOutput {
  width: number;
  height: number;
  toBlob(format: 'jpeg' | 'png', quality?: number): Promise<Blob>;
  toBuffer(format: 'jpeg' | 'png', quality?: number): Promise<Buffer>;   // Node.js
  toDataURL(format: 'jpeg' | 'png', quality?: number): string;
}
```

#### 2-2. Canvas 2D 実装

| 項目 | 内容 |
|------|------|
| ブラウザ | `<canvas>` + `CanvasRenderingContext2D` |
| Node.js | `@napi-rs/canvas`（Rustベース、ネイティブビルド不要） |
| 画像読み込み | fetch + createImageBitmap（ブラウザ）/ loadImage（Node.js） |
| 紙テクスチャ | 背景合成（globalCompositeOperation） |
| ガンマ補正 | ピクセル単位のImageData操作 |

#### 2-3. XMPメタデータ

- 出力JPEGにXMPメタデータを埋め込み（再現性確保）
- 使用した古活字IDリストを記録

---

### フェーズ3: PixiJS レンダラー実装

**目的**: ブラウザでのインタラクティブ編集UI

#### 3-1. PixiJS基盤

| 項目 | バージョン/設定 |
|------|--------------|
| PixiJS | v8.x |
| レンダラー | WebGPU（フォールバック: WebGL2） |
| スプライト管理 | 各文字を個別Spriteとして配置 |
| テクスチャ管理 | 動的ロード + LRUキャッシュ |

#### 3-2. インタラクティブ機能

**文字位置調整**:
- ホバーで文字をハイライト表示
- 矢印キーで位置調整（1/20、1/100、1/2文字単位のモード切替）
- ドラッグ＆ドロップによる自由配置

**字母差替え**:
- 文字クリックで代替候補パネルを表示
- データセット内の同文字・同字母を検索
- サムネイルプレビュー付き選択UI

**ビューポート操作**:
- ズーム（ピンチ/ホイール）
- パン（ドラッグ）
- 全体表示リセット

```typescript
interface InteractiveRenderer extends Renderer {
  mount(container: HTMLElement): void;
  unmount(): void;

  // イベント
  on(event: 'glyphSelect', handler: (glyph: PlacedGlyph) => void): void;
  on(event: 'glyphMove', handler: (glyph: PlacedGlyph, dx: number, dy: number) => void): void;
  on(event: 'glyphReplace', handler: (glyph: PlacedGlyph, newEntry: GlyphEntry) => void): void;

  // 操作
  highlightGlyph(position: number): void;
  showAlternatives(position: number): void;
  setEditMode(mode: 'select' | 'move' | 'view'): void;

  // エクスポート
  exportLayout(): LayoutResult;
  exportGlyphIds(): number[];
}
```

#### 3-3. フィルタ・エフェクト

- ガンマ補正 → PixiJS ColorMatrixFilter
- 紙テクスチャ → 背景Sprite + ブレンドモード
- 色マッピング（白/黒カスタム） → シェーダーフィルタ

---

### フェーズ4: Professional版固有機能

#### 4-1. 入力テキスト拡張記法パーサー

```
入力例: "あ/い［加］う［4867］え"
```

| 記法 | 意味 | 例 |
|------|------|---|
| `［字母名］` | 字母を直接指定 | `か［加］` → 「加」の字母でかなを表示 |
| `［ID］` | 古活字画像IDを直接指定 | `か［4867］` → ID:4867の画像を使用 |
| `/` | 形態素境界を手動指定 | `はな/の` → 「はな」と「の」で分割 |

```typescript
interface ParsedToken {
  type: 'text' | 'jiboSpec' | 'idSpec' | 'boundary';
  value: string;
  jibo?: string;
  id?: number;
}

function parseExtendedText(input: string): ParsedToken[];
```

#### 4-2. シード値による再現性

```typescript
interface SeedOptions {
  seed: number;          // 乱数シード
  deterministic: true;   // 同一入力 → 同一出力保証
}
```

- xorshift128+ベースのPRNG実装
- シード値をXMPメタデータに記録

#### 4-3. 古文モード

- 中古和文UniDic辞書によるNode.js環境での高精度解析
- ブラウザでは辞書データをWASM経由でロード（将来対応）
- 変体仮名選択ルールの古文向け最適化

#### 4-4. ガンマ補正

```typescript
interface GammaOptions {
  gamma: number;  // 0.1 - 2.2（デフォルト: 1.0）
}
```

- Canvas: ImageDataのピクセル走査で `pow(value/255, 1/gamma) * 255`
- PixiJS: ColorMatrixFilterで実装（GPU処理）

#### 4-5. 改良組版（v1.2）

- 行末の不自然な空白を最小化するアルゴリズム
- 行内の文字間隔の均等化
- 連綿が改行位置で分断されない制約

---

### フェーズ5: CLI実装

**目的**: コマンドラインからの静的画像生成

```bash
# 基本使用
soan --text "サンプル" --output "sample.jpg"

# Professional版オプション
soan --text "は/な［花］の" \
     --seed 42 \
     --gamma 1.5 \
     --chars-per-line 15 \
     --line-gap 0.5 \
     --paper-texture "素紙" \
     --output "haiku.jpg"
```

**実装**:
- CLIフレームワーク: citty（軽量）
- Canvas: `@napi-rs/canvas`
- 出力形式: JPEG（XMP付き）、PNG

---

### フェーズ6: デモ・ドキュメント

#### 6-1. デモアプリ

- Vite + Vanilla TS（フレームワーク非依存）
- テキスト入力 → リアルタイムプレビュー
- インタラクティブ編集パネル
- オプション設定UI
- 紙テクスチャ選択
- エクスポート（JPEG/PNG/古活字IDリスト）

#### 6-2. ドキュメント

- APIリファレンス（TypeDoc）
- 使用ガイド（標準版/Professional版）
- 移行ガイド（既存soanからの移行）

---

## 技術スタック

| カテゴリ | 選定 | 理由 |
|---------|------|------|
| 言語 | TypeScript 5.x | 型安全性、IDE補完 |
| パッケージ管理 | uv (Python) + pnpm (JS) | uvはプロジェクト管理、pnpmはJSパッケージ |
| monorepo | pnpm workspaces | 軽量、高速 |
| ビルド | tsup (ライブラリ) + Vite (デモ) | Tree-shaking、ESM/CJS両対応 |
| テスト | Vitest | 高速、TypeScriptネイティブ |
| PixiJS | v8.x | WebGPU対応、最新API |
| Canvas (Node) | @napi-rs/canvas | ネイティブビルド不要、高速 |
| 形態素解析 | kuromoji.js + MeCab | ブラウザ/サーバー両対応 |
| CLI | citty | 軽量、TypeScript対応 |
| PRNG | xorshift128+ | 高速、再現性確保 |

---

## 実装順序とマイルストーン

| # | マイルストーン | 期間目安 | 依存 |
|---|-------------|---------|------|
| M1 | プロジェクト基盤 + ビルド動作 | 2日 | - |
| M2 | データセット管理 + テスト | 3日 | M1 |
| M3 | 形態素解析アダプター | 3日 | M1 |
| M4 | 字母選択エンジン | 4日 | M2, M3 |
| M5 | レイアウトエンジン（基本） | 4日 | M4 |
| M6 | Canvas 2Dレンダラー + 画像出力 | 3日 | M5 |
| M7 | CLI基本動作 | 2日 | M6 |
| M8 | 拡張記法パーサー（Pro） | 2日 | M4 |
| M9 | シード値・再現性（Pro） | 1日 | M4 |
| M10 | ガンマ補正（Pro） | 1日 | M6 |
| M11 | 改良組版（Pro） | 4日 | M5 |
| M12 | PixiJSレンダラー基本 | 4日 | M5 |
| M13 | インタラクティブ編集（Pro） | 5日 | M12 |
| M14 | デモアプリ | 3日 | M12 |
| M15 | ドキュメント整備 | 2日 | All |

**合計見積り**: 約43日（1人開発）

---

## リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| CODHデータセットAPIの仕様変更 | データ取得不能 | ローカルキャッシュ、フォールバック |
| kuromoji.jsのメンテ状況 | 古い依存、バグ | sudachi.js等への差替え可能な抽象化 |
| PixiJS v8のWebGPU互換性 | 古いブラウザで動作不可 | WebGL2フォールバック自動切替 |
| @napi-rs/canvasの制約 | 一部Canvas APIが未実装 | canvas (node-canvas)へのフォールバック |
| 連綿・変体仮名の選択精度 | 不自然な出力 | 既存soanのロジックを忠実に移植 + テスト |

---

## ディレクトリ構成（最終形）

```
soan/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── dataset/
│   │   │   │   ├── manager.ts
│   │   │   │   ├── cache.ts
│   │   │   │   └── types.ts
│   │   │   ├── morphology/
│   │   │   │   ├── adapter.ts
│   │   │   │   ├── kuromoji.ts
│   │   │   │   └── mecab.ts
│   │   │   ├── selector/
│   │   │   │   ├── engine.ts
│   │   │   │   ├── renmen.ts
│   │   │   │   └── prng.ts
│   │   │   ├── layout/
│   │   │   │   ├── engine.ts
│   │   │   │   ├── line-break.ts
│   │   │   │   └── improved.ts    # v1.2改良組版
│   │   │   ├── parser/
│   │   │   │   └── extended.ts    # Pro拡張記法
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── package.json
│   ├── renderer-canvas/
│   │   ├── src/
│   │   │   ├── renderer.ts
│   │   │   ├── gamma.ts
│   │   │   ├── texture.ts
│   │   │   └── xmp.ts
│   │   └── package.json
│   ├── renderer-pixi/
│   │   ├── src/
│   │   │   ├── renderer.ts
│   │   │   ├── interactive.ts
│   │   │   ├── glyph-sprite.ts
│   │   │   ├── alternatives-panel.ts
│   │   │   └── viewport.ts
│   │   └── package.json
│   ├── cli/
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── package.json
│   └── demo/
│       ├── src/
│       │   ├── main.ts
│       │   ├── editor.ts
│       │   └── options-panel.ts
│       ├── index.html
│       └── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── package.json
├── PLANS.md
└── README.md
```
