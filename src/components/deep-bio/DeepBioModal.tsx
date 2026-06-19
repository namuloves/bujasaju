'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/lib/i18n';
import type { EnrichedPerson } from '@/lib/saju/types';
import type { DeepBio } from '@/lib/deepBio';
import { fetchDeepBio } from '@/lib/deepBio';
import { LoadingSpinner, EmptyBioState, ko } from './DeepBioTabs';
import DeepBioContent from './DeepBioContent';
import { GYEOKGUK_NAMES, getBongi } from '@/lib/saju/constants';
import { getSipSin } from '@/lib/saju/tenGods';
import type { CheonGan, JiJi, SajuResult } from '@/lib/saju/types';
import SajuBadge from '../SajuBadge';
import { HeroPillar } from '../match/SajuHero';
import DaewoonStrip from '../profile/DaewoonStrip';
import { industryToKorean } from '../FilterPanel';
import { JIJANGGAN } from '@/lib/saju/constants';
import { calculateTwelveStages } from '@/lib/saju/analyzer/twelveStages';
import { evaluateHyungChungPaHae } from '@/lib/saju/analyzer/hyungChungPaHae';
import { findHarmonies } from '@/lib/saju/relationships';

const USD_TO_KRW = 1480.71;
const USD_TO_KRW_DATE = '2026.04.09';

