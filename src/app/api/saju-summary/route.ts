import OpenAI from 'openai';
import type { NextRequest } from 'next/server';
import { rateLimit, getIp } from '@/lib/rateLimit';

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

// Format a USD billion net worth into Korean won (조/억 원).
// Uses a fixed 1 USD = 1400 KRW to keep the prompt deterministic.
function formatKrw(netWorthUsdB: number): string {
  // $1B = 10억 USD × 1400 KRW/USD = 14,000억 원
  const eokWon = netWorthUsdB * 14000; // in 억 원
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
      return `- ${name} · ${m.industry} · ${m.nationality} · 순자산 ${formatKrw(m.netWorth)} · ${origin} · ${m.ilju}일주 ${m.wolji}월지 ${m.gyeokguk}`;
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

  return `당신은 40년 경력의 한국 사주명리학 대가입니다. 아래 사용자의 사주에 대한 상세한 명리학 데이터와 비슷한 사주 구조를 가진 부자들의 목록을 바탕으로, 깊이 있고 정확한 사주 풀이를 작성해 주세요.

# 사용자 사주
- 일주: ${user.ilju}
- 일간: ${user.ilgan}
- 월지: ${user.wolji}
- 격국: ${user.gyeokguk}
${sajuAnalysisSection}${sajuDbContext}
# 비슷한 사주 구조를 가진 부자들
${matchLines}
${deepBioSection}
# 작성 지침

하나의 자연스러운 글로 풀이해 주세요. 섹션 구분이나 항목 나열 없이, 마치 명리학 대가가 직접 상담하듯 이야기체로 써 주세요.

반드시 포함할 내용 (3가지, 반드시 이 순서대로):

1) 일주·월지 풀이 (2-3문장) — ${user.ilju} 일주의 핵심 성격을 먼저. 위 "${user.ilju} 일주 해석" 데이터의 traits 키워드를 활용. 그 다음 월지 ${user.wolji}가 일간에게 주는 에너지를 자연스럽게 연결. "큰 나무", "깊은 물" 같은 오행 자연물 비유 금지.

2) 격국 특성 (1-2문장) — ${user.gyeokguk}이 어떤 성격과 재물 패턴을 만드는지. 명리학 용어는 괄호 안에 쉬운 설명 병기.

3) 오행 약점 + 보완 (1문장) — 오행 밸런스에서 부족한 오행과 용신을 합쳐서 한 문장. "이를 충족시켜줄 자원을 활용" 같은 뻔한 조언 금지 — 구체적 행동이나 방향 제시.

### 절대 금지
- **부자 이름 언급 금지.** 이 풀이는 순수하게 사용자의 사주만 다룹니다. 매칭된 부자와의 연결은 별도 섹션에서 합니다.
- **7문장 이상 금지.** 전체 5-6문장.
- "null", 영어 단어 금지.

톤과 형식:
- **전체 5-6문장의 자연스러운 한국어 산문. 마크다운 없이.**
- **문장을 짧고 읽기 쉽게.** 한 문장에 절(clause)을 3개 이상 넣지 말 것. "~하며, ~하여, ~하고" 식으로 끝없이 이어붙이지 말고 끊어 쓸 것.
- 좋은 예: "갑술 일주는 진취적이고 도전적입니다. 활동 범위도 넓고 사교성도 갖추고 있습니다."
- 나쁜 예: "갑술 일주는 진취적이고 도전적인 성격을 지니며, 넓은 활동 범위와 사교성을 갖추고 있습니다." (한 문장에 너무 많은 정보)
- 번역체/공문서체 절대 금지. 다음 표현 사용 금지: "제공합니다", "확대해줍니다", "부여합니다", "가져다줍니다", "선사합니다", "더해줍니다". 대신 "~이 있어요", "~이 돼요", "~거든요", "~인 셈이에요" 같은 자연스러운 구어체.
- "훌륭합니다", "탁월합니다", "뛰어납니다" 같은 올드패션 칭찬 금지. "좋아요", "강해요", "많아요" 같은 평이한 표현 사용.
- 해요체로 통일. "~입니다/합니다" 대신 "~이에요/해요/거든요".
- 명리학 용어를 쓰되 괄호 안에 쉬운 설명 (예: "편재(예상 밖의 재물)").

요약문만 출력하세요. 제목, 서문, 항목 구분 없이 하나의 글로.`;
}

export async function POST(req: NextRequest) {
  // Rate limit: 10 requests per minute per IP
  const ip = getIp(req);
  const { allowed } = await rateLimit('saju-summary', ip, 10, 60);
  if (!allowed) {
    return new Response('Too many requests — please wait a moment', { status: 429 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return new Response('OPENAI_API_KEY not configured', { status: 500 });
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

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = buildPrompt(body);

  // Wrap the OpenAI stream in a ReadableStream of plain text deltas.
  // No SSE framing — the client just reads chunks and appends to state.
  //
  // Two things this has to handle correctly:
  //   1. Client disconnect mid-stream (HMR, navigation, refresh). When this
  //      happens the downstream ReadableStream is already cancelled, so any
  //      further `controller.enqueue` throws "Invalid state: Controller is
  //      already closed". We track a `closed` flag and stop enqueuing.
  //   2. Aborting the upstream OpenAI call the moment the client goes away,
  //      so we don't keep billing tokens into a socket nobody's reading.
  const encoder = new TextEncoder();
  const upstreamAbort = new AbortController();
  let closed = false;

  // Fire upstreamAbort as soon as the client disconnects. `req.signal` is
  // the incoming request's AbortSignal in Next.js route handlers.
  req.signal.addEventListener('abort', () => {
    closed = true;
    upstreamAbort.abort();
  });

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await client.chat.completions.create(
          {
            model: 'gpt-4o-mini',
            max_tokens: 800,
            temperature: 0.7,
            stream: true,
            messages: [{ role: 'user', content: prompt }],
          },
          { signal: upstreamAbort.signal },
        );

        for await (const chunk of stream) {
          if (closed) break;
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            controller.enqueue(encoder.encode(delta));
          }
        }
        // Always close the controller so the client gets a proper stream-end
        // signal. The `closed` flag only guards `enqueue` (to avoid writing
        // into a cancelled controller), but we still need to close even if
        // req.signal fired — the client may still be reading.
        if (!closed) {
          closed = true;
        }
        try {
          controller.close();
        } catch {
          // Controller already closed/errored — nothing to do.
        }
      } catch (err) {
        // A client-initiated abort is expected and not worth logging as an
        // error. Everything else is a real failure the client should fall
        // back on via its static template.
        const isAbort =
          (err instanceof Error && err.name === 'AbortError') || closed;
        if (!isAbort) {
          const msg = err instanceof Error ? err.message : 'stream error';
          console.error('[saju-summary] stream failed:', msg);
        }
        if (!closed) {
          try {
            controller.error(err);
          } catch {
            // Controller was already torn down — nothing to do.
          }
          closed = true;
        }
      }
    },
    cancel() {
      // Downstream (the Response body) was cancelled — propagate to upstream.
      closed = true;
      upstreamAbort.abort();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      // Disable buffering on Vercel edge/node so chunks flush immediately
      'X-Accel-Buffering': 'no',
    },
  });
}
