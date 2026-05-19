'use client';

/**
 * Top5FacesRow — 결과 화면 상단의 비슷한 사주 부자 Top3 row.
 *
 * 디자인:
 *   - 가로로 한 줄에 한 명 (얼굴 + 이름·국가·회사·간단 소개)
 *   - 행 전체가 /profile/[id] 로 이동하는 링크
 *   - 첫 번째 자리는 한국 부자 우선 (pickTop3WithKorean)
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { EnrichedPerson } from '@/lib/saju/types';
import { useLanguage } from '@/lib/i18n';
import { industryToKorean } from '@/components/FilterPanel';
import { fetchDeepBioV2, hasDeepBioV2Sync } from '@/lib/deepBio';

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
 * Clean a Korean blurb for display in a Top3 row:
 *  - Strips parenthetical Latin text like "(María Asunción …)" or "(CG)"
 *    that bilingual records leak into otherwise-Korean copy.
 *  - Collapses the resulting whitespace.
 *  - Replaces the person's full Korean / Latin name with the short
 *    middle-name-dropped display name (e.g. "마리아 아순시온 …" → "마리아 라레기"),
 *    so we don't repeat a long romanised name inside the blurb.
 */
function cleanBlurb(raw: string, person: EnrichedPerson, displayName: string): string {
  if (!raw) return raw;
  let s = raw;

  // 1) Drop parens whose contents are mostly Latin / punctuation. These
  //    are almost always the romanised name or English brand expansion.
  s = s.replace(/\s*\(([^)]+)\)/g, (_match, inside: string) => {
    const hangulCount = (inside.match(/[가-힣]/g) || []).length;
    const latinCount = (inside.match(/[A-Za-z]/g) || []).length;
    // Keep the parens when they're Korean-dominant (rare — usually a
    // legitimate clarification). Strip otherwise.
    return hangulCount > latinCount ? `(${inside})` : '';
  });

  // 2) Replace the canonical Korean full name with the short display name.
  //    `dropMiddleNames` already produced the short form upstream, so we
  //    just match the original `nameKo` text and swap it.
  if (person.nameKo && person.nameKo !== displayName && person.nameKo.length >= 4) {
    s = s.split(person.nameKo).join(displayName);
  }

  // 3) Tidy: collapse runs of spaces, remove space before terminators.
  s = s.replace(/ {2,}/g, ' ').replace(/\s+([,.])/g, '$1').trim();
  return s;
}

/**
 * Build a Korean blurb from a v2 deep bio.
 *
 * v2 records have inconsistent fill levels — some entries have a long
 * `capitalOrigin.descriptionKo` paragraph (윤동한), others stuff one key
 * sentence in `capitalOrigin.explanationKo` and leave a much richer
 * `careerTimeline` (노먼 에드워즈). We walk a priority chain that prefers
 * paragraph-grade copy first, then stitches a paragraph from the
 * career timeline when only short keyword copy is available.
 *
 * The on-disk records have also drifted from the published TypeScript
 * schema, so everything is read through `unknown` casts.
 */
function blurbFromDeepBioV2(bio: unknown): string {
  if (!bio || typeof bio !== 'object') return '';
  const b = bio as Record<string, unknown>;
  const cap = (s: string) => (s.length > 320 ? s.slice(0, 318).trimEnd() + '…' : s);

  // 1) Paragraph-grade capitalOrigin description (윤동한, 이명희).
  const co = b.capitalOrigin as Record<string, unknown> | undefined;
  const coLong = (() => {
    const desc = (co?.descriptionKo ?? co?.explanationKo) as string | undefined;
    const trimmed = desc?.trim() ?? '';
    return trimmed.length >= 50 ? trimmed : '';
  })();
  if (coLong) return cap(coLong);

  // 2) Paragraph-grade childhood.summaryKo.
  const child = b.childhood as Record<string, unknown> | undefined;
  const childSummary = (child?.summaryKo as string | undefined)?.trim() ?? '';
  if (childSummary.length >= 50) return cap(childSummary);

  // 3) Stitch a paragraph from careerTimeline + a one-line wrapper.
  //    e.g. 노먼 → "1983년 캘거리 로펌 합류; 에너지 투자 경력 시작. 1989년 ...
  //    2010년 CNRL이 캐나다 최대 석유·가스 생산자 중 하나가 됨."
  const timeline = b.careerTimeline as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(timeline) && timeline.length > 0) {
    const sentences: string[] = [];
    // Up to 4 events, only ones with a Korean event description.
    for (const e of timeline.slice(0, 4)) {
      const year = e.year;
      const ev = (e.eventKo as string | undefined)?.trim();
      if (!ev) continue;
      const yearStr = typeof year === 'number' ? `${year}년 ` : '';
      // Make sure each fragment ends with a period.
      const punctuated = /[.!?。]$/.test(ev) ? ev : `${ev}.`;
      sentences.push(`${yearStr}${punctuated}`);
    }
    if (sentences.length >= 2) {
      // Prepend the keyword line from capitalOrigin if it's short — it
      // often summarises the whole story in 5 words.
      const coShort = (co?.descriptionKo ?? co?.explanationKo) as string | undefined;
      const lead = coShort?.trim();
      const head = lead && lead.length > 0 && lead.length < 50
        ? (/[.!?。]$/.test(lead) ? `${lead} ` : `${lead}. `)
        : '';
      return cap(head + sentences.join(' '));
    }
  }

  // 4) Last resort: short capitalOrigin or childhood notes — these are
  //    barely sentences but better than nothing for sparser records.
  const coShort = ((co?.descriptionKo ?? co?.explanationKo) as string | undefined)?.trim() ?? '';
  if (coShort) return coShort;
  const childEarly = (child?.earlyLifeKo as string | undefined)?.trim() ?? '';
  if (childEarly) return cap(childEarly);
  const capType = (child?.capitalTypeKo as string | undefined)?.trim() ?? '';
  if (capType) return capType;

  return '';
}

