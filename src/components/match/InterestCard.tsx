'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { trackEvent } from '@/lib/analytics';

/**
 * InterestCard — one-tap "what are you most curious about?" question,
 * shown on the match results page just above the feedback card.
 *
 * One tap records the pick and flips the card to a thank-you line. The
 * pick goes to GA / Vercel as `interest_pick` and to /api/feedback, which
 * keeps a per-option counter in Redis (`feedback:interest`) plus a capped
 * log with the user's 일주 so answers can be sliced by chart later.
 *
 * Like FeedbackCard there is no localStorage gating: a refresh shows the
 * question again. The server rate-limits per IP.
 */

export type Interest = 'wealth' | 'career' | 'love' | 'timing';

interface Props {
  ilju?: string;
}

export default function InterestCard({ ilju }: Props) {
  const { t, lang } = useLanguage();
  const [picked, setPicked] = useState<Interest | null>(null);

  const options: { value: Interest; label: string }[] = [
    { value: 'wealth', label: t.interestWealth },
    { value: 'career', label: t.interestCareer },
    { value: 'love', label: t.interestLove },
    { value: 'timing', label: t.interestTiming },
  ];

  async function pick(value: Interest) {
    if (picked) return;
    setPicked(value);
    trackEvent('interest_pick', { interest: value, ilju: ilju ?? null });
    // Fire and forget, same as the feedback vote: the UI has already
    // moved on, and a lost tap is acceptable for an anonymous signal.
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interest: value, ilju, lang }),
      });
    } catch {
      // Swallow — see comment above.
    }
  }

  if (picked) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50/60 px-5 py-5 text-center">
        <p className="text-sm font-medium text-gray-900">{t.interestThanks}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 px-5 py-5 text-center">
      <p className="text-sm font-medium text-gray-900 mb-3">{t.interestPrompt}</p>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-center">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => pick(o.value)}
            className="rounded-lg bg-white border border-gray-200 hover:border-gray-400 px-4 py-2 text-sm text-gray-800 transition-colors"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
