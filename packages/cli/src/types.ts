export interface DatasetConfig {
  url: string;
  priority?: number;
}

export type OutputFormat = 'jpeg' | 'png';
export type MorphologyMode = 'modern' | 'old-japanese';

export interface ProDirectiveBase {
  readonly position: number;
  readonly raw: string;
}

export interface JiboDirective extends ProDirectiveBase {
  readonly kind: 'jibo';
  readonly jibo: string;
}

export interface IdDirective extends ProDirectiveBase {
  readonly kind: 'id';
  readonly id: number;
}

export type ProDirective = JiboDirective | IdDirective;

export interface BoundaryDirective {
  readonly position: number;
}

export interface MorphologyToken {
  readonly line: number;
  readonly surface: string;
  readonly reading: string;
  readonly lemma: string;
  readonly pos: string;
}

export interface ManualPosition {
  readonly position: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

export interface ParsedExtendedText {
  readonly sourceText: string;
  readonly renderText: string;
  readonly directives: readonly ProDirective[];
  readonly boundaries: readonly BoundaryDirective[];
}

export interface SoanConfig {
  datasets: readonly DatasetConfig[];
  allowUnavailableChar: boolean;
  renmenPriority: number;
  charsPerLine: number;
  lineGap: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  height: 'auto' | 'fit';
  pageWidth?: number;
  pageHeight?: number;
  numLines?: number;
  charSpacing: number;
  lineSpacing: number;
  morphologyMode: MorphologyMode;
  morphologyEngine: 'kuromoji' | 'mecab-unidic-chuko' | 'surface-preserving';
  mecabDictionaryPath?: string;
  mecabCommand?: string;
  manualPositions?: readonly ManualPosition[];
  fontFamily: string;
  fontColor: string;
  scale: number;
  paperTexture: string;
  white: string;
  black: string;
}

export interface CliOptions extends SoanConfig {
  text: string;
  output?: string;
  metadataOutput?: string;
  force: boolean;
  gamma: number;
  seed?: number;
  generatedAt: string;
  manualPositions: readonly ManualPosition[];
  format: OutputFormat;
  quality: number;
}

export interface GenerationMetadata {
  readonly engine: 'soan-v1.1.0-compat';
  readonly professionalSlice: true;
  readonly sourceText: string;
  readonly renderText: string;
  readonly seed?: number;
  readonly gamma: number;
  readonly format: OutputFormat;
  readonly directives: readonly ProDirective[];
  readonly boundaries: readonly BoundaryDirective[];
  readonly renderedGlyphs?: readonly SoanRenderedGlyph[];
  readonly selectedGlyphs?: readonly SelectedGlyphMetadata[];
  readonly morphologyTokens?: readonly MorphologyToken[];
  readonly manualPositions?: readonly ManualPosition[];
  readonly image?: ImageMetadata;
  readonly xmp: XmpMetadata;
  readonly soanConfig: SoanConfig;
  readonly generatedAt: string;
}

export interface CanvasLike {
  readonly width?: number;
  readonly height?: number;
  toBuffer(mimeType?: string, config?: unknown): Buffer;
}

export interface SoanRenderedGlyph {
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

export interface SelectedGlyphMetadata extends SoanRenderedGlyph {
  readonly position: number;
  readonly glyphId?: number;
}

export interface ImageMetadata {
  readonly width: number;
  readonly height: number;
}

export interface XmpMetadata {
  readonly embedded: boolean;
  readonly mode?: 'full' | 'compact';
  readonly reason?: string;
}

export interface SoanRenderOptions {
  canvas: CanvasLike;
  outputPath?: string;
  force: boolean;
  renmenPriority?: number;
  numLines?: number;
  charSpacing?: number;
  lineSpacing?: number;
  morphologyMode?: MorphologyMode;
  professionalMorphologyTokens?: readonly MorphologyToken[];
  pageWidth?: number;
  pageHeight?: number;
  manualPositions?: readonly ManualPosition[];
  professionalDirectives?: readonly ProDirective[];
  professionalBoundaries?: readonly BoundaryDirective[];
}

export interface SoanRenderResult {
  text: string;
  opt: {
    canvas: CanvasLike;
    outputPath?: string;
    force?: boolean;
  };
  result: SoanRenderedGlyph[];
}

export interface SoanInstance {
  getTextImageFromTextPromise(text: string, opt: SoanRenderOptions): Promise<SoanRenderResult>;
  getBufferWithXMPFromCanvasPromise?(canvas: CanvasLike): Promise<Buffer>;
}

export type SoanFactory = (config: SoanConfig) => SoanInstance | undefined;
