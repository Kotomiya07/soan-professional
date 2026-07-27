# 相互レビュー記録: soan-professional-cli × Codex (gpt-5.6-sol)

日付: 2026-07-27
対象: soan-professional-cli v1.3.0 が「そあん プロフェッショナル版 機能仕様」（https://dev.2sc1815j.net/soan/）の全機能を実装しているかの検証と修正。
方法: Claude Code から `codex exec -m gpt-5.6-sol --sandbox read-only` をサブエージェントとして呼び出し、レビュー → 修正 → 再レビューを収束するまで反復した。

## 第1回レビュー（tmp/codex-review-1.md）

仕様書9カテゴリと実装を突き合わせ、9項目の指摘。CLIとして対応すべきものを抽出して修正した。

| # | 指摘 | 対応 |
|---|---|---|
| 1 | `linesPerPage` / `textureImageLayoutMode` がエンジン実装済みなのにCLIから配線されていない | `options.ts` / `render.ts` / `soan.d.ts` に `--lines-per-page`（既定10, 1以上）と `--texture-image-layout-mode` を配線 |
| 2 | UniDicの複合品詞（例: 助詞-係助詞）がエンジンの `"助詞"` 完全一致に合わず変体仮名使い分けが機能しない | `majorPartOfSpeech()` で大分類へ正規化（`mecab.ts`） |
| 3 | MeCabトークンの `line` が全て0で、スラッシュ境界後の解析単位（レンダラの累積カウンタZ）に対応しない | 解析単位分割 `splitAnalysisUnits()` を導入し、単位ごとにMeCabへ1行ずつ渡してEOSで対応付け、単位オフセットを `line` に設定 |
| 4 | 連綿分割（中間 `renmenPriority`）が `Math.random` のままでシード再現性がない | `soan.min.js` の分割判定を `seededRandom` 優先に変更 |
| 5 | `imageText` がPro記法の字母をそのまま出力し、置換先の仮名にならない | `markedupChar` があればそれを使用（`cli.ts`） |
| 6 | E2Eの旧期待値が現行設計と不整合 | 期待値修正＋負シード・renmen 0.5 再現性（sha256一致）・kobunオフセット検証を追加。`mecab.test.ts` 新規作成 |

未対応と整理した項目（Web UI完全互換の場合のみ必要）: PixiJS対話編集・ツールチップ・候補検索/差し替え（READMEに非対応と明記）、UniDicのバージョン差（仕様2023.08 vs CLI v202512）。

2026-07-27追記: v2.0.0でv1.2の局所再選択方式をレンダラー内部へ実装済み。CLIの全体再レンダリング近似ではなく、空きが生じた行の候補glyphをseeded乱数で局所的に差し替え、totalGapが減った場合だけ再組版結果を採用する。

## 第2回レビュー（tmp/codex-review-2.md）

総合判定「要修正」。修正6件中4件OK、blocking 1件＋advisory 2件。

- **blocking**: `splitAnalysisUnits()` がオフセットを入力文字数で累積するため、MeCabが出力しない文字（空白など）を含む入力（例: `けふ /こそ`）でレンダラのZとずれる。レンダラはトークンsurface連結の実長を累積する。
- advisory: `soan.min.js` をブラウザ単体で使い `Math.seedrandom` 未ロードだと `new seedrandomCtor()` で例外。
- advisory: texture layout のE2Eが設定記録の確認のみで、canvas実寸までは検証していない。

## 第3ラウンド修正（tmp/fix-diff-round3.patch）

1. `splitAnalysisUnits()` は分割のみ（`readonly string[]`）に変更。オフセットは `analyzeWithMecab()` がMeCab出力のEOSグループごとに「トークンsurfaceの正規化済み文字数の合計」を累積して決める方式に変更。トークンなし単位は入力単位長でフォールバック。
2. `normalizedCharLength()`: NFD正規化＋合成濁点（U+3099–U+309A）除去後の文字数。エンジン `_()` の他の置換（カタカナ→ひらがな、小書き仮名）は1対1で長さ不変。
3. `soan.min.js` の `seedUsed` IIFEに `seedrandomCtor` 不在時のfallbackを追加（`seededRandom` を未定義のままにして `Math.random` 経路へ）。CLI経路は `soan.cjs` が必ず `seedrandom` を注入するため決定論性に影響なし。
4. E2E追加: `けふ /こそ` --kobun で `こそ` の `line === 2` とglyph到達、texture layout でcanvasがテクスチャ実寸200×200になることを検証。

実測: 修正前 `こそ line=3`（Z=2と不一致）→ 修正後 `line=2` で `glyphs: けふ|こそ` を確認。tsc / eslint（警告0）/ vitest 51件 / cli-e2e.mjs 全パス。

## 第3回レビュー（tmp/codex-review-3.md）

総合判定「**OK — blocking解除可能**」。全観点OK。

- offset累積方式: EOS単位ごとのsurface正規化長の累積がレンダラのZ更新（文節長 `Array.from(...).length` の加算）と一致。複数トークン・句点・EOSのみ単位・空単位のいずれも整合。
- `normalizedCharLength()` の前提（長さに影響するのは合成濁点除去のみ）はエンジン `_()` と一致。コードポイント単位の計数もレンダラと同一。
- seedrandom fallback: CLI経路の決定論性は不変。ブラウザで `Math.seedrandom` 不在時のみ `Math.random` 経路へ縮退（再現性なしだがクラッシュ回避として妥当）。
- 追加E2Eは回帰を直接固定できていると評価。

非blockingの改善候補（今後の課題）: MeCab出力を模擬した単体テストの拡充、ブラウザsmoke test、EOS数の整合性検査。

## 検証コマンド

```bash
cd packages/cli
npm run build
npx eslint src test --max-warnings 0
npx vitest run
node test/cli-e2e.mjs
```
