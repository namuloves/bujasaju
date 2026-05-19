'use client';

import { useState, type FormEvent } from 'react';
import { useLanguage } from '@/lib/i18n';

/**
 * FeedbackCard — anonymous thumbs up/down + optional free-text comment,
 * shown on the match results page above the share buttons.
 *
 * State machine:
 *   idle → voted → (optionally) commenting → commented
 *
 * The vote and the comment are sent as two separate POSTs to /api/feedback
 * so a user who only clicks a thumb still leaves a counted signal even if
 * they bail before typing.
 *
 * No localStorage gating: a session refresh resets the card, which is fine
 * for v1 and easier to debug. Submitting from the same IP is rate-limited
 * on the server.
 */

type Status = 'idle' | 'voted' | 'submitting-comment' | 'commented' | 'error';
type Vote = 'like' | 'dislike';

interface Props {
  /** Forwarded as `ilju` on the feedback payload so we can slice responses
   *  by chart later (e.g. "is the 임진일주 풀이 the one people don't like?"). */
  ilju?: string;
}

export default function FeedbackCard({ ilju }: Props) {
  const { t, lang } = useLanguage();
  const [status, setStatus] = useState<Status>('idle');
  const [vote, setVote] = useState<Vote | null>(null);
  const [comment, setComment] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function sendVote(v: Vote) {
    if (status !== 'idle') return;
    setVote(v);
    setStatus('voted');
    // Fire and forget the vote — UI flips immediately. If the network
    // call fails the vote is lost, which is acceptable for an anonymous
    // signal (we'd rather not block the UI on a counter).
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote: v, ilju, lang }),
      });
    } catch {
      // Swallow — see comment above.
    }
  }

  async function sendComment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = comment.trim();
    if (trimmed.length === 0 || status === 'submitting-comment') return;

    setStatus('submitting-comment');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: trimmed, vote, ilju, lang }),
      });
      if (!res.ok) {
        setStatus('error');
        setErrorMsg(t.feedbackErrorGeneric);
        return;
      }
      setStatus('commented');
    } catch {
      setStatus('error');
      setErrorMsg(t.feedbackErrorGeneric);
    }
  }

  // Stage 1: ask for a vote.
  if (status === 'idle') {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50/60 px-5 py-5 text-center">
        <p className="text-sm font-medium text-gray-900 mb-3">{t.feedbackPrompt}</p>
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => sendVote('like')}
            className="rounded-lg bg-white border border-gray-200 hover:border-gray-400 px-4 py-2 text-sm text-gray-800 transition-colors"
          >
            {t.feedbackLike}
          </button>
          <button
            type="button"
            onClick={() => sendVote('dislike')}
            className="rounded-lg bg-white border border-gray-200 hover:border-gray-400 px-4 py-2 text-sm text-gray-800 transition-colors"
          >
            {t.feedbackDislike}
          </button>
        </div>
      </div>
    );
  }

  // Stage 3: comment submitted, terminal state.
  if (status === 'commented') {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50/60 px-5 py-5 text-center">
        <p className="text-sm font-medium text-gray-900">{t.feedbackCommentSuccess}</p>
      </div>
    );
  }

  // Stage 2: vote received, offer comment box.
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 px-5 py-5">
      <p className="text-sm font-medium text-gray-900 text-center">{t.feedbackThanks}</p>
      <p className="text-xs text-gray-500 text-center mt-1">{t.feedbackCommentPrompt}</p>
      <form onSubmit={sendComment} className="mt-3 space-y-2">
        <textarea
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            if (status === 'error') {
              setStatus('voted');
              setErrorMsg(null);
            }
          }}
          placeholder={t.feedbackCommentPlaceholder}
          aria-label={t.feedbackCommentPlaceholder}
          rows={3}
          maxLength={2000}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none"
          disabled={status === 'submitting-comment'}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={status === 'submitting-comment' || comment.trim().length === 0}
            className="rounded-lg bg-gray-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'submitting-comment' ? t.feedbackCommentSubmitting : t.feedbackCommentSubmit}
          </button>
        </div>
        {status === 'error' && errorMsg && (
          <p role="alert" className="text-xs text-red-600">
            {errorMsg}
          </p>
        )}
      </form>
    </div>
  );
}
