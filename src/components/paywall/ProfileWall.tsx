'use client';

import { useState, type FormEvent } from 'react';
import { useLanguage } from '@/lib/i18n';
import { FREE_PROFILE_VIEWS } from '@/lib/paywall';
import { EMAIL_RE } from '@/lib/email';

/**
 * ProfileWall — shown in place of a profile once the free sample is used up.
 *
 * Asks for an email rather than a password: there is no account system, and
 * this reuses /api/subscribe (the same endpoint behind the match gate), so a
 * visitor is one field away from continuing. On success the server sets the
 * unlock cookie and we reload so the profile renders normally.
 *
 * Mirrors EmailCaptureCard's state machine and validation regex so the two
 * capture points behave identically.
 */


type Status = 'idle' | 'submitting' | 'error';

export default function ProfileWall({ personName }: { personName?: string }) {
  const { lang } = useLanguage();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const ko = lang === 'ko';

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'submitting') return;

    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setStatus('error');
      setErrorMsg(ko ? '이메일 주소를 확인해주세요.' : 'Please check your email address.');
      return;
    }

    setStatus('submitting');
    setErrorMsg(null);

    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: trimmed, lang, source: 'profile-wall' }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'failed');
      }
      // The unlock cookie is set by the server on this response. Reload so
      // the page re-renders with full access rather than trying to patch
      // state in place.
      window.location.reload();
    } catch {
      setStatus('error');
      setErrorMsg(
        ko ? '잠시 후 다시 시도해주세요.' : 'Something went wrong — please try again.',
      );
    }
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-16 sm:py-24 text-center">
      <div className="rounded-2xl border border-gray-200 bg-white p-7 sm:p-9 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
          {ko ? '무료 열람을 모두 사용했어요' : 'Free preview used up'}
        </p>

        <h2 className="mt-3 text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
          {ko
            ? '이메일만 남기면 계속 볼 수 있어요'
            : 'Enter your email to keep reading'}
        </h2>

        <p className="mt-3 text-sm text-gray-600 leading-relaxed">
          {ko
            ? `무료로 ${FREE_PROFILE_VIEWS}명의 사주를 보셨어요. 이메일을 남기시면 3,000명이 넘는 부자들의 사주 분석을 계속 보실 수 있어요.`
            : `You've read ${FREE_PROFILE_VIEWS} profiles for free. Leave your email to keep exploring saju readings for 3,000+ billionaires.`}
          {personName ? (ko ? ` ${personName}님의 분석도 바로 이어서 볼 수 있어요.` : ` Including ${personName}.`) : ''}
        </p>

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === 'error') setStatus('idle');
              }}
              placeholder={ko ? '이메일 주소' : 'you@example.com'}
              aria-label={ko ? '이메일 주소' : 'Email address'}
              className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
            />
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {status === 'submitting'
                ? ko ? '확인 중…' : 'Checking…'
                : ko ? '계속 보기' : 'Continue'}
            </button>
          </div>

          {errorMsg && (
            <p role="alert" className="mt-2.5 text-xs text-red-600">
              {errorMsg}
            </p>
          )}

          <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
            {ko
              ? '새로운 부자 사주 분석 소식을 보내드려요. 언제든 수신 거부할 수 있어요.'
              : 'We send occasional updates on new saju readings. Unsubscribe anytime.'}
          </p>
        </form>
      </div>
    </div>
  );
}
