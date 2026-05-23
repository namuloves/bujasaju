/**
 * Strip parenthetical 격국 / 사주 jargon asides from LLM-generated summary
 * text.
 *
 * The Claude prompt sometimes returns prose with bracketed explanations
 * like "(정관격의 품위와 예의 바름을 지닌)" or "(편재격 특유의 외부 자원
 * 활용)" sprinkled inline. These read as AI-generated footnotes and
 * interrupt the flow for non-사주 readers, so we strip them at render time.
 *
 * Rules (intentionally conservative — don't touch parentheses that carry
 * useful meaning):
 *   1. Inside a (…) group, look for the trailing word being a 격 / 격국
 *      term like "정관격", "편재격", "식신격", "상관격", "비견", "겁재",
 *      "정인", "편인", "정관", "편관" + a descriptor.
 *   2. Empty parens left over after the strip get collapsed.
 *   3. Doubled spaces and lonely punctuation get tidied.
 *
 * We do NOT touch:
 *   - Parens that contain only a number / unit ("(3.7조 원)")
 *   - Parens that contain a name or year ("(이병철 회장)")
 *   - Quoted text inside parens
 */

const GYEOKGUK_HINTS = [
  '격국',
  '정관격', '편관격', '정인격', '편인격', '정재격', '편재격',
  '식신격', '상관격', '비견격', '겁재격',
  '건록격', '양인격', '록겁격',
  '신왕', '신약',
];

/**
 * Phrases that lead with a 격국 keyword and continue with an attributive
 * clause. We drop the whole clause through to its closing punctuation /
 * verb tail, then tidy up. Examples:
 *   "정관격의 품위와 예의 바름을 지닌" → ""
 *   "상관격으로 인해 기존 틀을 깨고" → ""
 *   "정관격 특유의 안정감" → ""
 */
const JARGON_CLAUSE = /(정관격|편관격|정인격|편인격|정재격|편재격|식신격|상관격|비견격|겁재격|건록격|양인격|록겁격|격국)(의|으로|에서|이|은|는|을|를|와|과|이라|라|에)?(?:[^.,;!?\n]{0,40}?(지닌|가진|특유의|영향으로|영향을|특성으로|덕분에))?/g;

export function sanitizeSummaryText(input: string): string {
  if (!input) return input;
  let out = input;

  // 1) Strip parens whose contents mention 격국 / 격 / 신왕 etc.
  out = out.replace(/\s*\(([^()]+)\)/g, (full, inside: string) => {
    const text = inside.trim();
    if (!text) return ''; // collapse empty parens too
    const hasJargon = GYEOKGUK_HINTS.some((kw) => text.includes(kw));
    return hasJargon ? '' : full;
  });

  // 2) Strip standalone jargon clauses outside of parens. Aggressive — the
  //    LLM has been told not to use these words but sometimes still does.
  //    Replacement is empty + later whitespace collapse cleans up.
  out = out.replace(JARGON_CLAUSE, '');

  // 3) Tidy: collapse runs of spaces, strip space before punctuation,
  //    collapse double periods, drop leading "," or "." that may now be
  //    floating at sentence start.
  out = out.replace(/ {2,}/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/([.])\s*\./g, '$1')
    .replace(/(^|[.!?]\s+)[,]\s*/g, '$1');

  return out.trim();
}
