import type { BoundaryDirective, ParsedExtendedText, ProDirective } from './types.js';

const FULL_WIDTH_OPEN = '［';
const FULL_WIDTH_CLOSE = '］';
const ID_PLACEHOLDER_RENDER_CHAR = 'N';

const JIBO_TO_KANA = new Map<string, string>([
  ['安', 'あ'],
  ['阿', 'あ'],
  ['愛', 'あ'],
  ['以', 'い'],
  ['伊', 'い'],
  ['意', 'い'],
  ['移', 'い'],
  ['宇', 'う'],
  ['有', 'う'],
  ['雲', 'う'],
  ['憂', 'う'],
  ['衣', 'え'],
  ['江', 'え'],
  ['盈', 'え'],
  ['得', 'え'],
  ['於', 'お'],
  ['御', 'お'],
  ['加', 'か'],
  ['可', 'か'],
  ['佳', 'か'],
  ['賀', 'か'],
  ['閑', 'か'],
  ['香', 'か'],
  ['幾', 'き'],
  ['支', 'き'],
  ['起', 'き'],
  ['喜', 'き'],
  ['久', 'く'],
  ['具', 'く'],
  ['求', 'く'],
  ['九', 'く'],
  ['計', 'け'],
  ['介', 'け'],
  ['遣', 'け'],
  ['希', 'け'],
  ['己', 'こ'],
  ['古', 'こ'],
  ['故', 'こ'],
  ['許', 'こ'],
  ['左', 'さ'],
  ['佐', 'さ'],
  ['散', 'さ'],
  ['之', 'し'],
  ['志', 'し'],
  ['新', 'し'],
  ['事', 'し'],
  ['寸', 'す'],
  ['春', 'す'],
  ['須', 'す'],
  ['數', 'す'],
  ['世', 'せ'],
  ['勢', 'せ'],
  ['聲', 'せ'],
  ['曽', 'そ'],
  ['楚', 'そ'],
  ['所', 'そ'],
  ['太', 'た'],
  ['多', 'た'],
  ['堂', 'た'],
  ['當', 'た'],
  ['知', 'ち'],
  ['千', 'ち'],
  ['地', 'ち'],
  ['川', 'つ'],
  ['徒', 'つ'],
  ['都', 'つ'],
  ['津', 'つ'],
  ['天', 'て'],
  ['帝', 'て'],
  ['亭', 'て'],
  ['傳', 'て'],
  ['止', 'と'],
  ['登', 'と'],
  ['東', 'と'],
  ['度', 'と'],
  ['等', 'と'],
  ['奈', 'な'],
  ['那', 'な'],
  ['難', 'な'],
  ['南', 'な'],
  ['仁', 'に'],
  ['尓', 'に'],
  ['爾', 'に'],
  ['奴', 'ぬ'],
  ['努', 'ぬ'],
  ['祢', 'ね'],
  ['年', 'ね'],
  ['音', 'ね'],
  ['根', 'ね'],
  ['乃', 'の'],
  ['能', 'の'],
  ['農', 'の'],
  ['八', 'は'],
  ['盤', 'は'],
  ['者', 'は'],
  ['波', 'は'],
  ['半', 'は'],
  ['比', 'ひ'],
  ['悲', 'ひ'],
  ['飛', 'ひ'],
  ['非', 'ひ'],
  ['不', 'ふ'],
  ['婦', 'ふ'],
  ['布', 'ふ'],
  ['風', 'ふ'],
  ['部', 'へ'],
  ['倍', 'へ'],
  ['遍', 'へ'],
  ['弊', 'へ'],
  ['邊', 'へ'],
  ['辺', 'へ'],
  ['保', 'ほ'],
  ['本', 'ほ'],
  ['奉', 'ほ'],
  ['末', 'ま'],
  ['万', 'ま'],
  ['萬', 'ま'],
  ['満', 'ま'],
  ['美', 'み'],
  ['三', 'み'],
  ['見', 'み'],
  ['身', 'み'],
  ['武', 'む'],
  ['無', 'む'],
  ['牟', 'む'],
  ['舞', 'む'],
  ['女', 'め'],
  ['免', 'め'],
  ['面', 'め'],
  ['毛', 'も'],
  ['裳', 'も'],
  ['母', 'も'],
  ['茂', 'も'],
  ['也', 'や'],
  ['屋', 'や'],
  ['耶', 'や'],
  ['由', 'ゆ'],
  ['遊', 'ゆ'],
  ['与', 'よ'],
  ['餘', 'よ'],
  ['余', 'よ'],
  ['夜', 'よ'],
  ['良', 'ら'],
  ['羅', 'ら'],
  ['蘭', 'ら'],
  ['利', 'り'],
  ['里', 'り'],
  ['梨', 'り'],
  ['理', 'り'],
  ['留', 'る'],
  ['流', 'る'],
  ['類', 'る'],
  ['礼', 'れ'],
  ['連', 'れ'],
  ['麗', 'れ'],
  ['呂', 'ろ'],
  ['路', 'ろ'],
  ['露', 'ろ'],
  ['和', 'わ'],
  ['王', 'わ'],
  ['倭', 'わ'],
  ['為', 'ゐ'],
  ['井', 'ゐ'],
  ['居', 'ゐ'],
  ['恵', 'ゑ'],
  ['惠', 'ゑ'],
  ['衛', 'ゑ'],
  ['遠', 'を'],
  ['越', 'を'],
  ['乎', 'を'],
  ['尾', 'を'],
  ['无', 'ん'],
]);

