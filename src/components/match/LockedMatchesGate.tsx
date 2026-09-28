'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import { industryToKorean } from '@/components/FilterPanel';
import type { EnrichedPerson } from '@/lib/saju/types';
import { EMAIL_RE } from '@/lib/email';
import {
  emailFailureReasonForStatus,
  useEmailCaptureAnalytics,
} from '@/lib/emailCaptureAnalytics';

/**
 * LockedMatchesGate — email-capture incentive on the results page.
 *
 * Shows up to N billionaires beyond the Top3 row with the name/photo
 * redacted (country + industry only). An inline email form sits below
 * the locked cards; submitting exchanges the address for the same global
 * entitlement used by the profile wall, reveals the cards immediately, and
 * sends a portable copy of the result by email.
 *
 * Marketing consent is optional and separate from transactional result
 * delivery. The access email is always recorded in `access:emails`; only an
 * affirmative checkbox adds it to the marketing `emails` list.
 */


const NATIONALITY_KO: Record<string, string> = {
  US: '미국', KR: '한국', CN: '중국', JP: '일본', IN: '인도', FR: '프랑스',
  DE: '독일', GB: '영국', RU: '러시아', BR: '브라질', CA: '캐나다',
  AE: 'UAE', SA: '사우디', SE: '스웨덴', AU: '호주', IT: '이탈리아',
  ES: '스페인', NL: '네덜란드', CH: '스위스', SG: '싱가포르', HK: '홍콩',
  TW: '대만', TH: '태국', MX: '멕시코', AR: '아르헨티나', NO: '노르웨이',
  ID: '인도네시아', PH: '필리핀', MY: '말레이시아', VN: '베트남',
  CZ: '체코', PL: '폴란드', AT: '오스트리아', BE: '벨기에', DK: '덴마크',
  FI: '핀란드', GR: '그리스', IE: '아일랜드', PT: '포르투갈', TR: '터키',
  ZA: '남아공', NG: '나이지리아', EG: '이집트', IL: '이스라엘',
  CL: '칠레', CO: '콜롬비아', PE: '페루', VE: '베네수엘라',
};

function nationalityKo(code: string | undefined, lang: string): string {
  if (!code) return '';
  if (lang !== 'ko') return code;
  return NATIONALITY_KO[code] || code;
}

const USD_TO_KRW = 1480.71;
function formatWorth(netWorthB: number, lang: string): string {
  if (lang === 'ko') {
    const eok = netWorthB * 10 * USD_TO_KRW;
    const jo = eok / 10000;
    if (jo >= 1) return `${jo >= 10 ? Math.round(jo) : jo.toFixed(1)}조`;
    return `${Math.round(eok).toLocaleString('ko-KR')}억`;
  }
  if (netWorthB >= 1) return `$${netWorthB.toFixed(1)}B`;
  return `$${(netWorthB * 1000).toFixed(0)}M`;
}

interface Props {
  /** Pool of matches *after* the Top3 row — these are what the gate hides. */
  lockedPeople: EnrichedPerson[];
  /** User's day-pillar string ("임진" etc.), shown in the headline. */
  ilju: string;
}

type Status = 'idle' | 'submitting' | 'error';
type DeliveryStatus = 'idle' | 'sending' | 'sent' | 'failed' | 'suppressed';