/**
 * "How they made their money" — prefer the real biography (bioKo first,
 * then bio) so the row reflects ground truth. Fall back to a generated
 * sentence built from industry / company only when the bio is unusable.
 */
/**
 * Stitch a one-sentence "context" tail onto an enriched bioKo so rows
 * without a v2 deep bio aren't dramatically shorter than rows that have
 * one. We add only facts that come straight from the dataset (industry,
 * birth year, net worth) — never claims like "자수성가" that we can't
 * verify.
 */
function bioContextTailKo(person: EnrichedPerson): string {
  const fragments: string[] = [];

  const industry = industryNounKo(person.industry);
  const hasKoIndustry = industry && industry !== person.industry;
  const year =
    person.birthday && /^\d{4}/.test(person.birthday)
      ? Number(person.birthday.slice(0, 4))
      : null;
  const validYear = year != null && year > 1900 && year < 2050;

  // "1963년생으로 식음료 분야에서 활동하고 있다."
  if (validYear && hasKoIndustry) {
    fragments.push(`${year}년생으로 ${industry} 분야에서 활동하고 있다.`);
  } else if (hasKoIndustry) {
    fragments.push(`${industry} 분야에서 활동하고 있다.`);
  } else if (validYear) {
    fragments.push(`${year}년생이다.`);
  }

  if (typeof person.netWorth === 'number' && person.netWorth > 0) {
    const eok = person.netWorth * 10 * 1480.71;
    const jo = eok / 10000;
    const formatted =
      jo >= 1
        ? `약 ${jo >= 10 ? Math.round(jo) : jo.toFixed(1)}조 원`
        : `약 ${Math.round(eok).toLocaleString('ko-KR')}억 원`;
    fragments.push(`자산 규모는 ${formatted} 수준이다.`);
  }

  return fragments.join(' ');
}

function wealthStoryKo(person: EnrichedPerson, lang: string, deepBioV2?: unknown): string {
  if (lang !== 'ko') return '';

  // 0) Deep bio v2 (highest fidelity — has founding year, milestones).
  //    e.g. 윤동한 → "1990년 미국 KOLMAR와 합작으로 '한국콜마' 창업…"
  const fromDeep = blurbFromDeepBioV2(deepBioV2);
  if (fromDeep) return fromDeep;

  // 1) Korean bio — most informative for entries without a deep bio.
  //    We append a one-sentence context tail (industry, birth year,
  //    net worth) so the row carries comparable weight to a deep-bio row.
  const fromBioKo = trimBioForRow(person.bioKo, true);
  if (fromBioKo) {
    const tail = bioContextTailKo(person);
    return tail ? `${fromBioKo} ${tail}` : fromBioKo;
  }

  // 2) Some records (e.g. 이명희) park Korean copy in the English `bio`
  //    field instead of `bioKo`. Reuse it if it's actually Korean.
  const fromBio = trimBioForRow(person.bio, true);
  if (fromBio) {
    const tail = bioContextTailKo(person);
    return tail ? `${fromBio} ${tail}` : fromBio;
  }

  // 3) Generic, fact-light fallback. Keep it neutral — we don't trust
  //    `wealthOrigin` enough to make self-made / inherited claims here.
  const industry = industryNounKo(person.industry);
  const co = cleanCompanyName(person.company);

  const coObj = co ? `${co}${objectParticle(co)}` : '';

  // Neutral fallback — describe the industry / company without claiming
  // self-made vs inherited. `wealthOrigin` in the dataset is unreliable
  // (e.g. 이명희 marked self-made though she inherited Samsung lineage),
  // so we say less rather than say it wrong. We deliberately omit the
  // "상세 프로필을 참고하세요" tail — pointing users elsewhere from the
  // result row read as filler.
  if (co && industry)
    return `${coObj} 중심으로 ${industry} 분야에서 활약하는 부자.`;
  if (co)
    return `${co} 관련 사업으로 부를 일군 부자.`;
  if (industry)
    return `${industry} 분야에서 활약하는 부자.`;
  return '';
}

