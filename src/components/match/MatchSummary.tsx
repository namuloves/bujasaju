'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { EnrichedPerson, SajuResult } from '@/lib/saju/types';
import { fetchDeepBio, hasDeepBioSync } from '@/lib/deepBio';

/**
 * MatchSummary — streams a Claude-generated 사주 summary that describes the
 * user's 일주 and what's striking about the matched billionaires.
 *
 * Design notes:
 * - The request is fired the moment this component (or `useSajuSummary`)
 *   mounts, which happens at the start of the reveal animation. By the time
 *   results land on screen the stream is usually already complete.
 * - Client-side cache is keyed on the user's saju + the exact set of
 *   matched ids, so coming back to the same result reuses the stream.
 * - If the stream errors, we fall back to a short static template derived
 *   from the same data. The user still gets *something*.
 */

interface UseSummaryArgs {
  user: {
    ilju: string;
    wolji: string;
    gyeokguk: string;
    ilgan: string;
  };
  matches: EnrichedPerson[];
  /**
   * If false, skip the fetch entirely. Used to defer fetching until we
   * actually have data to send (e.g. while enriched people are still loading).
   */
  enabled?: boolean;
}

type SummaryState =
  | { status: 'idle' }
  | { status: 'streaming'; text: string }
  | { status: 'done'; text: string }
  | { status: 'error'; text: string };

// Simple module-level cache so toggling between views / navigating back
// doesn't re-charge the API. Keyed on user saju + matched ids.
const cache = new Map<string, string>();

// In-flight streams, keyed the same way. Each entry broadcasts text deltas
// to any number of subscribers so prefetch + hook share a single fetch.
interface InFlight {
  text: string;
  done: boolean;
  error: boolean;
  subscribers: Set<(text: string, done: boolean, error: boolean) => void>;
}
const inflight = new Map<string, InFlight>();

function startStream(
  key: string,
  user: UseSummaryArgs['user'],
  matches: EnrichedPerson[],
): InFlight {
  const existing = inflight.get(key);
  if (existing) return existing;

  const entry: InFlight = {
    text: '',
    done: false,
    error: false,
    subscribers: new Set(),
  };
  inflight.set(key, entry);

  const notify = () => {
    for (const cb of entry.subscribers) cb(entry.text, entry.done, entry.error);
  };

  (async () => {
    try {
      // Fetch deep bios for top 3 matches that have them (in parallel)
      const top12 = matches.slice(0, 12);
      const bioPromises = top12.slice(0, 3)
        .filter((m) => hasDeepBioSync(m.id))
        .map(async (m) => {
          const bio = await fetchDeepBio(m.id);
          if (!bio) return null;
          const ko = (a?: string, b?: string) => a || b || '';
          return {
            id: m.id,
            snippet: {
              childhood: ko(bio.childhood?.earlyLifeKo, bio.childhood?.earlyLife),
              careerHighlights: bio.careerTimeline
                .filter((e) => e.eventKo || e.event)
                .slice(0, 3)
                .map((e) => `${e.year}: ${ko(e.eventKo, e.event)}`)
                .join('. '),
              failures: bio.failures
                .slice(0, 2)
                .map((f) => ko(f.descriptionKo, f.description))
                .join('. '),
              knownFor: ko(bio.personalTraits?.knownForKo, bio.personalTraits?.knownFor),
              quotes: bio.quotes
                .slice(0, 1)
                .map((q) => `"${ko(q.textKo, q.text)}"`)
                .join(''),
            },
          };
        });
      const bioResults = (await Promise.all(bioPromises)).filter(Boolean) as Array<{
        id: string;
        snippet: { childhood?: string; careerHighlights?: string; failures?: string; knownFor?: string; quotes?: string };
      }>;
      const bioMap = new Map(bioResults.map((b) => [b.id, b.snippet]));

      const res = await fetch('/api/saju-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          matches: top12.map((m) => ({
            name: m.name,
            nameKo: m.nameKo,
            industry: m.industry,
            nationality: m.nationality,
            netWorth: m.netWorth,
            wealthOrigin: m.wealthOrigin,
            ilju: m.saju.ilju,
            wolji: m.saju.wolji,
            gyeokguk: m.saju.gyeokguk,
            deepBio: bioMap.get(m.id),
          })),
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
      console.error('[MatchSummary] stream failed, using fallback:', err);
      entry.text = staticFallback(user, matches);
      entry.done = true;
      entry.error = true;
      cache.set(key, entry.text);
      notify();
    } finally {
      // Leave entry in the map briefly so late subscribers can still read
      // the final text, but clear inflight flag so a future retry works.
      setTimeout(() => inflight.delete(key), 0);
    }
  })();

  return entry;
}

