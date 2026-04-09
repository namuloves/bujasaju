import Anthropic from '@anthropic-ai/sdk';
import type { NextRequest } from 'next/server';

/**
 * POST /api/saju-summary
 *
 * Streams a 2-paragraph Korean 사주 summary from Claude Haiku:
 *   (1) what this 일주's energy is like (오행 + 음양 feel)
 *   (2) what's striking about the matched billionaires' commonalities
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

function buildPrompt(input: SummaryInput): string {
  const { user, matches } = input;
  const topMatches = matches.slice(0, MAX_MATCHES_IN_PROMPT);

  const matchLines = topMatches
    .map((m) => {
      const name = m.nameKo ? `${m.name} (${m.nameKo})` : m.name;
      const origin = m.wealthOrigin === 'self-made' ? '자수성가' : '상속';
      return `- ${name} · ${m.industry} · ${m.nationality} · 순자산 ${m.netWorth}B USD · ${origin} · ${m.ilju}일주 ${m.wolji}월지 ${m.gyeokguk}`;
    })
    .join('\n');

  return `당신은 한국의 사주명리학 전문가입니다. 아래 사용자의 일주와, 그 사용자와 사주 구조가 비슷한 세계 부자들의 목록을 바탕으로 2단락짜리 한국어 요약을 작성해 주세요.

# 사용자 사주
- 일주: ${user.ilju}
- 일간: ${user.ilgan}
- 월지: ${user.wolji}
- 격국: ${user.gyeokguk}

# 비슷한 사주 구조를 가진 부자들 (${topMatches.length}명 중 상위 ${topMatches.length})
${matchLines}

# 작성 지침
1. **첫 단락 (2-3문장)**: ${user.ilju} 일주의 기운을 시적이되 구체적으로 묘사하세요. 일간 ${user.ilgan}의 오행과 음양, 지지 ${user.ilju[1]}과의 관계에서 나오는 성향을 자연스럽게 풀어주세요. 서두는 "${user.ilju} 일주인 당신은..." 또는 비슷하게 시작하세요.
2. **두 번째 단락 (3-4문장)**: 위 부자들의 **실제 데이터에서 보이는 공통점**을 관찰해서 풀어주세요. 구체적인 숫자, 직업 분야, 국적, 자수성가 비율, 같은 격국 등을 근거로 들고, 이름을 1-2명 언급하세요. 일반론이 아니라 진짜 데이터를 읽고 쓴 것처럼 작성하세요.
3. 전체 4-7문장 이내. 마크다운 없이 순수 한국어 문장만. 친근하되 명리학적 깊이가 있는 톤으로. 과장된 예언이나 운세 단정은 피하세요.
4. "...답네요", "...이네요" 같은 자연스러운 맺음말 사용.

이제 요약문만 출력하세요. 다른 설명이나 서문은 넣지 마세요.`;
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('ANTHROPIC_API_KEY not configured', { status: 500 });
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

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const prompt = buildPrompt(body);

  // Wrap the Anthropic stream in a ReadableStream of plain text deltas.
  // No SSE framing — the client just reads chunks and appends to state.
  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: 'claude-haiku-4-5',
          max_tokens: 600,
          messages: [{ role: 'user', content: prompt }],
        });

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        // Surface a short error line then close. The client will fall back
        // to its static template if the stream errors.
        const msg = err instanceof Error ? err.message : 'stream error';
        console.error('[saju-summary] stream failed:', msg);
        controller.error(err);
      }
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
