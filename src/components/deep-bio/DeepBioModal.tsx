'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/lib/i18n';
import type { EnrichedPerson } from '@/lib/saju/types';
import type { DeepBio } from '@/lib/deepBio';
import { fetchDeepBio } from '@/lib/deepBio';
import { TabBar, TabContent, LoadingSpinner, EmptyBioState, ko, type Tab } from './DeepBioTabs';
import { GYEOKGUK_NAMES, getBongi } from '@/lib/saju/constants';
import { getSipSin } from '@/lib/saju/tenGods';
import type { CheonGan, JiJi } from '@/lib/saju/types';
import SajuBadge from '../SajuBadge';

interface Props {
  person: EnrichedPerson;
  onClose: () => void;
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return desktop;
}

/** Responsive deep bio modal: bottom sheet on mobile, centered modal on desktop. */
export default function DeepBioModal({ person, onClose }: Props) {
  const { lang } = useLanguage();
  const isDesktop = useIsDesktop();
  const [bio, setBio] = useState<DeepBio | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('story');
  const [unlocked, setUnlocked] = useState(false);
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

      {/* 사주팔자 Chart */}
      <section>
        <h3 className="text-sm font-bold text-gray-900 mb-2">
          {lang === 'ko' ? '사주팔자' : 'Four Pillars'}
        </h3>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-center text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-2 text-gray-400 font-normal text-xs">{lang === 'ko' ? '시주' : 'Hour'}</th>
                <th className="py-2 text-gray-400 font-normal text-xs bg-indigo-50">{lang === 'ko' ? '일주' : 'Day'}</th>
                <th className="py-2 text-gray-400 font-normal text-xs">{lang === 'ko' ? '월주' : 'Month'}</th>
                <th className="py-2 text-gray-400 font-normal text-xs">{lang === 'ko' ? '년주' : 'Year'}</th>
              </tr>
            </thead>
            <tbody>
              {/* 십성 row */}
              <tr>
                <td className="pt-2 text-[10px] text-gray-400">?</td>
                <td className="pt-2 text-[10px] text-indigo-500 font-medium bg-indigo-50/30">일간</td>
                <td className="pt-2 text-[10px] text-gray-500 font-medium">
                  {getSipSin(saju.saju.day.stem as CheonGan, saju.saju.month.stem as CheonGan)}
                </td>
                <td className="pt-2 text-[10px] text-gray-500 font-medium">
                  {getSipSin(saju.saju.day.stem as CheonGan, saju.saju.year.stem as CheonGan)}
                </td>
              </tr>
              {/* 천간 row */}
              <tr>
                <td className="py-2 text-gray-300">?</td>
                <td className="py-2 bg-indigo-50/30"><SajuBadge stem={saju.saju.day.stem} size="sm" /></td>
                <td className="py-2"><SajuBadge stem={saju.saju.month.stem} size="sm" /></td>
                <td className="py-2"><SajuBadge stem={saju.saju.year.stem} size="sm" /></td>
              </tr>
              {/* 지지 row */}
              <tr>
                <td className="py-2 text-gray-300">?</td>
                <td className="py-2 bg-indigo-50/30"><SajuBadge branch={saju.saju.day.branch} size="sm" /></td>
                <td className="py-2"><SajuBadge branch={saju.saju.month.branch} size="sm" /></td>
                <td className="py-2"><SajuBadge branch={saju.saju.year.branch} size="sm" /></td>
              </tr>
              {/* 본기 십성 row */}
              <tr>
                <td className="pb-2 text-[10px] text-gray-400">?</td>
                <td className="pb-2 text-[10px] text-gray-500 font-medium bg-indigo-50/30">
                  {getSipSin(saju.saju.day.stem as CheonGan, getBongi(saju.saju.day.branch as JiJi))}
                </td>
                <td className="pb-2 text-[10px] text-gray-500 font-medium">
                  {getSipSin(saju.saju.day.stem as CheonGan, getBongi(saju.saju.month.branch as JiJi))}
                </td>
                <td className="pb-2 text-[10px] text-gray-500 font-medium">
                  {getSipSin(saju.saju.day.stem as CheonGan, getBongi(saju.saju.year.branch as JiJi))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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

  // -- Header content (shared between both layouts) --
  const header = (
    <div className="relative px-4 md:px-6 py-3 md:py-4 shrink-0">
      <button
        onClick={handleClose}
        className="absolute top-2 right-3 md:top-3 md:right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors z-10"
        aria-label="Close"
      >
        ✕
      </button>

      {/* Mobile: portrait left + stacked info */}
      <div className="flex gap-4 items-start md:hidden">
        <div className="shrink-0">
          <div className="w-24 h-32 rounded-xl overflow-hidden bg-gray-200 shadow">
            <img
              src={person.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&size=200&background=random&bold=true`}
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
          <h2 className="text-lg font-bold text-gray-900 leading-tight">{displayName}</h2>
          {person.nameKo && lang === 'ko' && (
            <p className="text-xs text-gray-400 mt-0.5">{person.name}</p>
          )}
          {person.nameKo && lang !== 'ko' && (
            <p className="text-xs text-gray-400 mt-0.5">{person.nameKo}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-600">
            <span className="font-semibold text-indigo-600">${person.netWorth}B</span>
            {person.source && (
              <>
                <span className="text-gray-300">·</span>
                <span>{person.source}</span>
              </>
            )}
          </div>
          <div className="mt-2 space-y-0.5 text-xs text-gray-600">
            <p>{person.industry}</p>
            <p>{person.birthday.replace(/-/g, '.')}</p>
            {bio?.childhood?.birthPlace && (
              <p className="text-gray-500">{ko(lang, bio.childhood.birthPlace, bio.childhood.birthPlaceKo)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Desktop: photo | bio | saju — three columns */}
      <div className="hidden md:flex items-start gap-5 pr-10">
        {/* Photo */}
        <div className="shrink-0">
          <div className="w-36 h-44 rounded-lg overflow-hidden bg-gray-200 shadow">
            <img
              src={person.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&size=400&background=random&bold=true`}
              alt={person.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&size=400&background=random&bold=true`;
              }}
            />
          </div>
        </div>
        {/* Bio info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3">
            <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
            {person.nameKo && lang === 'ko' && (
              <span className="text-sm text-gray-400">{person.name}</span>
            )}
            {person.nameKo && lang !== 'ko' && (
              <span className="text-sm text-gray-400">{person.nameKo}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 flex-wrap">
            <span className="font-semibold text-indigo-600">${person.netWorth}B</span>
            <span className="text-gray-300">·</span>
            <span>{person.source || person.industry}</span>
            <span className="text-gray-300">·</span>
            <span>{person.birthday.replace(/-/g, '.')}</span>
            {bio?.childhood?.birthPlace && (
              <>
                <span className="text-gray-300">·</span>
                <span>{ko(lang, bio.childhood.birthPlace, bio.childhood.birthPlaceKo)}</span>
              </>
            )}
          </div>
          {bio?.childhood && (
            <div className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-3">
              {ko(lang, bio.childhood.earlyLife, bio.childhood.earlyLifeKo)}
            </div>
          )}
        </div>
        {/* Saju mini chart */}
        <div className="shrink-0 w-52">
          <div className="text-[10px] text-gray-400 mb-1 flex items-center justify-between">
            <span>{saju.gyeokguk} {hanja}</span>
            <span className="text-indigo-500 font-medium">{saju.saju.day.stem}{saju.saju.day.branch}</span>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-center text-[10px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="py-1 text-gray-400 font-normal">{lang === 'ko' ? '시' : 'H'}</th>
                  <th className="py-1 text-gray-400 font-normal bg-indigo-50">{lang === 'ko' ? '일' : 'D'}</th>
                  <th className="py-1 text-gray-400 font-normal">{lang === 'ko' ? '월' : 'M'}</th>
                  <th className="py-1 text-gray-400 font-normal">{lang === 'ko' ? '년' : 'Y'}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="pt-1 text-[9px] text-gray-400">?</td>
                  <td className="pt-1 text-[9px] text-indigo-500 font-medium bg-indigo-50/30">일간</td>
                  <td className="pt-1 text-[9px] text-gray-500 font-medium">
                    {getSipSin(saju.saju.day.stem as CheonGan, saju.saju.month.stem as CheonGan)}
                  </td>
                  <td className="pt-1 text-[9px] text-gray-500 font-medium">
                    {getSipSin(saju.saju.day.stem as CheonGan, saju.saju.year.stem as CheonGan)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-300 text-xs">?</td>
                  <td className="py-1 bg-indigo-50/30"><SajuBadge stem={saju.saju.day.stem} size="sm" /></td>
                  <td className="py-1"><SajuBadge stem={saju.saju.month.stem} size="sm" /></td>
                  <td className="py-1"><SajuBadge stem={saju.saju.year.stem} size="sm" /></td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-300 text-xs">?</td>
                  <td className="py-1 bg-indigo-50/30"><SajuBadge branch={saju.saju.day.branch} size="sm" /></td>
                  <td className="py-1"><SajuBadge branch={saju.saju.month.branch} size="sm" /></td>
                  <td className="py-1"><SajuBadge branch={saju.saju.year.branch} size="sm" /></td>
                </tr>
                <tr>
                  <td className="pb-1 text-[9px] text-gray-400">?</td>
                  <td className="pb-1 text-[9px] text-gray-500 font-medium bg-indigo-50/30">
                    {getSipSin(saju.saju.day.stem as CheonGan, getBongi(saju.saju.day.branch as JiJi))}
                  </td>
                  <td className="pb-1 text-[9px] text-gray-500 font-medium">
                    {getSipSin(saju.saju.day.stem as CheonGan, getBongi(saju.saju.month.branch as JiJi))}
                  </td>
                  <td className="pb-1 text-[9px] text-gray-500 font-medium">
                    {getSipSin(saju.saju.day.stem as CheonGan, getBongi(saju.saju.year.branch as JiJi))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
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
            width: '65vw',
            maxWidth: '900px',
            height: '92vh',
            maxHeight: '92vh',
          }}
        >
          {header}
          <TabBar tab={tab} setTab={setTab} lang={lang} />
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            {tab === 'saju' ? (
              <div className="p-6 pb-10">{sajuContent}</div>
            ) : loading ? (
              <LoadingSpinner />
            ) : !bio ? (
              <EmptyBioState lang={lang} />
            ) : (
              <div className="p-6 pb-10">
                <TabContent bio={bio} tab={tab} unlocked={unlocked} onUnlock={() => setUnlocked(true)} lang={lang} />
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
          <TabBar tab={tab} setTab={setTab} lang={lang} />

          <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
            {tab === 'saju' ? (
              <div className="p-5 pb-10">{sajuContent}</div>
            ) : loading ? (
              <LoadingSpinner />
            ) : !bio ? (
              <EmptyBioState lang={lang} />
            ) : (
              <div className="p-5 pb-10">
                <TabContent bio={bio} tab={tab} unlocked={unlocked} onUnlock={() => setUnlocked(true)} lang={lang} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
