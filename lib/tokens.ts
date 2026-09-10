// Output-size measurement shared by the chunker and the toolbar counter.
// chars uses JS string length (UTF-16 units) so the budget chunks are packed
// against and the readout the user sees are the same number.
export interface OutputMeasure {
  chars: number;
  tokens: number;
}

// Script ranges whose characters compress to roughly one token each in common
// tokenizers; Latin scripts average nearer four characters per token.
const CJK_RANGES: readonly (readonly [number, number])[] = [
  [0x1100, 0x11ff], // Hangul Jamo
  [0x3000, 0x303f], // CJK symbols and punctuation
  [0x3040, 0x30ff], // Hiragana + Katakana
  [0x3130, 0x318f], // Hangul compatibility jamo
  [0x3400, 0x4dbf], // CJK ideographs, extension A
  [0x4e00, 0x9fff], // CJK unified ideographs
  [0xac00, 0xd7a3], // Hangul syllables
  [0xf900, 0xfaff], // CJK compatibility ideographs
  [0xff00, 0xffef], // halfwidth and fullwidth forms
  [0x20000, 0x2fa1f], // CJK ideographs, extensions B and beyond
];

function isCjkCodePoint(cp: number): boolean {
  return CJK_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi);
}

// Rough token estimate: one token per CJK character, one per ~4 others. Good
// enough to eyeball whether an output fits a target chatbot or agent; the
// chunk budget itself is enforced in exact characters, never in tokens.
export function estimateTokens(text: string): number {
  let cjk = 0;
  let other = 0;
  // Iterating code points (not UTF-16 indices) counts astral-plane chars
  // once; each yielded string holds exactly one code point, never empty.
  for (const ch of text) {
    if (isCjkCodePoint(ch.codePointAt(0)!)) cjk++;
    else other++;
  }
  return cjk + Math.ceil(other / 4);
}

export function measureOutput(text: string): OutputMeasure {
  return { chars: text.length, tokens: estimateTokens(text) };
}
