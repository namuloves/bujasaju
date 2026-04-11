import OpenAI from 'openai';
import type { NextRequest } from 'next/server';
import { rateLimit, getIp } from '@/lib/rateLimit';

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

interface SummaryInput {
  user: {
    ilju: string;
    wolji: string;
    gyeokguk: string;
    ilgan: string;
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
      // Prefer the Korean name. If it's missing, ask the model to use
      // the commonly-known Korean transliteration of the English name.
      const name = m.nameKo ?? `${m.name} (한국어 이름으로 표기)`;
      const origin = m.wealthOrigin === 'self-made' ? '자수성가' : '상속';
      return `- ${name} · ${m.industry} · ${m.nationality} · 순자산 ${formatKrw(m.netWorth)} · ${origin} · ${m.ilju}일주 ${m.wolji}월지 ${m.gyeokguk}`;
    })
    .join('\n');

  return `당신은 한국의 사주명리학 전문가입니다. 아래 사용자의 격국과, 그 사용자와 사주 구조가 비슷한 부자들의 목록을 바탕으로 짧은 한국어 요약을 작성해 주세요.

# 사용자 사주
- 일주: ${user.ilju}
- 일간: ${user.ilgan}
- 월지: ${user.wolji}
- 격국: ${user.gyeokguk}

# 비슷한 사주 구조를 가진 부자들
${matchLines}

# 작성 지침
1. **첫 문장 (1문장)**: ${user.gyeokguk}의 기운과 성향을 한 문장으로 풀어주세요. "${user.gyeokguk}인 당신은..." 또는 비슷하게 시작하세요. 격국 자체의 특성(어떤 성향·재능·운의 흐름인지)에 집중하세요.
2. **두 번째 단락 (3-4문장)**: 위 부자들의 **실제 데이터에서 보이는 공통점**을 관찰해서 풀어주세요. 구체적인 숫자, 직업 분야, 국적, 자수성가 비율 등을 근거로 들고, 이름은 반드시 **한국어로만** 표기하세요 (예: 스티븐 스필버그, 네이선 커시). 영어 이름이나 괄호 표기는 절대 쓰지 마세요. 순자산도 반드시 **원(조 원, 억 원)** 단위로만 표기하고, 달러는 절대 쓰지 마세요.
3. 전체 3-4문장 이내 (첫 단락 1문장 + 둘째 단락 2-3문장). 마크다운 없이 순수 한국어 문장만. 짧고 핵심만. 친근하되 명리학적 깊이가 있는 톤으로.
4. "...답네요", "...이네요" 같은 자연스러운 맺음말 사용.

이제 요약문만 출력하세요. 다른 설명이나 서문은 넣지 마세요.`;
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
            max_tokens: 500,
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
