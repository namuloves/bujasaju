'use client';

/**
 * Top5FacesRow — 결과 화면 상단의 비슷한 사주 부자 Top3 row.
 *
 * 디자인:
 *   - 가로로 한 줄에 한 명 (얼굴 + 이름·국가·회사·간단 소개)
 *   - 행 전체가 /profile/[id] 로 이동하는 링크
 *   - 첫 번째 자리는 한국 부자 우선 (pickTop3WithKorean)
 */

import Link from 'next/link';
import type { EnrichedPerson } from '@/lib/saju/types';
import { useLanguage } from '@/lib/i18n';
import { industryToKorean } from '@/components/FilterPanel';

const USD_TO_KRW = 1480.71;
function formatWorthKo(netWorthB: number): string {
  const eok = netWorthB * 10 * USD_TO_KRW;
  const jo = eok / 10000;
  if (jo >= 1) return `${jo >= 10 ? Math.round(jo) : jo.toFixed(1)}조`;
  return `${Math.round(eok).toLocaleString('ko-KR')}억`;
}

const NATIONALITY_KO: Record<string, string> = {
  US: '미국', KR: '한국', CN: '중국', JP: '일본', IN: '인도', FR: '프랑스',
  DE: '독일', GB: '영국', RU: '러시아', BR: '브라질', CA: '캐나다',
  AE: 'UAE', SA: '사우디', SE: '스웨덴', AU: '호주', IT: '이탈리아',
  ES: '스페인', NL: '네덜란드', CH: '스위스', SG: '싱가포르', HK: '홍콩',
  TW: '대만', TH: '태국', MX: '멕시코', AR: '아르헨티나', NO: '노르웨이',
  ID: '인도네시아', PH: '필리핀', MY: '말레이시아', VN: '베트남',
  CZ: '체코', PL: '폴란드', AT: '오스트리아', BE: '벨기에', DK: '덴마크',
  FI: '핀란드', GR: '그리스', IE: '아일랜드', PT: '포르투갈', TR: '터키',
  ZA: '남아공', NG: '나이지리아', EG: '이집트', IL: '이스라엘',
  CL: '칠레', CO: '콜롬비아', PE: '페루', VE: '베네수엘라',
};

function nationalityKo(code: string | undefined, lang: string): string {
  if (!code) return '';
  if (lang !== 'ko') return code;
  return NATIONALITY_KO[code] || code;
}