export default function LockedMatchesGate({ lockedPeople, ilju }: Props) {
  const { t, lang } = useLanguage();
  const [email, setEmail] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [accessChecked, setAccessChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>('idle');
  const [lastSubmittedEmail, setLastSubmittedEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Shown after a successful submit. Auto-dismisses on "확인" click.
  const [showSentDialog, setShowSentDialog] = useState(false);
  const {
    gateRef,
    trackFormStarted,
    trackSignupCompleted,
    trackSignupFailed,
  } = useEmailCaptureAnalytics({
    captureSource: 'unlock-gate',
    language: lang,
  });

  // The entitlement cookie is httpOnly, so ask the shared endpoint whether
  // this browser already unlocked via a profile wall or an earlier result.
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/unlock', {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { unlocked?: boolean };
        if (data.unlocked) setUnlocked(true);
      })
      .catch(() => {
        // A status-check failure should never block a fresh unlock attempt.
      })
      .finally(() => {
        if (!controller.signal.aborted) setAccessChecked(true);
      });
    return () => controller.abort();
  }, []);

  function emailMatchesPayload() {
    return lockedPeople.map((p) => ({
      id: p.id,
      name: p.name,
      nameKo: p.nameKo ?? null,
      photoUrl: p.photoUrl ?? null,
      nationality: p.nationality,
      industry: p.industry,
      source: p.source ?? null,
      companyKo: p.companyKo ?? null,
      netWorth: p.netWorth,
      bioKo: p.bioKo ?? null,
      bio: p.bio ?? null,
    }));
  }

  async function sendResultEmail(recipient: string): Promise<boolean> {
    setDeliveryStatus('sending');
    try {
      const res = await fetch('/api/send-match-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: recipient,
          ilju,
          matches: emailMatchesPayload(),
          lang,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        suppressed?: string;
      };
      if (data.suppressed) {
        setDeliveryStatus('suppressed');
        return false;
      }
      if (!res.ok || data.ok !== true) {
        setDeliveryStatus('failed');
        return false;
      }
      setDeliveryStatus('sent');
      setShowSentDialog(true);
      return true;
    } catch {
      setDeliveryStatus('failed');
      return false;
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'submitting') return;
    trackFormStarted();

    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      trackSignupFailed('invalid_email');
      setStatus('error');
      setErrorMsg(t.emailCaptureErrorInvalid);
      return;
    }

    setStatus('submitting');
    setErrorMsg(null);

    let unlockRes: Response;
    try {
      unlockRes = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          lang,
          source: 'unlock-gate',
          marketingConsent,
          ilju,
          matchIds: lockedPeople.map((person) => person.id),
        }),
      });
    } catch {
      trackSignupFailed('network_error');
      setStatus('error');
      setErrorMsg(t.emailCaptureErrorGeneric);
      return;
    }

    if (!unlockRes.ok) {
      trackSignupFailed(emailFailureReasonForStatus(unlockRes.status), unlockRes.status);
      setStatus('error');
      setErrorMsg(t.emailCaptureErrorGeneric);
      return;
    }

    const unlockData = (await unlockRes.json().catch(() => ({}))) as {
      captured?: boolean;
      isNewContact?: boolean;
      isNewSubscriber?: boolean;
    };
    if (unlockData.captured === false) {
      trackSignupFailed('storage_error');
    } else {
      trackSignupCompleted(
        unlockData.isNewContact !== false,
        marketingConsent,
        unlockData.isNewSubscriber === true,
      );
    }

    // Access is the primary promise. Reveal immediately after the shared
    // entitlement succeeds; email delivery follows and gets its own status.
    setUnlocked(true);
    setLastSubmittedEmail(trimmed);
    setStatus('idle');
    setEmail('');
    await sendResultEmail(trimmed);
  }

  async function handleRetryEmail() {
    if (!lastSubmittedEmail || deliveryStatus === 'sending') return;
    await sendResultEmail(lastSubmittedEmail);
  }

  if (lockedPeople.length === 0) return null;

  // Avoid flashing a gate (and recording a false gate impression) for a
  // browser that already holds the global entitlement cookie.
  if (!accessChecked) {
    return (
      <div
        className="mt-8 h-28 animate-pulse rounded-2xl border border-gray-100 bg-gray-50/60"
        aria-hidden
      />
    );
  }

  const count = lockedPeople.length;
  const headline = unlocked
    ? (lang === 'ko' ? '전체 결과가 열렸어요' : 'Your full results are unlocked')
    : (lang === 'ko'
      ? `같은 ${ilju} 일주의 부자 ${count}명이 더 있어요`
      : `${count} more billionaires share your ${ilju} day-pillar`);
  const subline = unlocked
    ? (lang === 'ko'
      ? '이제 모든 부자 프로필을 자유롭게 볼 수 있어요'
      : 'You can now explore every billionaire profile')
    : (lang === 'ko'
      ? '이메일로 전체 결과를 열고, 다시 볼 수 있게 보내드릴게요'
      : 'Unlock the full result and receive a copy by email.');

  return (
    <div
      ref={gateRef}
      className={`mt-8 rounded-2xl border px-4 sm:px-5 py-5 transition-colors ${
        unlocked
          ? 'border-emerald-200 bg-emerald-50/35'
          : 'border-gray-200 bg-gray-50/40'
      }`}
    >
      <div className="text-center mb-4">
        {unlocked && (
          <div className="mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700" aria-hidden>
            ✓
          </div>
        )}
        <h3 className="text-sm font-bold text-gray-900">{headline}</h3>
        <p className="text-xs text-gray-500 mt-1">{subline}</p>
      </div>

      <ul className="space-y-2">
        {lockedPeople.map((p, i) => (
          <LockedRow key={p.id} person={p} unlocked={unlocked} rank={i + 4} lang={lang} />
        ))}
      </ul>

      {!unlocked && (
        <form onSubmit={handleSubmit} className="mt-5 pt-4 border-t border-gray-200 space-y-3" noValidate>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onFocus={trackFormStarted}
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
              className="flex-1 min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200"
              disabled={status === 'submitting'}
            />
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:bg-gray-400 transition-colors whitespace-nowrap"
            >
              {status === 'submitting'
                ? t.emailCaptureSubmitting
                : (lang === 'ko' ? '전체 결과 열기' : 'Unlock full results')}
            </button>
          </div>

          <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={marketingConsent}
              onFocus={trackFormStarted}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
              disabled={status === 'submitting'}
            />
            <span>
              {lang === 'ko'
                ? `새로운 ${ilju} 일주 부자 분석도 받아보기 (선택)`
                : `Send me new ${ilju} billionaire analyses (optional)`}
            </span>
          </label>

          <p className="text-[10.5px] text-gray-400 leading-snug">
            {lang === 'ko'
              ? '전체 결과 이메일은 바로 보내드려요. 새 소식 수신은 선택사항입니다.'
              : 'We send your result immediately. Product updates are optional.'}
          </p>
          {status === 'error' && errorMsg && (
            <p role="alert" className="text-xs text-red-600">
              {errorMsg}
            </p>
          )}
        </form>
      )}

      {unlocked && deliveryStatus === 'failed' && (
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-amber-800">
            {lang === 'ko'
              ? '전체 결과는 열렸지만 이메일을 보내지 못했어요.'
              : 'Your results are unlocked, but the email could not be sent.'}
          </p>
          <button
            type="button"
            onClick={handleRetryEmail}
            className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
          >
            {lang === 'ko' ? '이메일 다시 보내기' : 'Retry email'}
          </button>
        </div>
      )}

      {unlocked && deliveryStatus === 'suppressed' && (
        <p className="mt-4 rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-xs leading-relaxed text-gray-600">
          {lang === 'ko'
            ? '이 이메일 주소로는 결과를 다시 보낼 수 없지만, 전체 프로필 열람은 활성화됐어요.'
            : 'We cannot resend to this address, but full profile access is active.'}
        </p>
      )}

      {unlocked && deliveryStatus === 'sending' && (
        <p className="mt-3 text-center text-xs text-gray-500" role="status">
          {lang === 'ko' ? '저장된 결과를 이메일로 보내는 중…' : 'Emailing your saved result…'}
        </p>
      )}

      {showSentDialog && (
        <SentDialog lang={lang} onClose={() => setShowSentDialog(false)} />
      )}
    </div>
  );
}

