import type { BoundaryDirective, ParsedExtendedText, ProDirective } from './types.js';

const FULL_WIDTH_OPEN = '［';
const FULL_WIDTH_CLOSE = '］';

/**
 * Professional notation keeps ［字母］ and ［IDn］ inside the render text. The
 * rendering engine registers those bracket forms as dictionary keys, so a
 * directive is resolved by ordinary tokenization instead of by character
 * position. Multi-jibo tokens such as ［八良］ therefore stay a single token and
 * keep renmen (連綿) selection available.
 *
 * The parser only reports what the text contains, for metadata and validation.
 */
function parseDirective(raw: string, position: number): ProDirective {
  const trimmed = raw.trim();
  if (trimmed === '') {
    throw new Error('Professional directive must not be empty');
  }

  const idMatch = trimmed.normalize('NFKC').match(/^(?:ID)?(\d+)$/i);
  if (idMatch !== null) {
    return {
      kind: 'id',
      position,
      raw,
      id: Number.parseInt(idMatch[1], 10),
    };
  }

  return {
    kind: 'jibo',
    position,
    raw,
    jibo: trimmed,
  };
}

/**
 * Normalizes a directive to the dictionary key the engine builds:
 * ［4867］ and ［ID4867］ both address glyph image ID 4867.
 */
export function directiveDictionaryKey(directive: ProDirective): string {
  return directive.kind === 'id'
    ? `${FULL_WIDTH_OPEN}ID${directive.id}${FULL_WIDTH_CLOSE}`
    : `${FULL_WIDTH_OPEN}${directive.jibo}${FULL_WIDTH_CLOSE}`;
}

export function parseExtendedText(sourceText: string): ParsedExtendedText {
  const renderChars: string[] = [];
  const directives: ProDirective[] = [];
  const boundaries: BoundaryDirective[] = [];
  // Glyph position counts a bracket token as one glyph, and a boundary marker
  // as none, so positions line up with the rendered glyph sequence.
  let glyphCount = 0;

  const source = Array.from(sourceText);
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    // Half-width / marks a morphological boundary and is not rendered.
    // Full-width ／ is literal text.
    if (char === '/') {
      boundaries.push({ position: glyphCount });
      renderChars.push(char);
      continue;
    }

    if (char === FULL_WIDTH_OPEN) {
      const closeIndex = source.indexOf(FULL_WIDTH_CLOSE, index + 1);
      if (closeIndex === -1) {
        // Treat an unmatched bracket as ordinary text. This keeps the CLI
        // forgiving for historical text transcription where brackets can be
        // copied incompletely during editing.
        renderChars.push(char);
        glyphCount += 1;
        continue;
      }

      const raw = source.slice(index + 1, closeIndex).join('');
      const directive = parseDirective(raw, glyphCount);
      directives.push(directive);
      renderChars.push(directiveDictionaryKey(directive));
      glyphCount += 1;
      index = closeIndex;
      continue;
    }

    renderChars.push(char);
    if (char !== '\n') {
      glyphCount += 1;
    }
  }

  return {
    sourceText,
    renderText: renderChars.join(''),
    glyphCount,
    directives,
    boundaries,
  };
}
