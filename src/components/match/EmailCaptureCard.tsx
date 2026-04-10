'use client';

import { useState, type FormEvent } from 'react';
import { useLanguage } from '@/lib/i18n';

/**
 * EmailCaptureCard — asks the user to save their email for updates.
 *
 * Posts to /api/subscribe which writes into Upstash Redis. The server is
 * the source of truth; the client-side regex is only for immediate
 * feedback so people aren't surprised by a round-trip rejection.
 *
 * State machine:
 *   idle → submitting → success
 *                    ↘ error (back to idle on next keystroke)
 *
 * Once a user successfully submits in this session, we swap the whole
 * card for a thank-you note. No localStorage gating — if they refresh
 * the page they'll see it again, which is fine for a v1.
 */

// Mirrors the regex in src/app/api/subscribe/route.ts so rejects are
// consistent on both sides.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function EmailCaptureCard() {
  const { t, lang } = useLanguage();
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'submitting') return;

    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setStatus('error');
      setErrorMsg(t.emailCaptureErrorInvalid);
      return;
    }
    if (!consent) {
      setStatus('error');
      setErrorMsg(t.emailCaptureErrorConsent);
      return;
    }

    setStatus('submitting');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          consent: true,
          lang,
          source: 'match-results',
        }),
      });
      if (!res.ok) {
        // Map known server errors back to localized copy where possible.
        let err = t.emailCaptureErrorGeneric;
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error === 'invalid_email') err = t.emailCaptureErrorInvalid;
          else if (data.error === 'consent_required') err = t.emailCaptureErrorConsent;
        } catch {
          // ignore parse failure, keep generic message
        }
        setStatus('error');
        setErrorMsg(err);
        return;
      }
      setStatus('success');
    } catch {
      setStatus('error');
      setErrorMsg(t.emailCaptureErrorGeneric);
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-5 py-6 text-center">
        <div className="text-2xl mb-2" aria-hidden>
          ✉️
        </div>
        <p className="text-sm font-medium text-indigo-900">
          {t.emailCaptureSuccess}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-5">
      <h3 className="text-base font-bold text-gray-900">
        {t.emailCaptureTitle}
      </h3>
      <p className="mt-1 text-sm text-gray-600">{t.emailCaptureSubtitle}</p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3" noValidate>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === 'error') {
                setStatus('idle');
                setErrorMsg(null);
              }
            }}
            placeholder={t.emailCapturePlaceholder}
            aria-label={t.emailCapturePlaceholder}
            aria-invalid={status === 'error'}
            className="flex-1 min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            disabled={status === 'submitting'}
          />
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
          >
            {status === 'submitting' ? t.emailCaptureSubmitting : t.emailCaptureSubmit}
          </button>
        </div>

        <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked);
              if (status === 'error') {
                setStatus('idle');
                setErrorMsg(null);
              }
            }}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>{t.emailCaptureConsent}</span>
        </label>

        {status === 'error' && errorMsg && (
          <p role="alert" className="text-xs text-red-600">
            {errorMsg}
          </p>
        )}
      </form>
    </div>
  );
}
