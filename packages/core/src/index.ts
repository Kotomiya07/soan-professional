export interface PageLayoutOptions {
  readonly pageWidth?: number;
  readonly pageHeight?: number;
}

export interface ManualPosition {
  readonly position: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

export interface MorphologyToken {
  readonly line: number;
  readonly surface: string;
  readonly reading: string;
  readonly lemma: string;
  readonly pos: string;
}

export function normalizePageLayout(options: PageLayoutOptions): PageLayoutOptions {
  const normalized: { pageWidth?: number; pageHeight?: number } = {};
  if (options.pageWidth !== undefined) {
    if (!Number.isFinite(options.pageWidth) || options.pageWidth < 1) {
      throw new Error(`pageWidth must be at least 1: ${options.pageWidth}`);
    }
    normalized.pageWidth = Math.trunc(options.pageWidth);
  }
  if (options.pageHeight !== undefined) {
    if (!Number.isFinite(options.pageHeight) || options.pageHeight < 1) {
      throw new Error(`pageHeight must be at least 1: ${options.pageHeight}`);
    }
    normalized.pageHeight = Math.trunc(options.pageHeight);
  }
  return normalized;
}

export function normalizeManualPositions(positions: readonly ManualPosition[]): readonly ManualPosition[] {
  return positions.map((position, index) => {
    if (!Number.isInteger(position.position) || position.position < 0) {
      throw new Error(`manual position ${index} has invalid position: ${position.position}`);
    }
    if (!Number.isFinite(position.offsetX) || !Number.isFinite(position.offsetY)) {
      throw new Error(`manual position ${index} must contain finite offsets`);
    }
    return {
      position: position.position,
      offsetX: position.offsetX,
      offsetY: position.offsetY,
    };
  });
}

export function normalizeMorphologyTokens(tokens: readonly MorphologyToken[]): readonly MorphologyToken[] {
  return tokens.map((token, index) => {
    if (token.surface === '') {
      throw new Error(`morphology token ${index} has an empty surface`);
    }
    return {
      line: token.line,
      surface: token.surface,
      reading: token.reading === '' ? token.surface : token.reading,
      lemma: token.lemma === '' ? token.surface : token.lemma,
      pos: token.pos === '' ? '古文' : token.pos,
    };
  });
}
