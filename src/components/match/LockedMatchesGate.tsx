'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useLanguage } from '@/lib/i18n';
import { industryToKorean } from '@/components/FilterPanel';
import type { EnrichedPerson } from '@/lib/saju/types';

/**
 * LockedMatchesGate — email-capture incentive on the results page.
 *
 * Shows up to N billionaires beyond the Top3 row with the name/photo
 * redacted (country + industry only). An inline email form sits below
 * the locked cards; submitting flips local state to "unlocked" which
 * reveals everything client-side. Persists across reloads via
 * localStorage so we don't keep nagging the same visitor.
 *
 * Posts to /api/subscribe with source: 'unlock-gate' so we can slice
 * signups by surface later. No consent checkbox here — this gate
 * doubles as the consent moment ("submit to see the rest").
 */

const STORAGE_KEY = 'bujasaju_matches_unlocked';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export default function LockedMatchesGate({ lockedPeople, ilju }: Props) {
  const { t, lang } = useLanguage();
  const [unlocked, setUnlocked] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Restore unlock state on mount. We deliberately read localStorage in an
  // effect (not lazy initial state) so SSR and the first client render
  // agree — otherwise hydration would mismatch on returning visitors.
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') {
        setUnlocked(true);
      }
    } catch {
      // Ignore — private mode, disabled storage, etc.
    }
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'submitting') return;

    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setStatus('error');
      setErrorMsg(t.emailCaptureErrorInvalid);
      return;
    }

    setStatus('submitting');
    setErrorMsg(null);
    try {
      // We post-and-forget conceptually, but await the response so we
      // can show an error if Redis is down. The submission implies
      // consent because this gate's headline says so.
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          consent: true,
          lang,
          source: 'unlock-gate',
        }),
      });
      if (!res.ok) {
        setStatus('error');
        setErrorMsg(t.emailCaptureErrorGeneric);
        return;
      }
      // Persist + flip state. We unlock even if the network call later
      // races — the user kept their side of the bargain.
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
      setUnlocked(true);

      // Fire-and-forget: send the matches via email. We don't await it —
      // the user already sees their reveal, the mail is a bonus that
      // arrives in their inbox a few seconds later. Errors are logged
      // but never block the UX.
      const slimMatches = lockedPeople.map((p) => ({
        id: p.id,
        name: p.name,
        nameKo: p.nameKo ?? null,
        photoUrl: p.photoUrl ?? null,
        nationality: p.nationality,
        industry: p.industry,
        netWorth: p.netWorth,
      }));
      void fetch('/api/send-match-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          ilju,
          matches: slimMatches,
          lang,
        }),
      }).catch(() => {
        // Swallow — the unlock already happened, email is the bonus.
      });
    } catch {
      setStatus('error');
      setErrorMsg(t.emailCaptureErrorGeneric);
    }
  }

  if (lockedPeople.length === 0) return null;

  const count = lockedPeople.length;
  const headline = unlocked
    ? (lang === 'ko' ? `잠금 해제됨 — ${count}명 더 보기` : `Unlocked — ${count} more to explore`)
    : (lang === 'ko'
        ? `같은 ${ilju} 일주의 부자 ${count}명이 더 있어요`
        : `${count} more billionaires share your ${ilju} day-pillar`);
  const subline = unlocked
    ? (lang === 'ko' ? '아래 카드를 눌러서 더 알아보세요.' : 'Tap a card to dive in.')
    : (lang === 'ko'
        ? '이메일을 남겨주시면 누군지 알려드릴게요'
        : 'Drop your email and we’ll show you who.');

  return (
    <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50/40 px-4 sm:px-5 py-5">
      <div className="text-center mb-4">
        <h3 className="text-sm font-bold text-gray-900">{headline}</h3>
        <p className="text-xs text-gray-500 mt-1">{subline}</p>
      </div>

      <ul className="space-y-2">
        {lockedPeople.map((p, i) => (
          <LockedRow key={p.id} person={p} unlocked={unlocked} rank={i + 4} lang={lang} />
        ))}
      </ul>

      {!unlocked && (
        <form onSubmit={handleSubmit} className="mt-5 pt-4 border-t border-gray-200 space-y-2" noValidate>
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
                : (lang === 'ko' ? '🔓 누구인지 보기' : '🔓 Show me who')}
            </button>
          </div>
          <p className="text-[10.5px] text-gray-400 leading-snug">
            {lang === 'ko'
              ? '제출하시면 새 부자 소식 이메일을 받게 돼요. 언제든 해지 가능합니다.'
              : 'By submitting you agree to receive updates. Unsubscribe anytime.'}
          </p>
          {status === 'error' && errorMsg && (
            <p role="alert" className="text-xs text-red-600">
              {errorMsg}
            </p>
          )}
        </form>
      )}
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

  return (
    <li className="flex items-center gap-3 rounded-xl bg-white border border-gray-100 px-3 py-2.5">
      <div className="text-xs font-bold text-gray-400 w-5 shrink-0">#{rank}</div>

      {/* Photo / placeholder. Avatar is always grey until unlocked — we
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
    </li>
  );
}