function postfixDirectivePosition(renderTextLength: number): number {
  // Historical CLI builds accepted a postfix shorthand:
  //   か［加］ -> directive for render position 0.
  // Keep that form for compatibility, while the Professional notation from
  // the reference service is handled as an inline replacement below.
  return Math.max(0, renderTextLength - 1);
}

function parseDirective(raw: string, position: number): ProDirective {
  const trimmed = raw.trim().normalize('NFKC');
  if (trimmed === '') {
    throw new Error('Professional directive must not be empty');
  }

  const idMatch = trimmed.match(/^(?:ID)?(\d+)$/i);
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

function isIdDirectiveRaw(raw: string): boolean {
  return /^(?:ID)?\d+$/i.test(raw.trim().normalize('NFKC'));
}

function renderTextFromJibo(jibo: string): string {
  const kana = Array.from(jibo).map((sourceCharacter) => {
    const mapped = JIBO_TO_KANA.get(sourceCharacter);
    if (mapped === undefined) {
      throw new Error(`Cannot infer render text from Professional jibo: ${sourceCharacter}`);
    }
    return mapped;
  });
  return kana.join('');
}

export function parseExtendedText(sourceText: string): ParsedExtendedText {
  const renderChars: string[] = [];
  const directives: ProDirective[] = [];
  const boundaries: BoundaryDirective[] = [];
  const directivePositions = new Set<number>();
  let previousTokenWasDirective = false;

  for (let index = 0; index < sourceText.length; index += 1) {
    const char = sourceText[index];

    if (char === '/') {
      boundaries.push({ position: renderChars.length });
      previousTokenWasDirective = false;
      continue;
    }

    if (char === FULL_WIDTH_OPEN) {
      const closeIndex = sourceText.indexOf(FULL_WIDTH_CLOSE, index + 1);
      if (closeIndex === -1) {
        // Treat an unmatched bracket as ordinary text. This keeps the CLI
        // forgiving for historical text transcription where brackets can be
        // copied incompletely during editing.
        renderChars.push(char);
        previousTokenWasDirective = false;
        continue;
      }

      const raw = sourceText.slice(index + 1, closeIndex);
      const isPrefixDirective = renderChars.length === 0 || previousTokenWasDirective;
      const expansion = isPrefixDirective
        ? isIdDirectiveRaw(raw)
          ? ID_PLACEHOLDER_RENDER_CHAR
          : renderTextFromJibo(raw.trim().normalize('NFKC'))
        : '';
      const position = isPrefixDirective
        ? renderChars.length
        : postfixDirectivePosition(renderChars.length);
      if (directivePositions.has(position)) {
        throw new Error(
          `Only one Professional directive can be attached to render position ${position}`,
        );
      }
      directives.push(parseDirective(raw, position));
      directivePositions.add(position);
      renderChars.push(...Array.from(expansion));
      index = closeIndex;
      previousTokenWasDirective = true;
      continue;
    }

    renderChars.push(char);
    previousTokenWasDirective = false;
  }

  return {
    sourceText,
    renderText: renderChars.join(''),
    directives,
    boundaries,
  };
}
