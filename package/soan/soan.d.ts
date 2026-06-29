export = Soan;

declare function Soan(config?: Soan.SoanConfig, vg?: unknown): Soan.SoanInstance | undefined;

declare namespace Soan {
  interface DatasetConfig {
    /** 古活字データセットのURL */
    url: string;
    /** 古活字データセットの優先度。default: 1 */
    priority?: number;
  }

  interface CanvasLike {
    readonly width?: number;
    readonly height?: number;
    toBuffer(mimeType?: string, config?: unknown): Buffer;
  }

  interface ProDirectiveBase {
    readonly position: number;
    readonly raw: string;
  }

  interface JiboDirective extends ProDirectiveBase {
    readonly kind: 'jibo';
    readonly jibo: string;
  }

  interface IdDirective extends ProDirectiveBase {
    readonly kind: 'id';
    readonly id: number;
  }

  type ProDirective = JiboDirective | IdDirective;

  interface BoundaryDirective {
    readonly position: number;
  }

  interface MorphologyToken {
    readonly line: number;
    readonly surface: string;
    readonly reading: string;
    readonly lemma: string;
    readonly pos: string;
  }

  interface ManualPosition {
    readonly position: number;
    readonly offsetX: number;
    readonly offsetY: number;
  }

  interface SoanConfig {
    /** 利用する古活字データセット情報の配列 */
    datasets?: readonly DatasetConfig[];
    /** true: 古活字画像が登録されていない文字も許容する。default: false */
    allowUnavailableChar?: boolean;
    /** 連綿活字の優先度（0: 非連綿優先から1: 連綿優先）。default: 1 */
    renmenPriority?: number;
    /** 字詰数（0は自動的に行を折り返さない）。default: 20 */
    charsPerLine?: number;
    /** 行間。default: 0.5 */
    lineGap?: number;
    /** 周囲の余白（px）。default: 100 */
    margin?: number;
    /** 天の余白（px）。default: 100 */
    marginTop?: number;
    /** 地の余白（px）。default: 100 */
    marginBottom?: number;
    /** 左の余白（px）。default: 100 */
    marginLeft?: number;
    /** 右の余白（px）。default: 100 */
    marginRight?: number;
    /** 'auto': 字詰数に応じた縦幅、'fit': 折り返しなし時は成り行き行長。default: 'auto' */
    height?: 'auto' | 'fit';
    /** Professional: 出力ページ幅（px）。 */
    pageWidth?: number;
    /** Professional: 出力ページ高さ（px）。 */
    pageHeight?: number;
    /** 古活字画像が登録されていない文字に利用されるフォントファミリー名。default: 'serif' */
    fontFamily?: string;
    /** 古活字画像が登録されていない文字に利用されるフォント色。default: '#000000' */
    fontColor?: string;
    /** 画像作成サイズ倍率。default: 1 */
    scale?: number;
    /** 用紙テクスチャファイル名。default: '' */
    paperTexture?: string;
    /** 古活字データセット画像の白にマッピングする描画色。default: '#ffffff' */
    white?: string;
    /** 古活字データセット画像の黒にマッピングする描画色。default: '#000000' */
    black?: string;
    /** Professional: 目標行数。互換CLIでは達成後検証される。 */
    numLines?: number;
    /** Professional: 字間微調整（1/100文字単位）。 */
    charSpacing?: number;
    /** Professional: 行間微調整（1/100文字単位）。 */
    lineSpacing?: number;
    /** Professional: 古文表記保持モード。 */
    morphologyMode?: 'modern' | 'old-japanese';
    /** Professional: MeCab / 中古和文UniDic 解析結果。 */
    professionalMorphologyTokens?: readonly MorphologyToken[];
    /** Professional: glyphごとの手動位置調整。 */
    manualPositions?: readonly ManualPosition[];
  }

  interface RenderOptions extends SoanConfig {
    /** 古活字組版画像出力先となるcanvas ID */
    canvasId?: string;
    /** 古活字組版画像出力先となるCanvasオブジェクト */
    canvas?: CanvasLike;
    /** 出力先ファイル名 */
    outputPath?: string;
    /** 出力先に同名ファイルがあるときも上書きする */
    force?: boolean;
    /** Professional: 位置に紐づく字母/ID直接指定 */
    professionalDirectives?: readonly ProDirective[];
    /** Professional: 手動形態素境界 */
    professionalBoundaries?: readonly BoundaryDirective[];
    /** 正常完了時のコールバック関数 */
    doneCallback?: (text: string, opt: RenderOptions, result: readonly RenderedGlyph[]) => unknown;
    /** 異常終了時のコールバック関数 */
    failCallback?: (error: unknown) => unknown;
    /** 正常完了時・異常終了時のコールバック関数 */
    alwaysCallback?: (value: unknown) => unknown;
  }

  interface RenderedGlyph {
    readonly url: string;
    readonly token: string;
    readonly line: number;
    readonly softLine?: number;
    readonly available: boolean;
    readonly isFallback: boolean;
    readonly jibo?: string;
    readonly x?: number;
    readonly y?: number;
    readonly width?: number;
    readonly height?: number;
  }

  interface RenderResult {
    /** 入力テキスト */
    text: string;
    /** getTextImageFromTextPromise呼び出し時に指定されたオプション */
    opt: RenderOptions;
    /** 古活字画像等情報列 */
    result: readonly RenderedGlyph[];
  }

  interface SoanInstance {
    getTextImageFromText(text: string, opt?: RenderOptions): void;
    getTextImageFromTextPromise(text: string, opt?: RenderOptions): Promise<RenderResult>;
    getBlobWithXMPFromCanvasPromise(canvas: CanvasLike): Promise<Blob>;
    getBufferWithXMPFromCanvasPromise?(canvas: CanvasLike): Promise<Buffer>;
  }
}
