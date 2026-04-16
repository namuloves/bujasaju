'use client';

/**
 * DeepInterpretation — additive 5-section "심층 풀이" rendered below the
 * existing MatchSummary when the featured person has a v2 deep bio.
 *
 * Streams from /api/saju-deep-summary as plain text. The text is in
 * markdown (## headings + paragraphs); we render it with a minimal
 * inline parser to avoid pulling in react-markdown.
 *
 * Caching mirrors MatchSummary: a module-level `inflight` map keyed by
 * (user-saju + featuredId) so re-renders don't kick off duplicate
 * streams. A separate `cache` keeps completed results.
 */

import { useEffect, useState } from 'react';
import type { SajuResult, EnrichedPerson } from '@/lib/saju/types';

interface Props {
  saju: SajuResult;
  featured: EnrichedPerson;
  userBirthday: string; // YYYY-MM-DD — needed for 대운 calculation
  userGender: 'M' | 'F';
}

interface InFlight {
  text: string;
  done: boolean;
  error: boolean;
  subscribers: Set<(text: string, done: boolean, error: boolean) => void>;
}

const inflight = new Map<string, InFlight>();
const cache = new Map<string, string>();

function keyFor(saju: SajuResult, featuredId: string, birthday: string): string {
  return [
    saju.ilju,
    saju.wolji,
    saju.gyeokguk,
    birthday,
    featuredId,
  ].join('|');
}

function streamFor(
  key: string,
  saju: SajuResult,
  featured: EnrichedPerson,
  userBirthday: string,
  userGender: 'M' | 'F'
): InFlight {
  const existing = inflight.get(key);
  if (existing) return existing;

  const entry: InFlight = {
    text: cache.get(key) ?? '',
    done: cache.has(key),
    error: false,
    subscribers: new Set(),
  };
  inflight.set(key, entry);

  // If we already have a cached final, no need to fetch.
  if (entry.done) {
    setTimeout(() => inflight.delete(key), 0);
    return entry;
  }

  const notify = () => {
    for (const cb of entry.subscribers) cb(entry.text, entry.done, entry.error);
  };

  (async () => {
    try {
      const fSaju = featured.saju;
      const res = await fetch('/api/saju-deep-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: {
            ilju: saju.ilju,
            wolji: saju.wolji,
            gyeokguk: saju.gyeokguk,
            ilgan: saju.saju.day.stem,
            birthday: userBirthday,
            gender: userGender,
            year: { stem: saju.saju.year.stem, branch: saju.saju.year.branch },
            month: { stem: saju.saju.month.stem, branch: saju.saju.month.branch },
            day: { stem: saju.saju.day.stem, branch: saju.saju.day.branch },
            hour: saju.saju.hour
              ? { stem: saju.saju.hour.stem, branch: saju.saju.hour.branch }
              : null,
          },
          featured: {
            id: featured.id,
            name: featured.name,
            nameKo: featured.nameKo,
            birthday: featured.birthday,
            netWorth: featured.netWorth,
            nationality: featured.nationality,
            industry: featured.industry,
            gender: featured.gender,
            ilju: fSaju.ilju,
            wolji: fSaju.wolji,
            gyeokguk: fSaju.gyeokguk,
            year: { stem: fSaju.saju.year.stem, branch: fSaju.saju.year.branch },
            month: { stem: fSaju.saju.month.stem, branch: fSaju.saju.month.branch },
            day: { stem: fSaju.saju.day.stem, branch: fSaju.saju.day.branch },
            bio: featured.bio,
            bioKo: featured.bioKo,
            wealthOrigin: featured.wealthOrigin,
          },
        }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        entry.text += decoder.decode(value, { stream: true });
        notify();
      }
      entry.text += decoder.decode();
      entry.done = true;
      cache.set(key, entry.text);
      notify();
    } catch (err) {
      console.error('[DeepInterpretation] stream failed:', err);
      entry.done = true;
      entry.error = true;
      notify();
    } finally {
      setTimeout(() => inflight.delete(key), 0);
    }
  })();

  return entry;
}

function useDeepStream(
  saju: SajuResult,
  featured: EnrichedPerson,
  userBirthday: string,
  userGender: 'M' | 'F'
) {
  const key = keyFor(saju, featured.id, userBirthday);
  const [, force] = useState(0);

  // Subscribe via useSyncExternalStore semantics (manual to keep it simple)
  useEffect(() => {
    const entry = streamFor(key, saju, featured, userBirthday, userGender);
    const cb = () => force((n) => n + 1);
    entry.subscribers.add(cb);
    // If already completed before subscription, trigger one render
    if (entry.done) cb();
    return () => {
      entry.subscribers.delete(cb);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const entry = inflight.get(key);
  if (entry) return { text: entry.text, done: entry.done, error: entry.error };
  if (cache.has(key)) return { text: cache.get(key) ?? '', done: true, error: false };
  return { text: '', done: false, error: false };
}

// ─── Minimal markdown renderer: ## heading + **bold** + paragraphs ───
//
// Our prompt produces output with this shape:
//   ## 1) 당신의 사주 + 부자와의 연결\n\nparagraph...\n\n## 2) ...
// We split on heading lines and render each block.

function renderInline(text: string): React.ReactNode {
  // Replace **bold** with <strong>
  const parts: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<strong key={`b${i++}`} className="font-semibold text-gray-900">{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  // Normalize line endings, trim
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: Array<{ kind: 'h2' | 'p'; content: string }> = [];
  let buf: string[] = [];
  const flushPara = () => {
    const txt = buf.join(' ').trim();
    if (txt) blocks.push({ kind: 'p', content: txt });
    buf = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('## ')) {
      flushPara();
      blocks.push({ kind: 'h2', content: line.slice(3).trim() });
    } else if (line === '') {
      flushPara();
    } else {
      buf.push(line);
    }
  }
  flushPara();

  return blocks.map((b, idx) =>
    b.kind === 'h2' ? (
      <h3
        key={idx}
        className="mt-5 mb-2 text-sm font-bold text-indigo-700 first:mt-0"
      >
        {renderInline(b.content)}
      </h3>
    ) : (
      <p key={idx} className="text-sm text-gray-700 leading-relaxed mb-2">
        {renderInline(b.content)}
      </p>
    )
  );
}

// ─── Component ───

export default function DeepInterpretation({
  saju,
  featured,
  userBirthday,
  userGender,
}: Props) {
  const { text, done, error } = useDeepStream(saju, featured, userBirthday, userGender);

  if (error && !text) {
    // Silent fail — the existing MatchSummary already gave the user content.
    return null;
  }

  const featuredName = featured.nameKo ?? featured.name;
  const showSkeleton = !text && !done;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="text-base">🔮</span>
        <h2 className="text-sm font-bold text-gray-900">
          {featuredName}와의 심층 풀이
        </h2>
        {!done && text && (
          <span className="text-[10px] text-gray-400 animate-pulse">생성 중…</span>
        )}
      </div>
      {showSkeleton ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-gray-100 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-5/6" />
          <div className="h-3 bg-gray-100 rounded w-2/3" />
        </div>
      ) : (
        <div>{renderMarkdown(text)}</div>
      )}
    </div>
  );
}
