import type { BoundaryDirective, ParsedExtendedText, ProDirective } from './types.js';

const FULL_WIDTH_OPEN = '［';
const FULL_WIDTH_CLOSE = '］';

function directivePosition(renderTextLength: number): number {
  // Pro notation is written after the character it modifies:
  //   か［加］ -> directive for render position 0.
  // When users put a directive before text, keep it attached to the next
  // character position so the metadata remains useful instead of dropping it.
  return Math.max(0, renderTextLength - 1);
}

function parseDirective(raw: string, position: number): ProDirective {
  const trimmed = raw.trim().normalize('NFKC');
  if (trimmed === '') {
    throw new Error('Professional directive must not be empty');
  }

  if (/^\d+$/.test(trimmed)) {
    return {
      kind: 'id',
      position,
      raw,
      id: Number.parseInt(trimmed, 10),
    };
  }

  return {
    kind: 'jibo',
    position,
    raw,
    jibo: trimmed,
  };
}

export function parseExtendedText(sourceText: string): ParsedExtendedText {
  const renderChars: string[] = [];
  const directives: ProDirective[] = [];
  const boundaries: BoundaryDirective[] = [];
  const directivePositions = new Set<number>();

  for (let index = 0; index < sourceText.length; index += 1) {
    const char = sourceText[index];

    if (char === '/') {
      boundaries.push({ position: renderChars.length });
      continue;
    }

    if (char === FULL_WIDTH_OPEN) {
      const closeIndex = sourceText.indexOf(FULL_WIDTH_CLOSE, index + 1);
      if (closeIndex === -1) {
        // Treat an unmatched bracket as ordinary text. This keeps the CLI
        // forgiving for historical text transcription where brackets can be
        // copied incompletely during editing.
        renderChars.push(char);
        continue;
      }

      const raw = sourceText.slice(index + 1, closeIndex);
      const position = directivePosition(renderChars.length);
      if (directivePositions.has(position)) {
        throw new Error(
          `Only one Professional directive can be attached to render position ${position}`,
        );
      }
      directives.push(parseDirective(raw, position));
      directivePositions.add(position);
      index = closeIndex;
      continue;
    }

    renderChars.push(char);
  }

  return {
    sourceText,
    renderText: renderChars.join(''),
    directives,
    boundaries,
  };
}
