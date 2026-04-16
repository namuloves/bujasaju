import OpenAI from 'openai';
import type { NextRequest } from 'next/server';
import { rateLimit, getIp } from '@/lib/rateLimit';
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
  const krwBillion = netWorthUsdB * 1400; // in 억 원
  if (krwBillion >= 10000) {
    const jo = krwBillion / 10000;
    return `${jo.toFixed(1)}조 원`;
  }
  return `${Math.round(krwBillion).toLocaleString('ko-KR')}억 원`;
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

반드시 포함할 내용:
- 일주의 본질적 성격과 일지 십성의 의미 (예: "갑목이 술토 위에 앉아 편재를 이루니...")
- 월지가 일간에게 어떤 에너지를 주는지 (예: "사화 월지는 목생화로 당신의 재능을 밖으로 표현하는...")
- 오행 밸런스의 핵심 — 특히 없는 오행이 있으면 그것이 이 사주에 어떤 의미인지 구체적으로 (예: "수가 없어 뿌리에 물이 닿지 않는 나무와 같습니다")
- 격국의 재물 패턴과 이 부자들에게서 실제로 보이는 공통점
- 용신이 무엇인지, 그 기운을 만나면 어떻게 달라지는지

톤과 형식:
- 전체 6-8문장의 자연스러운 한국어 산문. 마크다운 없이.
- "...네요", "...입니다" 같은 자연스러운 경어체.
- 명리학 용어를 쓰되 괄호 안에 쉬운 설명을 넣어주세요 (예: "편재(예상 밖의 재물)")
- 이름은 반드시 한국어로만. 순자산은 원(조/억 원) 단위로만.
- 이 부자들은 각자 자기 나라에서 성공한 사람들입니다. 한국 부자처럼 쓰지 마세요.
- "null"이나 영어 단어는 절대 포함하지 마세요.

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
            max_tokens: 1200,
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