/**
 * Confirmation dialog shown after both access and transactional delivery
 * succeed. It reinforces the site-wide entitlement and nudges the visitor to
 * check spam because Gmail/Naver may route a first message away from inbox.
 *
 * Closes on backdrop click, Escape key, or the explicit 확인 button.
 */
function SentDialog({ lang, onClose }: { lang: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sent-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      {/* Card */}
      <div className="relative w-full max-w-xs rounded-2xl bg-white px-5 py-6 text-center shadow-xl">
        <div className="text-3xl mb-3" aria-hidden>📬</div>
        <h4 id="sent-dialog-title" className="text-base font-bold text-gray-900">
          {lang === 'ko' ? '전체 결과가 열렸어요!' : 'Your full results are unlocked!'}
        </h4>
        <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
          {lang === 'ko'
            ? '저장된 결과도 이메일로 보냈어요. 보이지 않으면 스팸함을 확인해주세요.'
            : 'We also emailed your saved result. Check spam if you do not see it.'}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
        >
          {lang === 'ko' ? '확인' : 'OK'}
        </button>
      </div>
    </div>
  );
}

function LockedRow({
  person,
  unlocked,
  rank,
  lang,
}: {
  person: EnrichedPerson;
  unlocked: boolean;
  rank: number;
  lang: string;
}) {
  const country = nationalityKo(person.nationality, lang);
  const industry = lang === 'ko' ? industryToKorean(person.industry) : person.industry;
  const worth = formatWorth(person.netWorth, lang);
  const displayName = lang === 'ko' ? (person.nameKo || person.name) : person.name;

  // Inner card content is shared between the locked and unlocked states —
  // only the wrapping element differs (li vs Link inside li) so we factor
  // it out and let the parent decide.
  const inner = (
    <>
      <div className="text-xs font-bold text-gray-400 w-5 shrink-0">#{rank}</div>

      {/* Photo / placeholder. Avatar stays grey until unlocked — we
          never load the real photo before the user submits. */}
      <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
        {unlocked ? (
          <img
            src={person.photoUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&size=80&background=random&bold=true`}
            alt={person.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&size=80&background=random&bold=true`;
            }}
          />
        ) : (
          <span className="text-base" aria-hidden>🔒</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {unlocked ? (
          <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
            {displayName}
          </p>
        ) : (
          <p className="text-sm font-semibold text-gray-300 leading-tight tracking-wider select-none">
            ███████
          </p>
        )}
        <p className="text-[11px] text-gray-500 mt-0.5 leading-tight truncate">
          {[country, industry].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="text-sm font-bold text-gray-900 shrink-0 tabular-nums">
        {worth}
      </div>

      {/* Tiny chevron — only on unlocked rows so the row reads as a link. */}
      {unlocked && (
        <span className="text-gray-400 shrink-0 text-base leading-none" aria-hidden>
          ›
        </span>
      )}
    </>
  );

  // Unlocked: whole row is a link to the person's profile page.
  if (unlocked) {
    return (
      <li>
        <Link
          href={`/profile/${person.id}`}
          className="flex items-center gap-3 rounded-xl bg-white border border-gray-100 px-3 py-2.5 transition-colors hover:bg-gray-50 hover:border-gray-200"
        >
          {inner}
        </Link>
      </li>
    );
  }

  // Locked: static row, no link.
  return (
    <li className="flex items-center gap-3 rounded-xl bg-white border border-gray-100 px-3 py-2.5">
      {inner}
    </li>
  );
}