/**
 * One row in the Top3 list. Split out as its own component so each row
 * can hold its own deep-bio fetch state without breaking the rules of
 * hooks (a parent-level useState array would also work but this reads
 * cleaner).
 */
function Top3Row({
  person,
  selectedId,
  lang,
}: {
  person: EnrichedPerson;
  selectedId: string | null | undefined;
  lang: string;
}) {
  const [deepBio, setDeepBio] = useState<unknown>(null);

  // Only kick off the fetch if the index says we have a v2 bio for this
  // person — saves a 404 round-trip for entries that aren't covered yet.
  useEffect(() => {
    let cancelled = false;
    if (hasDeepBioV2Sync(person.id)) {
      fetchDeepBioV2(person.id).then((b) => {
        if (!cancelled) setDeepBio(b);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [person.id]);

  const isActive = selectedId != null && person.id === selectedId;
  const displayName = dropMiddleNames(
    lang === 'ko' ? (person.nameKo || person.name) : person.name,
  );
  const meta = metaLineKo(person, lang);
  const rawBlurb = wealthStoryKo(person, lang, deepBio);
  const blurb = cleanBlurb(rawBlurb, person, displayName);

  return (
    <li
      className={`rounded-xl transition-colors ${
        isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
      }`}
    >
      {/* Two-column card:
            left  = photo (top) + name/meta/networth (under photo)
            right = bio paragraph + "부자 일주 보기" CTA
          Whole card area links to the profile; the CTA is its own anchor
          so it's a distinct tap target on touch devices. */}
      <Link
        href={`/profile/${person.id}`}
        className="block flex items-start gap-3 text-left px-3 pt-3 pb-2"
      >
        {/* Left column — fixed-width photo column with the person's
            identity stacked below. */}
        <div className="shrink-0 w-20 sm:w-24 text-center">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto">
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
          <p className="mt-2 text-[13px] font-semibold text-gray-900 leading-tight">
            {displayName}
          </p>
          {meta && (
            <p className="mt-0.5 text-[10.5px] text-gray-500 leading-tight break-keep">
              {meta}
            </p>
          )}
          <p className="mt-1 text-[12px] font-bold text-gray-900">
            {formatWorthKo(person.netWorth)}
          </p>
        </div>

        {/* Right column — bio paragraph. Flexes to fill the remaining
            width and clamps to a tidy block so very long deep-bio paragraphs
            don't push the card height beyond the photo column. */}
        <div className="min-w-0 flex-1 pt-1">
          {blurb ? (
            <p className="text-[12px] text-gray-700 leading-snug line-clamp-6">
              {blurb}
            </p>
          ) : (
            <p className="text-[12px] text-gray-400">상세 소개 준비중.</p>
          )}
        </div>
      </Link>

      {/* Per-row secondary CTA — outside the card link so it's a
          separate clickable target with its own affordance. */}
      <div className="px-3 pb-3 pt-1">
        <Link
          href={`/profile/${person.id}`}
          className="block w-full text-center text-[12px] font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-lg py-1.5 transition-colors"
        >
          일주 자세히 보기
        </Link>
      </div>
    </li>
  );
}

export default function Top5FacesRow({ people, selectedId }: Props) {
  const { lang } = useLanguage();
  const top3 = pickTop3WithKorean(people);

  if (top3.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2 max-w-xl mx-auto lg:max-w-none lg:mx-0">
      {top3.map((person) => (
        <Top3Row
          key={person.id}
          person={person}
          selectedId={selectedId}
          lang={lang}
        />
      ))}
    </ul>
  );
}