/** Normalize photo URL, proxying Wikimedia hotlinks (blocked by browser ORB). */
function normalizePhotoUrl(url: string | undefined | null, name: string, size: number): string {
  if (!url) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=${size}&background=random&bold=true`;
  }
  let normalized = url;
  if (normalized.startsWith('//')) normalized = `https:${normalized}`;
  if (normalized.startsWith('http://')) normalized = normalized.replace(/^http:/, 'https:');
  if (normalized.includes('upload.wikimedia.org/')) {
    return `/api/wiki-image?url=${encodeURIComponent(normalized)}`;
  }
  return normalized;
}

/**
 * Compute Korean 만나이. If a death date is provided, age is frozen at the
 * point of death so we don't show "현재 130세" for historical figures.
 * Returns null for invalid input.
 */
function computeAge(birthday: string | undefined, deathDate?: string | null): number | null {
  if (!birthday) return null;
  const birth = new Date(birthday + 'T00:00:00+09:00');
  if (Number.isNaN(birth.getTime())) return null;
  const reference = deathDate
    ? new Date(deathDate + 'T00:00:00+09:00')
    : new Date();
  if (Number.isNaN(reference.getTime())) return null;
  let age = reference.getFullYear() - birth.getFullYear();
  const m = reference.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && reference.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

function formatNetWorth(netWorth: number, lang: string): string {
  if (lang === 'ko') {
    // netWorth is in billions USD. 1 billion = 10억 KRW-units.
    const eokKrw = netWorth * 10 * USD_TO_KRW; // total in 억 원
    const trillions = eokKrw / 10000; // 1조 = 10,000억
    if (trillions >= 1) {
      const fixed = trillions >= 10 ? Math.round(trillions).toLocaleString() : trillions.toFixed(1);
      return `${fixed}조 원`;
    }
    const eok = Math.round(eokKrw / 100) * 100;
    return `${eok.toLocaleString('ko-KR')}억 원`;
  }
  if (netWorth >= 1) return `$${netWorth.toFixed(1)}B`;
  return `$${(netWorth * 1000).toFixed(0)}M`;
}

interface Props {
  person: EnrichedPerson;
  onClose: () => void;
  /** 사용자 사주 — match flow에서 호출 시 전달. 있으면 "당신과 닮은 점" 박스 노출. */
  userSaju?: SajuResult;
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return desktop;
}

/** Responsive deep bio modal: bottom sheet on mobile, centered modal on desktop. */
export default function DeepBioModal({ person, onClose, userSaju }: Props) {
  const { lang } = useLanguage();
  const isDesktop = useIsDesktop();
  const [bio, setBio] = useState<DeepBio | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDeepBio(person.id).then(data => {
      setBio(data);
      setLoading(false);
    });
  }, [person.id]);

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  }, [handleClose]);

  // Drag-to-dismiss (mobile only)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollEl = scrollRef.current;
    if (scrollEl && scrollEl.scrollTop > 0) return;
    dragStartY.current = e.touches[0].clientY;
    setDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta > 0) setDragY(delta);
  }, [dragging]);

  const handleTouchEnd = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    if (dragY > 120) {
      handleClose();
    } else {
      setDragY(0);
    }
  }, [dragging, dragY, handleClose]);

  const displayName = lang === 'ko' ? (person.nameKo || person.name) : person.name;
  const { saju } = person;
  const hanja = GYEOKGUK_NAMES[saju.gyeokguk] || '';

  const sajuContent = (
    <div className="space-y-6">
      {/* 격국 */}
      <section>
        <h3 className="text-sm font-bold text-gray-900 mb-2">
          {lang === 'ko' ? '격국 (格局)' : 'Pattern (격국)'}
        </h3>
        <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
          <span className="text-lg font-bold text-indigo-600">{saju.gyeokguk}</span>
          {hanja && <span className="text-sm text-gray-400">{hanja}</span>}
        </div>
      </section>

      {/* 사주팔자 Chart — uses HeroPillar to match the results page */}
      <section>
        <h3 className="text-sm font-bold text-gray-900 mb-2">
          {lang === 'ko' ? '사주팔자' : 'Four Pillars'}
        </h3>
        <div className="flex justify-center gap-1.5">
          <HeroPillar label="時" ju={null} ilgan={saju.saju.day.stem as CheonGan} />
          <HeroPillar label="日" ju={saju.saju.day} ilgan={saju.saju.day.stem as CheonGan} isDayPillar />
          <HeroPillar label="月" ju={saju.saju.month} ilgan={saju.saju.day.stem as CheonGan} />
          <HeroPillar label="年" ju={saju.saju.year} ilgan={saju.saju.day.stem as CheonGan} />
        </div>
        {/* 형충파해 */}
        {(() => {
          const matches = evaluateHyungChungPaHae(saju.saju);
          if (matches.length === 0) return null;
          return (
            <div className="mt-3 text-[11px] text-gray-600 text-center">
              <span className="text-[9px] text-gray-400 tracking-wide mr-1.5">{lang === 'ko' ? '형충파해' : 'Clashes'}</span>
              {matches.map((m, i) => (
                <span key={i} className="inline-block mr-1.5">
                  <span className="font-semibold text-rose-600">{m.kind}</span> {m.a}{m.b}
                </span>
              ))}
            </div>
          );
        })()}
        {/* 합 */}
        {(() => {
          const haps = findHarmonies(saju.saju);
          if (haps.length === 0) return null;
          const short = (t: string) => t.replace('합', '');
          return (
            <div className="mt-2 text-[11px] text-gray-600 text-center">
              <span className="text-[9px] text-gray-400 tracking-wide mr-1.5">{lang === 'ko' ? '합' : 'Harmonies'}</span>
              {haps.map((h, i) => (
                <span key={i} className="inline-block mr-1.5">
                  <span className="font-semibold text-emerald-600">{short(h.type)}</span>{' '}
                  {h.elements.join('')}{h.resultElement ? `→${h.resultElement}` : ''}
                </span>
              ))}
            </div>
          );
        })()}
      </section>

      {/* 일주 */}
      <section>
        <h3 className="text-sm font-bold text-gray-900 mb-2">
          {lang === 'ko' ? '일주 (日柱)' : 'Day Pillar (일주)'}
        </h3>
        <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-2">
          <SajuBadge stem={saju.saju.day.stem} branch={saju.saju.day.branch} size="sm" />
        </div>
      </section>
    </div>
  );

  // -- Compact saju chart for mobile Story tab (moved out of the header) --
  const mobileSajuChart = (
    <div>
      <div className="flex justify-center gap-1.5">
        <HeroPillar label="時" ju={null} ilgan={saju.saju.day.stem as CheonGan} compact />
        <HeroPillar label="日" ju={saju.saju.day} ilgan={saju.saju.day.stem as CheonGan} isDayPillar compact />
        <HeroPillar label="月" ju={saju.saju.month} ilgan={saju.saju.day.stem as CheonGan} compact />
        <HeroPillar label="年" ju={saju.saju.year} ilgan={saju.saju.day.stem as CheonGan} compact />
      </div>
      <div className="mt-4">
        <DaewoonStrip person={person} />
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-1">
        {saju.ilju} · {saju.wolji} · {saju.gyeokguk}
      </p>
    </div>
  );

  // -- Header content (shared between both layouts) --
  const header = (
    <div className="relative px-4 lg:px-6 py-3 lg:py-4 shrink-0">
      <a
        href={`/profile/${person.id}`}
        className="absolute top-2 right-14 lg:top-3 lg:right-16 h-8 px-3 flex items-center gap-1 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors z-10 text-xs font-medium"
        aria-label={lang === 'ko' ? '전체 페이지로 열기' : 'Open full page'}
      >
        <span>{lang === 'ko' ? '전체 페이지' : 'Full page'}</span>
        <span className="text-sm leading-none">↗</span>
      </a>
      <button
        onClick={handleClose}
        className="absolute top-2 right-3 lg:top-3 lg:right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors z-10"
        aria-label="Close"
      >
        ✕
      </button>

      {/* Mobile/tablet: photo left + stacked info (mirrors profile page hero) */}
      <div className="flex gap-4 items-start lg:hidden">
        <div className="shrink-0">
          <div className="w-28 h-36 rounded-xl overflow-hidden bg-gray-200 shadow">
            <img
              src={normalizePhotoUrl(person.photoUrl, person.name, 200)}
              alt={person.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&size=200&background=random&bold=true`;
              }}
            />
          </div>
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <h2 className="text-lg font-bold text-gray-900 leading-tight flex items-baseline gap-2 flex-wrap">
            {displayName}
            {(() => {
              const age = computeAge(person.birthday, person.deathDate);
              const ageLabel = age == null
                ? null
                : person.deathDate
                  ? (lang === 'ko' ? `향년 ${age}세` : `aged ${age}`)
                  : (lang === 'ko' ? `${age}세` : `age ${age}`);
              const altName = person.nameKo
                ? (lang === 'ko' ? person.name : person.nameKo)
                : null;
              const parts = [altName, ageLabel].filter(Boolean).join(' · ');
              if (!parts) return null;
              return <span className="text-xs font-normal text-gray-400">{parts}</span>;
            })()}
          </h2>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="font-bold text-gray-900 text-base">
              {lang === 'ko' ? formatNetWorth(person.netWorth, 'ko') : `$${person.netWorth}B`}
            </span>
            {lang === 'ko' && (
              <span className="text-[10px] text-gray-400">${person.netWorth}B</span>
            )}
          </div>
          {/* Meta chips */}
          <div className="flex flex-wrap gap-1 mt-2 text-[10px] text-gray-600">
            <span className="bg-gray-100 px-1.5 py-0.5 rounded-full">
              {lang === 'ko' ? industryToKorean(person.industry) : person.industry}
            </span>
            <span className="bg-gray-100 px-1.5 py-0.5 rounded-full">
              {person.birthday.replace(/-/g, '.')}
              {person.deathDate ? ` – ${person.deathDate.replace(/-/g, '.')}` : ''}
            </span>
            {person.saju && (
              <span className="bg-gray-100 px-1.5 py-0.5 rounded-full">
                {person.saju.ilju} 일주
              </span>
            )}
            {bio?.childhood?.birthPlace && (
              <span className="bg-gray-100 px-1.5 py-0.5 rounded-full">
                {ko(lang, bio.childhood.birthPlace, bio.childhood.birthPlaceKo)}
              </span>
            )}
          </div>
          {person.company && person.company !== person.industry && (
            <p className="mt-2 text-[11px] text-gray-500">
              {person.company}
            </p>
          )}
        </div>
      </div>

      {/* Desktop: photo | bio info — original layout */}
      <div className="hidden lg:flex items-start gap-5 pr-24">
        <div className="shrink-0">
          <div className="w-36 h-44 rounded-lg overflow-hidden bg-gray-200 shadow">
            <img
              src={normalizePhotoUrl(person.photoUrl, person.name, 400)}
              alt={person.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&size=400&background=random&bold=true`;
              }}
            />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3">
            <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
            {person.nameKo && lang === 'ko' && (
              <span className="text-sm text-gray-400">{person.name}</span>
            )}
            {person.nameKo && lang !== 'ko' && (
              <span className="text-sm text-gray-400">{person.nameKo}</span>
            )}
            {(() => {
              const age = computeAge(person.birthday, person.deathDate);
              if (age == null) return null;
              const suffix = person.deathDate
                ? (lang === 'ko' ? `향년 ${age}세` : `aged ${age}`)
                : (lang === 'ko' ? `${age}세` : `age ${age}`);
              return <span className="text-sm text-gray-400">{suffix}</span>;
            })()}
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 flex-wrap">
            <span className="font-bold text-gray-900 text-lg">
              {lang === 'ko' ? formatNetWorth(person.netWorth, 'ko') : `$${person.netWorth}B`}
            </span>
            {lang === 'ko' && (
              <span className="text-xs text-gray-400">${person.netWorth}B</span>
            )}
            {(() => {
              // Cite where the net-worth figure comes from. v2 bios stash URLs
              // in capitalOrigin/moneyMechanics; pick the first reasonable one
              // and label it by domain (Forbes / Bloomberg / Wikipedia / etc.).
              const co = (bio as unknown as { capitalOrigin?: { source?: string }; moneyMechanics?: { source?: string } });
              const raw = co?.capitalOrigin?.source || co?.moneyMechanics?.source;
              if (!raw) return null;
              const firstUrl = raw.split(/[\s;,]+/).find(s => /^https?:\/\//.test(s));
              if (!firstUrl) return null;
              const host = firstUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
              const label = host.split('.')[0];
              const display = label.charAt(0).toUpperCase() + label.slice(1);
              return (
                <>
                  <span className="text-gray-300">·</span>
                  <a
                    href={firstUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:text-gray-700 underline decoration-dotted underline-offset-2"
                    title={firstUrl}
                  >
                    {lang === 'ko' ? `출처 ${display}` : `via ${display}`}
                  </a>
                </>
              );
            })()}
            {person.company && person.company !== person.industry && (
              <>
                <span className="text-gray-300">·</span>
                <span>{person.company}</span>
              </>
            )}
            <span className="text-gray-300">·</span>
            <span>{lang === 'ko' ? industryToKorean(person.industry) : person.industry}</span>
            <span className="text-gray-300">·</span>
            <span>{person.birthday.replace(/-/g, '.')}{person.deathDate ? ` - ${person.deathDate.replace(/-/g, '.')}` : ''}</span>
            {person.saju && (
              <>
                <span className="text-gray-300">·</span>
                <span>{person.saju.ilju} 일주</span>
              </>
            )}
            {bio?.childhood?.birthPlace && (
              <>
                <span className="text-gray-300">·</span>
                <span>{ko(lang, bio.childhood.birthPlace, bio.childhood.birthPlaceKo)}</span>
              </>
            )}
          </div>
          <div className="mt-1.5 text-xs text-gray-500">
            {saju.ilju} · {saju.wolji} · {saju.gyeokguk}
          </div>
          {bio?.childhood && (
            <div className="mt-2 text-xs text-gray-500 leading-relaxed">
              {ko(lang, bio.childhood.earlyLife, bio.childhood.earlyLifeKo)}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(
    <div
      className={`fixed inset-0 z-50 transition-colors duration-300 ${visible ? 'bg-black/40' : 'bg-transparent'} ${
        isDesktop ? 'flex items-center justify-center' : ''
      }`}
      onClick={handleBackdropClick}
    >
      {isDesktop ? (
        /* ---- Desktop: centered modal ---- */
        <div
          className={`bg-white rounded-2xl flex flex-col overflow-hidden shadow-2xl transition-all duration-300 ease-out ${
            visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          style={{
            width: '75vw',
            maxWidth: '1100px',
            height: '92vh',
            maxHeight: '92vh',
          }}
        >
          {header}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            {loading ? (
              <LoadingSpinner />
            ) : !bio ? (
              <div className="p-6 pb-10">
                <EmptyBioState lang={lang} />
              </div>
            ) : (
              <div className="px-8 pb-12 pt-2 space-y-8">
                {/* Top row: 사주 차트 (left, fit-to-content) + 한눈에 보는 정보 (right, fills remaining) */}
                <section className="flex gap-16 items-start">
                  <div className="shrink-0 w-72">
                    <h3 className="text-sm font-bold text-gray-900 mb-4">
                      {lang === 'ko' ? '사주' : 'Saju'}
                    </h3>
                    <div className="flex justify-between gap-3">
                      <HeroPillar label="時" ju={null} ilgan={saju.saju.day.stem as CheonGan} large />
                      <HeroPillar label="日" ju={saju.saju.day} ilgan={saju.saju.day.stem as CheonGan} isDayPillar large />
                      <HeroPillar label="月" ju={saju.saju.month} ilgan={saju.saju.day.stem as CheonGan} large />
                      <HeroPillar label="年" ju={saju.saju.year} ilgan={saju.saju.day.stem as CheonGan} large />
                    </div>
                    {/* 지장간 — sits right under the sipsin label of each branch cell */}
                    <div className="-mt-1 flex justify-between gap-1.5 text-[10px] text-gray-500">
                      {[
                        { label: '時', branch: saju.saju.hour?.branch },
                        { label: '日', branch: saju.saju.day.branch },
                        { label: '月', branch: saju.saju.month.branch },
                        { label: '年', branch: saju.saju.year.branch },
                      ].map((p, i) => (
                        <div key={i} className="flex-1 text-center">
                          {p.branch ? JIJANGGAN[p.branch].join(' · ') : '·'}
                        </div>
                      ))}
                    </div>
                    {/* 12운성 — per-pillar */}
                    <div className="mt-1.5 flex justify-between gap-1.5 text-[10px] text-gray-600">
                      {(() => {
                        const stages = calculateTwelveStages(saju.saju);
                        const byPillar = new Map(stages.map(s => [s.pillar, s.stage]));
                        return ['시', '일', '월', '년'].map((p, i) => (
                          <div key={i} className="flex-1 text-center">
                            {byPillar.get(p as '시' | '일' | '월' | '년') ?? '·'}
                          </div>
                        ));
                      })()}
                    </div>
                    {/* 형충파해 */}
                    {(() => {
                      const matches = evaluateHyungChungPaHae(saju.saju);
                      if (matches.length === 0) return null;
                      return (
                        <div className="mt-3 text-[11px] text-gray-600 text-center">
                          <span className="text-[9px] text-gray-400 tracking-wide mr-1.5">{lang === 'ko' ? '형충파해' : 'Clashes'}</span>
                          {matches.map((m, i) => (
                            <span key={i} className="inline-block mr-1.5">
                              <span className="font-semibold text-rose-600">{m.kind}</span> {m.a === m.b ? `${m.a}${m.b}` : `${m.a}${m.b}`}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                    {/* 합 (천간합·육합·삼합·방합) */}
                    {(() => {
                      const haps = findHarmonies(saju.saju);
                      if (haps.length === 0) return null;
                      // Short type label: 천간합 → 천간, 육합/삼합/방합 그대로
                      const short = (t: string) => t.replace('합', '');
                      return (
                        <div className="mt-2 text-[11px] text-gray-600 text-center">
                          <span className="text-[9px] text-gray-400 tracking-wide mr-1.5">{lang === 'ko' ? '합' : 'Harmonies'}</span>
                          {haps.map((h, i) => (
                            <span key={i} className="inline-block mr-1.5">
                              <span className="font-semibold text-emerald-600">{short(h.type)}</span>{' '}
                              {h.elements.join('')}
                              {h.resultElement ? `→${h.resultElement}` : ''}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">
                      {lang === 'ko' ? '한눈에 보는 정보' : 'Key Facts'}
                    </h3>
                    <dl className="rounded-lg border border-gray-100 divide-y divide-gray-100">
                      {bio.childhood?.birthPlace && (
                        <div className="flex gap-3 px-3 py-2.5">
                          <dt className="text-xs text-gray-500 font-medium w-20 shrink-0 pt-0.5">{lang === 'ko' ? '출생지' : 'Born'}</dt>
                          <dd className="text-sm text-gray-800 leading-snug flex-1">{ko(lang, bio.childhood.birthPlace, bio.childhood.birthPlaceKo)}</dd>
                        </div>
                      )}
                      {bio.childhood?.familyBackground && (
                        <div className="flex gap-3 px-3 py-2.5">
                          <dt className="text-xs text-gray-500 font-medium w-20 shrink-0 pt-0.5">{lang === 'ko' ? '집안' : 'Family'}</dt>
                          <dd className="text-sm text-gray-800 leading-snug flex-1">{ko(lang, bio.childhood.familyBackground, bio.childhood.familyBackgroundKo)}</dd>
                        </div>
                      )}
                      {bio.childhood?.education && (
                        <div className="flex gap-3 px-3 py-2.5">
                          <dt className="text-xs text-gray-500 font-medium w-20 shrink-0 pt-0.5">{lang === 'ko' ? '학력' : 'Education'}</dt>
                          <dd className="text-sm text-gray-800 leading-snug flex-1">{ko(lang, bio.childhood.education, bio.childhood.educationKo)}</dd>
                        </div>
                      )}
                      {person.wealthOrigin && (
                        <div className="flex gap-3 px-3 py-2.5">
                          <dt className="text-xs text-gray-500 font-medium w-20 shrink-0 pt-0.5">{lang === 'ko' ? '부의 출처' : 'Source'}</dt>
                          <dd className="text-sm text-gray-800 leading-snug flex-1">
                            {lang === 'ko'
                              ? (person.wealthOrigin === 'self-made' ? '자수성가' : person.wealthOrigin === 'inherited' ? '상속' : person.wealthOrigin)
                              : person.wealthOrigin}
                          </dd>
                        </div>
                      )}
                      {(() => {
                        // v2 deep bios carry a richer capitalOrigin.explanationKo
                        // paragraph describing HOW the wealth was actually formed
                        // (재벌 승계 사다리 / 창업 자본 등). Surface it as its own row.
                        const co = (bio as unknown as { capitalOrigin?: { explanationKo?: string; explanation?: string } }).capitalOrigin;
                        const text = co?.explanationKo || co?.explanation;
                        if (!text) return null;
                        return (
                          <div className="flex gap-3 px-3 py-2.5">
                            <dt className="text-xs text-gray-500 font-medium w-20 shrink-0 pt-0.5">{lang === 'ko' ? '자본 출처' : 'Capital'}</dt>
                            <dd className="text-sm text-gray-800 leading-snug flex-1">{text}</dd>
                          </div>
                        );
                      })()}
                      {person.source && (
                        <div className="flex gap-3 px-3 py-2.5">
                          <dt className="text-xs text-gray-500 font-medium w-20 shrink-0 pt-0.5">{lang === 'ko' ? '출처' : 'Provenance'}</dt>
                          <dd className="text-sm text-gray-800 leading-snug flex-1">{person.source}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </section>
                {/* 대운 흐름 (full-width, below the row) */}
                <DaewoonStrip person={person} />
                <div className="pt-2 border-t border-gray-100">
                  <DeepBioContent bio={bio} person={person} userSaju={userSaju} lang={lang} hideKeyFacts />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ---- Mobile: bottom sheet ---- */
        <div
          className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl flex flex-col overflow-hidden ${
            !dragging ? 'transition-transform duration-300 ease-out' : ''
          }`}
          style={{
            height: '98dvh',
            maxHeight: '98dvh',
            transform: visible ? `translateY(${dragY}px)` : 'translateY(100%)',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>

          {header}

          <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
            {loading ? (
              <LoadingSpinner />
            ) : !bio ? (
              <div className="p-5 pb-10">
                <EmptyBioState lang={lang} />
              </div>
            ) : (
              <div className="p-5 pb-10">
                <DeepBioContent bio={bio} person={person} userSaju={userSaju} lang={lang} mobileHeader={mobileSajuChart}  />
              </div>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
