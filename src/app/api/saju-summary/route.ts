import OpenAI from 'openai';
import type { NextRequest } from 'next/server';
import { rateLimit, getIp } from '@/lib/rateLimit';
import { cacheKey, getCached, setCached, cachedStreamResponse } from '@/lib/aiCache';

export const maxDuration = 60;
import { analyzeSaju } from '@/lib/saju/relationships';
import { buildSajuContext } from '@/lib/saju/sajuContext';
import type { SajuResult, CheonGan, JiJi } from '@/lib/saju/types';

/**
 * POST /api/saju-summary
 *
 * Streams a 2-paragraph Korean 사주 summary from OpenAI gpt-4o-mini:
 *   (1) what this 일주's energy is like (오행 + 음양 feel)
 *   (2) what's striking about the matched billionaires' commonalities
 *
 * Switched from Claude Haiku 4.5 to gpt-4o-mini for cost: roughly 5–8x
 * cheaper for the same Korean prose quality at ~200-word output length.
 *
 * Request body:
 * {
 *   user: { ilju: string; wolji: string; gyeokguk: string; ilgan: string },
 *   matches: Array<{
 *     name: string; nameKo?: string; industry: string;
 *     nationality: string; netWorth: number; wealthOrigin?: string;
 *     ilju: string; wolji: string; gyeokguk: string;
 *   }>
 * }
 *
 * Response: text/plain stream of the summary (no framing, just the prose).
 * Callers can append chunks directly to state.
 */

export const runtime = 'nodejs';

interface DeepBioSnippet {
  childhood?: string;
  careerHighlights?: string;
  failures?: string;
  quotes?: string;
  knownFor?: string;
}

interface SummaryInput {
  user: {
    ilju: string;
    wolji: string;
    gyeokguk: string;
    ilgan: string;
    // Full pillar data for relationship analysis
    yearStem?: string;
    yearBranch?: string;
    monthStem?: string;
    monthBranch?: string;
    dayStem?: string;
    dayBranch?: string;
    hourStem?: string;
    hourBranch?: string;
  };
  matches: Array<{
    name: string;
    nameKo?: string;
    industry: string;
    nationality: string;
    netWorth: number;
    wealthOrigin?: string;
    ilju: string;
    wolji: string;
    gyeokguk: string;
    deepBio?: DeepBioSnippet;
  }>;
}

// Hard-cap matches fed to the model to keep prompts short + responses
// focused. The top N by net worth is almost always what's interesting.
const MAX_MATCHES_IN_PROMPT = 12;

// Map common English industry labels → short Korean. Covers the Forbes
// industry taxonomy we ingest. Missing keys fall through unchanged, which
// the prompt then tells the model to rewrite in Korean itself.
const INDUSTRY_KO: Record<string, string> = {
  'Technology': '기술',
  'Finance & Investments': '금융·투자',
  'Finance': '금융',
  'Fashion & Retail': '패션·유통',
  'Retail': '유통',
  'Real estate': '부동산',
  'Real Estate': '부동산',
  'Diversified': '다각화',
  'Food & Beverage': '식품·음료',
  'Food and Beverage': '식품·음료',
  'Media & Entertainment': '미디어·엔터',
  'Media': '미디어',
  'Manufacturing': '제조업',
  'Healthcare': '헬스케어',
  'Energy': '에너지',
  'Metals & Mining': '금속·광업',
  'Automotive': '자동차',
  'Logistics': '물류',
  'Logistics, transportation': '물류·운송',
  'Gambling & Casinos': '카지노',
  'Telecom': '통신',
  'Service': '서비스',
  'Sports': '스포츠',
  'Sports team': '스포츠',
  'Construction & Engineering': '건설·엔지니어링',
  'Construction': '건설',
  'Fast food': '패스트푸드',
  'Apparel': '의류',
  'Steel': '철강',
  'Vaccines': '백신',
  'Software': '소프트웨어',
  'Online games': '온라인 게임',
  'Oil, gas': '석유·가스',
  'cryptocurrency': '가상자산',
  'Consumer products, banking': '소비재·금융',
};
function translateIndustry(s: string | undefined | null): string {
  if (!s) return '';
  if (INDUSTRY_KO[s]) return INDUSTRY_KO[s];
  // Split on " · " or "," and translate each segment
  const parts = s.split(/\s*[·,]\s*/).map(p => INDUSTRY_KO[p] ?? p);
  return parts.join('·');
}