function normalizePhoto(url: string | undefined | null, name: string): string {
  if (!url) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=random&bold=true`;
  }
  let normalized = url;
  if (normalized.startsWith('//')) normalized = `https:${normalized}`;
  if (normalized.startsWith('http://')) normalized = normalized.replace(/^http:/, 'https:');
  if (normalized.includes('upload.wikimedia.org/')) {
    return `/api/wiki-image?url=${encodeURIComponent(normalized)}`;
  }
  return normalized;
}

interface Props {
  people: EnrichedPerson[];
  /** Optional — when set, the matching row is highlighted (e.g. the featured
   *  person on the same page). Clicking always navigates to /profile/[id]. */
  selectedId?: string | null;
}

/**
 * Sort a Korean billionaire to position 1 if one exists in the match list.
 * Falls through to the natural match order otherwise. Returns up to 3.
 */
export function pickTop3WithKorean(people: EnrichedPerson[]): EnrichedPerson[] {
  if (people.length === 0) return [];
  const koreanIdx = people.findIndex((p) => p.nationality === 'KR');
  if (koreanIdx <= 0) return people.slice(0, 3);
  const korean = people[koreanIdx];
  const rest = people.filter((_, i) => i !== koreanIdx);
  return [korean, ...rest].slice(0, 3);
}

/** Industry label → short Korean noun phrase, used in the "how they made
 *  their money" line under each Top3 row. */
const INDUSTRY_KO_NOUN: Record<string, string> = {
  Technology: '기술',
  Automotive: '자동차',
  Energy: '에너지',
  Healthcare: '헬스케어',
  Pharmaceuticals: '제약',
  'Real estate': '부동산',
  Manufacturing: '제조업',
  Retail: '유통',
  'Fashion & Retail': '패션·유통',
  'Media & Entertainment': '미디어·엔터',
  Media: '미디어',
  Finance: '금융',
  'Financial services': '금융',
  Banking: '은행',
  'Hedge funds': '헤지펀드',
  'Private equity': '사모펀드',
  Investments: '투자',
  Diversified: '복합 기업',
  Food: '식품',
  'Food & Beverage': '식음료',
  Construction: '건설',
  Logistics: '물류',
  Shipping: '해운',
  Mining: '광업',
  Chemicals: '화학',
  Telecom: '통신',
  Gaming: '게임',
  Fintech: '핀테크',
  Insurance: '보험',
  Semiconductors: '반도체',
  Software: '소프트웨어',
  Restaurant: '외식업',
  'Service': '서비스업',
};

function industryNounKo(industry: string | undefined | null): string {
  if (!industry) return '';
  const key = Object.keys(INDUSTRY_KO_NOUN).find(
    (k) => k.toLowerCase() === industry.trim().toLowerCase(),
  );
  return key ? INDUSTRY_KO_NOUN[key] : industry;
}

/**
 * Pick the right Korean object marker (을 / 를) for a noun ending in either
 * a Korean syllable with/without batchim, or a Latin letter / digit. For
 * Latin endings we fall back to a phonetic guess: consonant ending → 을,
 * vowel ending → 를. Good enough for company names like "SK", "Tesla".
 */
function objectParticle(noun: string): '을' | '를' {
  const last = noun.trim().slice(-1);
  if (!last) return '를';
  const code = last.charCodeAt(0);
  // Korean syllable block: 가(0xAC00) - 힣(0xD7A3). Batchim test:
  // (code - 0xAC00) % 28 !== 0 → has final consonant → 을.
  if (code >= 0xac00 && code <= 0xd7a3) {
    return (code - 0xac00) % 28 !== 0 ? '을' : '를';
  }
  // Digit: treat as Korean reading of the number, e.g. "3" → "삼" (consonant) → 을.
  if (/[0-9]/.test(last)) return '을';
  // Latin letter: rough phonetic heuristic.
  if (/[a-zA-Z]/.test(last)) {
    return /[aeiouy]/i.test(last) ? '를' : '을';
  }
  return '를';
}

/**
 * Pull a clean short company name out of the raw `company` field.
 * Returns '' when the field is missing, too long, or a sentence-shaped
 * bio leak ("정몽구는 한국 2위 재벌인 현대자동차…").
 */
function cleanCompanyName(raw: string | undefined | null): string {
  if (!raw) return '';
  const s = raw.trim();
  if (s.length === 0 || s.length > 14) return '';
  // Any sentence punctuation = it's a sentence, not a brand name.
  if (/[.,;:]|Daughter|son of|sister|brother/i.test(s)) return '';
  return s;
}

/**
 * Drop the middle token(s) from a name with 3+ space-separated parts so
 * Western "First Middle Last" displays as "First Last" (e.g. "노먼 머리
 * 에드워즈" → "노먼 에드워즈", "윌리엄 헨리 게이츠 3세" → "윌리엄 게이츠 3세").
 *
 * Korean / Chinese / Japanese names are typically one token (성+이름 written
 * without a space), so they pass through unchanged. 2-token names also
 * unchanged — those are usually a clean First + Last already.
 */
function dropMiddleNames(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 3) return name;
  // Preserve trailing numerals / suffixes like "3세", "Jr", "II" by keeping
  // them with the last name token. Anything that's clearly a name-like
  // token stays where it is.
  const last = parts[parts.length - 1];
  // If the last token is a suffix and we have at least 3 parts, keep the
  // real surname (the one before the suffix).
  const SUFFIX_RE = /^(3세|2세|Jr\.?|II|III|IV)$/i;
  if (SUFFIX_RE.test(last) && parts.length >= 3) {
    return `${parts[0]} ${parts[parts.length - 2]} ${last}`;
  }
  return `${parts[0]} ${last}`;
}

/**
 * Build the small meta line shown under the name: "한국 · 호텔신라" style.
 * `company` is preferred when it's clean; otherwise we fall back to the
 * Korean industry label so the row never leaks long bio text into the
 * place where a brand should be.
 */
function metaLineKo(person: EnrichedPerson, lang: string): string {
  const country = nationalityKo(person.nationality, lang);
  const company = cleanCompanyName(person.company);
  const industryKo = lang === 'ko' ? industryToKorean(person.industry) : person.industry;
  const tag = company || industryKo || '';
  return [country, tag].filter(Boolean).join(' · ');
}

/**
 * Take a bio paragraph and trim it down to one or two sentences fit for
 * a Top3 row. Returns '' when the source text isn't suitable (empty, or
 * mostly English when we'd be showing Korean copy).
 */
function trimBioForRow(text: string | undefined | null, requireKorean: boolean): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length < 8) return '';

  if (requireKorean) {
    // Two checks together:
    //   1) Enough absolute Hangul to be a real Korean sentence.
    //   2) The Korean is the *dominant* script — bail if Latin letters
    //      outweigh Hangul, since that means the bio is mostly English
    //      with a few Korean tokens (e.g. company names).
    const hangulCount = (trimmed.match(/[가-힣]/g) || []).length;
    const latinCount = (trimmed.match(/[A-Za-z]/g) || []).length;
    if (hangulCount < 8) return '';
    if (latinCount > hangulCount) return '';
  }

  // Stitch the first few sentences when available. Cap at ~300 chars so
  // the row stays readable on mobile without truncating mid-sentence
  // for the typical 2-sentence bio.
  const parts = trimmed.match(/[^.!?。！？]+[.!?。！？]?/g) ?? [trimmed];
  let out = parts.slice(0, 3).join('').trim();
  if (out.length > 300) out = out.slice(0, 298).trimEnd() + '…';
  return out;
}

/**
 * "How they made their money" — prefer the real biography (bioKo first,
 * then bio) so the row reflects ground truth. Fall back to a generated
 * sentence built from industry / company only when the bio is unusable.
 */
function wealthStoryKo(person: EnrichedPerson, lang: string): string {
  if (lang !== 'ko') return '';

  // 1) Korean bio — most informative, no translation gymnastics.
  const fromBioKo = trimBioForRow(person.bioKo, true);
  if (fromBioKo) return fromBioKo;

  // 2) Some records (e.g. 이명희) park Korean copy in the English `bio`
  //    field instead of `bioKo`. Reuse it if it's actually Korean.
  const fromBio = trimBioForRow(person.bio, true);
  if (fromBio) return fromBio;

  // 3) Generic, fact-light fallback. Keep it neutral — we don't trust
  //    `wealthOrigin` enough to make self-made / inherited claims here.
  const industry = industryNounKo(person.industry);
  const co = cleanCompanyName(person.company);

  const coObj = co ? `${co}${objectParticle(co)}` : '';

  // Neutral fallback — describe the industry / company without claiming
  // self-made vs inherited. `wealthOrigin` in the dataset is unreliable
  // (e.g. 이명희 marked self-made though she inherited Samsung lineage),
  // so we say less rather than say it wrong.
  if (co && industry)
    return `${coObj} 중심으로 ${industry} 분야에서 활약하는 부자. 구체적인 부의 형성 과정은 상세 프로필을 참고하세요.`;
  if (co)
    return `${co} 관련 사업으로 부를 일군 부자. 자세한 내용은 상세 프로필을 참고하세요.`;
  if (industry)
    return `${industry} 분야에서 활약하는 부자. 자세한 내용은 상세 프로필을 참고하세요.`;
  return '큰 자산을 일군 부자. 자세한 내용은 상세 프로필을 참고하세요.';
}

export default function Top5FacesRow({ people, selectedId }: Props) {
  const { lang } = useLanguage();
  const top3 = pickTop3WithKorean(people);

  if (top3.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2 max-w-xl mx-auto">
      {top3.map((person) => {
        const isActive = selectedId != null && person.id === selectedId;
        const displayName = dropMiddleNames(
          lang === 'ko' ? (person.nameKo || person.name) : person.name,
        );
        const meta = metaLineKo(person, lang);
        const blurb = wealthStoryKo(person, lang);

        return (
          <li key={person.id}>
            <Link
              href={`/profile/${person.id}`}
              className={`block w-full flex items-start gap-3 text-left px-3 py-2.5 rounded-xl transition-colors ${
                isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
            >
              <div className="relative shrink-0 w-14 h-14 sm:w-16 sm:h-16">
                <div className="w-full h-full rounded-full overflow-hidden bg-gray-200">
                  <img
                    src={normalizePhoto(person.photoUrl, person.name)}
                    alt={person.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&size=200&background=random&bold=true`;
                    }}
                  />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {displayName}
                  </p>
                  <p className="text-xs font-bold text-gray-900 shrink-0">
                    {formatWorthKo(person.netWorth)}
                  </p>
                </div>
                <p className="text-[11px] text-gray-500 truncate mt-0.5">
                  {meta}
                </p>
                {blurb && (
                  <p className="text-[12px] text-gray-600 leading-snug mt-1 line-clamp-6">
                    {blurb}
                  </p>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