function cacheKey(
  user: UseSummaryArgs['user'],
  matches: EnrichedPerson[],
): string {
  const ids = matches
    .map((m) => m.id)
    .slice(0, 12)
    .join(',');
  return `${user.ilju}|${user.wolji}|${user.gyeokguk}|${user.ilgan}|${ids}`;
}

/**
 * Very small static fallback when the API fails — enough that the user
 * sees *something* meaningful and not an empty card.
 */
function staticFallback(user: UseSummaryArgs['user'], matches: EnrichedPerson[]): string {
  if (matches.length === 0) {
    return `${user.ilju} 일주인 당신의 사주 구조와 정확히 일치하는 부자는 아직 데이터에 없네요. 다른 기운의 매칭을 살펴보세요.`;
  }
  const top = matches[0];
  const industries = new Set(matches.slice(0, 8).map((m) => m.industry));
  const selfMade = matches.slice(0, 8).filter((m) => m.wealthOrigin === 'self-made').length;
  const total = Math.min(matches.length, 8);
  return `${user.ilju} 일주인 당신은 ${user.gyeokguk}의 기운을 품고 있네요. 비슷한 사주 구조를 가진 부자 ${matches.length}명 중 ${top.nameKo ?? top.name} 같은 인물이 대표적이고, 주요 분야는 ${Array.from(industries).slice(0, 3).join(' · ')}이에요. 상위 ${total}명 중 ${selfMade}명이 자수성가형이라는 점이 인상적이네요.`;
}

export function useSajuSummary({ user, matches, enabled = true }: UseSummaryArgs): SummaryState {
  const [state, setState] = useState<SummaryState>({ status: 'idle' });
  // Hold on to the latest matches ids via a ref so we only re-fire when
  // the key actually changes — not every render.
  const lastKeyRef = useRef<string | null>(null);

  // Memoized cache key. Recomputes only when its inputs actually change,
  // which is what drives the effect below. We deliberately avoid putting
  // `matches` (the array reference) in deps; the stable id-string is what
  // matters.
  const key = useMemo(
    () => cacheKey(user, matches),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user.ilju, user.wolji, user.gyeokguk, user.ilgan, matches.length, matches[0]?.id],
  );

  useEffect(() => {
    if (!enabled || matches.length === 0) return;

    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    const cached = cache.get(key);
    if (cached) {
      setState({ status: 'done', text: cached });
      return;
    }

    setState({ status: 'streaming', text: '' });
    const entry = startStream(key, user, matches);

    // Seed with whatever the stream has already buffered.
    if (entry.text) {
      setState({
        status: entry.done ? (entry.error ? 'error' : 'done') : 'streaming',
        text: entry.text,
      });
    }

    const cb = (text: string, done: boolean, error: boolean) => {
      setState({
        status: done ? (error ? 'error' : 'done') : 'streaming',
        text,
      });
    };
    entry.subscribers.add(cb);

    return () => {
      entry.subscribers.delete(cb);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key]);

  return state;
}

/**
 * Shared helper so both the hook consumers and the reveal animation can
 * kick off the fetch with the same payload + cache.
 */
export function prefetchSajuSummary(
  user: UseSummaryArgs['user'],
  matches: EnrichedPerson[],
): void {
  if (matches.length === 0) return;
  const key = cacheKey(user, matches);
  if (cache.has(key) || inflight.has(key)) return;
  startStream(key, user, matches);
}

interface Props {
  saju: SajuResult;
  matches: EnrichedPerson[];
}

export default function MatchSummary({ saju, matches }: Props) {
  const state = useSajuSummary({
    user: {
      ilju: saju.ilju,
      wolji: saju.wolji,
      gyeokguk: saju.gyeokguk,
      ilgan: saju.saju.day.stem,
    },
    matches,
  });

  if (state.status === 'idle') return null;

  const isStreaming = state.status === 'streaming';
  const text = state.text;

  return (
    <div className="relative rounded-2xl bg-white p-5 sm:p-6">
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-xl">✨</span>
        <h3 className="text-base font-bold text-gray-900">사주 풀이</h3>
        {isStreaming && (
          <span className="inline-flex gap-1">
            <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
            <span
              className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse"
              style={{ animationDelay: '300ms' }}
            />
          </span>
        )}
      </div>
      <p className="text-[15px] leading-relaxed text-gray-800 whitespace-pre-wrap">
        {text}
        {isStreaming && <span className="inline-block w-[2px] h-4 bg-indigo-500 ml-0.5 animate-pulse align-middle" />}
      </p>
    </div>
  );
}