// Format a USD billion net worth into Korean won (조/억 원).
// Uses 1 USD = 1480.71 KRW to match MatchResults' USD_TO_KRW client-side,
// so OG image and prompt output agree on the same figure.
function formatKrw(netWorthUsdB: number): string {
  // $1B = 10억 USD × 1480.71 KRW/USD = 14,807.1억 원
  const eokWon = netWorthUsdB * 14807.1; // in 억 원
  if (eokWon >= 10000) {
    const jo = eokWon / 10000;
    return `${jo.toFixed(1).replace(/\.0$/, '')}조 원`;
  }
  return `${Math.round(eokWon).toLocaleString('ko-KR')}억 원`;
}

function buildPrompt(input: SummaryInput): string {
  const { user, matches } = input;
  const topMatches = matches.slice(0, MAX_MATCHES_IN_PROMPT);

  const matchLines = topMatches
    .map((m) => {
      const name = m.nameKo ?? `${m.name} (한국어 이름으로 표기)`;
      const origin = m.wealthOrigin === 'self-made' ? '자수성가' : '상속';
      const industryKo = translateIndustry(m.industry);
      return `- ${name} · ${industryKo} · ${m.nationality} · 순자산 ${formatKrw(m.netWorth)} · ${origin} · ${m.ilju}일주 ${m.wolji}월지 ${m.gyeokguk}`;
    })
    .join('\n');

  // Build deep bio context for matches that have it (top 3 only to keep prompt short)
  const bioSnippets = topMatches
    .filter((m) => m.deepBio)
    .slice(0, 3)
    .map((m) => {
      const name = m.nameKo ?? m.name;
      const bio = m.deepBio!;
      const parts: string[] = [`## ${name}`];
      if (bio.childhood) parts.push(`성장배경: ${bio.childhood}`);
      if (bio.careerHighlights) parts.push(`커리어: ${bio.careerHighlights}`);
      if (bio.failures) parts.push(`좌절과 극복: ${bio.failures}`);
      if (bio.knownFor) parts.push(`특징: ${bio.knownFor}`);
      if (bio.quotes) parts.push(`명언: ${bio.quotes}`);
      return parts.join('\n');
    })
    .join('\n\n');

  const deepBioSection = bioSnippets
    ? `\n# 주요 인물들의 인생 스토리\n${bioSnippets}\n`
    : '';

  // Run saju relationship analysis (충/합/형/오행) and build rich context from JSON database
  let sajuAnalysisSection = '';
  let sajuDbContext = '';
  if (user.dayStem && user.dayBranch && user.monthStem && user.monthBranch) {
    try {
      const sajuResult: SajuResult = {
        saju: {
          year: user.yearStem && user.yearBranch
            ? { stem: user.yearStem as CheonGan, branch: user.yearBranch as JiJi }
            : { stem: '갑' as CheonGan, branch: '자' as JiJi },
          month: { stem: user.monthStem as CheonGan, branch: user.monthBranch as JiJi },
          day: { stem: user.dayStem as CheonGan, branch: user.dayBranch as JiJi },
          hour: user.hourStem && user.hourBranch
            ? { stem: user.hourStem as CheonGan, branch: user.hourBranch as JiJi }
            : null,
        },
        gyeokguk: user.gyeokguk as SajuResult['gyeokguk'],
        ilju: user.ilju as string,
        wolji: user.wolji as JiJi,
      };
      const analysis = analyzeSaju(sajuResult);
      sajuAnalysisSection = `\n# 사주 명리학 분석 (충·합·형·오행)\n${analysis.summaryKo}\n`;

      // Rich context from our saju interpretation database
      sajuDbContext = `\n# 명리학 해석 데이터베이스\n${buildSajuContext(sajuResult)}\n`;
    } catch {
      // Skip analysis if it fails
    }
  }

  return `당신은 40년 경력의 한국 사주명리학 대가입니다. ${user.ilju} 일주인 사용자가 자신과 비슷한 사주 구조를 가진 부자 ${matches.length}명을 매칭받았습니다. 사용자 본인의 사주 풀이는 이미 별도로 제공되어 있으므로, 당신은 오직 **매칭된 부자들의 공통점·패턴**만 짚어 주세요.

# 사용자 사주 (참고용 — 풀이 대상 아님)
- 일주: ${user.ilju}
- 월지: ${user.wolji}
- 격국: ${user.gyeokguk}

# 비슷한 사주 구조를 가진 부자들
${matchLines}
${deepBioSection}
# 작성 지침

하나의 자연스러운 단락(3-5문장)으로 매칭된 부자들의 공통점을 풀어 주세요. 매칭 부자에 대해서만 다루며, 사용자 사주 풀이는 절대 하지 마세요.

반드시 포함:
1) **주요 분야** — 위 매칭 목록에 나온 산업의 패턴 (예: "기술과 금융 분야가 압도적으로 많고, 제조·유통도 보입니다"). 한글 산업명만 사용.
2) **자수성가 vs 상속** 비율 — 목록을 세어 정확히 명시. 예: "12명 중 9명이 자수성가형입니다."
3) **눈에 띄는 인물 1-2명** — 가장 부유하거나 deepBio가 있는 사람 1-2명만 한글 이름으로 언급. 그가 어떻게 부를 일궜는지 1문장.
4) (선택) 국적·지역 패턴이 뚜렷하면 한 줄 추가.

### 절대 금지
- **사용자 일주·격국·월지 풀이 금지.** 이건 별도 정적 페이지에 이미 있음. "당신은 ○○ 일주라서..." 식 문장 절대 금지.
- **격국 단어 자체 금지**: "정관격", "편재격", "상관격", "식신격", "정인격", "편인격", "비견", "겁재", "건록격", "양인격", "격국" 같은 명리학 용어를 출력에 절대 쓰지 마세요. 일반 독자가 모르는 단어입니다.
- **추상 표현 금지** — "깊이 있는", "안정성", "조화로운", "필수적인", "원활한" 같은 빈말 금지. 구체적 사실만.
- **영어 단어 금지** — 매칭 목록에 한글 산업명이 있으니 그대로 사용.
- **영한 혼합 금지** — "scalable하다" 같은 형태 금지.
- "null" 금지.
- 5문장 초과 금지.

톤:
- 자연스러운 한국어 산문, 마크다운 없음.
- 짧은 문장으로 끊어 쓰기 — 한 문장에 절 3개 넘기지 말 것.
- 단정형 ~합니다/입니다 기반. "~예요/이에요" 어미는 전체에서 1번 이하.
- 번역체 금지 — "제공합니다", "선사합니다", "이끌어냅니다", "만들어냅니다", "~경향이 있습니다" 등 사용 불가.
- "훌륭합니다", "탁월합니다" 같은 오글거리는 칭찬 금지. "많습니다", "두드러집니다", "압도적입니다" 같은 평이한 표현 사용.

요약문만 출력하세요. 제목·서문 없이 하나의 단락으로.`;
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  if (!process.env.OPENAI_API_KEY) {
    console.error('[saju-summary] OPENAI_API_KEY not configured');
    return new Response('Service temporarily unavailable', { status: 503 });
  }

  let body: SummaryInput;
  try {
    body = (await req.json()) as SummaryInput;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  if (!body?.user?.ilju || !Array.isArray(body.matches)) {
    return new Response('Missing user or matches', { status: 400 });
  }

  // maxRetries: 0 — when OpenAI rate-limits us, the SDK's default 2 retries
  // turn every failed call into 3 calls, which is exactly what we don't want
  // during a rate-limit incident. Surface the 429 immediately instead.
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0 });

  let prompt: string;
  try {
    prompt = buildPrompt(body);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'prompt build failed';
    console.error('[saju-summary] buildPrompt threw:', msg);
    return new Response('Could not build prompt from input', { status: 400 });
  }

  // Serve an identical prior generation without paying OpenAI again. The
  // prompt captures every input that affects the output, so it's the key.
  const key = cacheKey('summary', { prompt });
  const cached = await getCached(key);
  if (cached) {
    return cachedStreamResponse(cached);
  }

  // Rate limit sits AFTER the cache lookup: it caps paid OpenAI calls, and
  // a cache hit costs nothing, so checking earlier would 429 a legitimate
  // user re-reading an existing result. Everything above is local work.
  //
  // 3/min per IP — the old 10/min permitted 600 paid calls per hour from a
  // single address.
  const { allowed } = await rateLimit('saju-summary', ip, 3, 60);
  if (!allowed) {
    return new Response('Too many requests — please wait a moment', { status: 429 });
  }

  // Open the OpenAI stream BEFORE returning the Response. If this throws
  // (rate limit, auth, bad request), we can map it to a real HTTP status
  // — once we hand a ReadableStream to Response, the headers are 200 and
  // any downstream error becomes a silent broken stream that the client
  // sees as an empty success.
  const upstreamAbort = new AbortController();
  req.signal.addEventListener('abort', () => upstreamAbort.abort());

  let stream;
  try {
    stream = await client.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        max_tokens: 2000,
        // Lowered from 0.7 → 0.5 to stop the model drifting into other
        // languages mid-response (we saw Russian tokens like "возможность"
        // appearing inside Korean prose at higher temps).
        temperature: 0.5,
        stream: true,
        messages: [
          {
            role: 'system',
            content: 'You are a Korean saju expert. Output ONLY in Korean. Never use Russian, Japanese, Chinese, or any other non-Korean script. The only exception is well-known company/product names in English (e.g. Tesla, Amazon, Google). All other content must be in natural Korean.',
          },
          { role: 'user', content: prompt },
        ],
      },
      { signal: upstreamAbort.signal },
    );
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    if (isAbort) return new Response(null, { status: 499 });
    // OpenAI APIError carries .status — fall through to 502 otherwise.
    const status =
      typeof (err as { status?: number })?.status === 'number'
        ? (err as { status: number }).status
        : 502;
    const msg = err instanceof Error ? err.message : 'upstream error';
    console.error(`[saju-summary] openai create failed (${status}):`, msg);
    return new Response(status === 429 ? 'Rate limited' : 'Upstream error', { status });
  }

  const encoder = new TextEncoder();
  let closed = false;

  // Accumulate so a fully-completed generation can be cached. Only written
  // on clean completion — caching a stream cut short by a client disconnect
  // would serve that truncated text to everyone afterwards.
  let accumulated = '';

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (closed) break;
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            accumulated += delta;
            controller.enqueue(encoder.encode(delta));
          }
        }
        const completed = !closed;
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
        if (completed) {
          await setCached(key, accumulated);
        }
      } catch (err) {
        const isAbort =
          (err instanceof Error && err.name === 'AbortError') || closed;
        if (!isAbort) {
          const msg = err instanceof Error ? err.message : 'stream error';
          console.error('[saju-summary] mid-stream failed:', msg);
        }
        if (!closed) {
          try {
            controller.error(err);
          } catch {
            // already torn down
          }
          closed = true;
        }
      }
    },
    cancel() {
      closed = true;
      upstreamAbort.abort();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
