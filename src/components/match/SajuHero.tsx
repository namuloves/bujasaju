'use client';

import type { SajuResult, Ju, CheonGan, JiJi } from '@/lib/saju/types';
import { STEM_TO_OHAENG, BRANCH_TO_OHAENG, OHAENG_COLORS, GYEOKGUK_NAMES, getBongi } from '@/lib/saju/constants';
import { getSipSin } from '@/lib/saju/tenGods';
import { useLanguage } from '@/lib/i18n';
import ShareButtons from './ShareButtons';

interface Props {
  saju: SajuResult;
  totalMatches: number;
  onReset: () => void;
}

function HeroPillar({
  label,
  ju,
  ilgan,
  isDayPillar,
}: {
  label: string;
  ju: Ju | null;
  ilgan: CheonGan;
  isDayPillar?: boolean;
}) {
  if (!ju) {
    return (
      <div className="flex flex-col items-center">
        <div className="text-xs text-gray-400 mb-1.5 font-medium">{label}</div>
        <div className="text-[10px] text-gray-300 mb-1 h-3">·</div>
        <div className="w-[56px] h-[56px] sm:w-16 sm:h-16 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-2xl">
          ?
        </div>
        <div className="w-[56px] h-[56px] sm:w-16 sm:h-16 rounded-xl border border-dashed border-gray-300 mt-1.5 flex items-center justify-center text-gray-300 text-2xl">
          ?
        </div>
        <div className="text-[10px] text-gray-300 mt-1 h-3">·</div>
      </div>
    );
  }
  const stemOh = STEM_TO_OHAENG[ju.stem as CheonGan];
  const branchOh = BRANCH_TO_OHAENG[ju.branch as JiJi];
  const stemColor = OHAENG_COLORS[stemOh];
  const branchColor = OHAENG_COLORS[branchOh];

  // 십성 labels. The day stem itself is the 일간 (the reference point),
  // so it's marked as 일간/본원 rather than a 십성 relationship.
  const stemSipsin = isDayPillar
    ? '일간'
    : getSipSin(ilgan, ju.stem as CheonGan);
  const branchBongi = getBongi(ju.branch as JiJi);
  const branchSipsin = getSipSin(ilgan, branchBongi);

  return (
    <div className="flex flex-col items-center">
      <div className="text-xs text-gray-400 mb-1.5 font-medium">{label}</div>
      <div className={`text-[10px] mb-1 font-medium ${isDayPillar ? 'text-indigo-500' : 'text-gray-500'}`}>
        {stemSipsin}
      </div>
      <div
        className={`w-[56px] h-[56px] sm:w-16 sm:h-16 rounded-xl border flex items-center justify-center text-3xl sm:text-4xl font-bold shadow-sm ${stemColor.bg} ${stemColor.text} ${stemColor.border}`}
      >
        {ju.stem}
      </div>
      <div
        className={`w-[56px] h-[56px] sm:w-16 sm:h-16 rounded-xl border mt-1.5 flex items-center justify-center text-3xl sm:text-4xl font-bold shadow-sm ${branchColor.bg} ${branchColor.text} ${branchColor.border}`}
      >
        {ju.branch}
      </div>
      <div className="text-[10px] text-gray-500 mt-1 font-medium">
        {branchSipsin}
      </div>
    </div>
  );
}

export default function SajuHero({ saju, totalMatches, onReset }: Props) {
  const { t } = useLanguage();
  const hanja = GYEOKGUK_NAMES[saju.gyeokguk] || '';

  return (
    <div className="relative bg-white rounded-2xl overflow-hidden">
      <div className="px-5 sm:px-7 py-6 sm:py-8">
        {/* Headline */}
        <div className="text-center mb-4">
          <div className="text-xs font-semibold text-indigo-500 tracking-widest uppercase">
            {t.yourSaju}
          </div>
        </div>

        {/* 4 pillars with 십성 labels on stem (above) and 지장간 본기 (below) */}
        <div className="flex justify-center gap-2 sm:gap-3 mb-5">
          <HeroPillar label="時" ju={saju.saju.hour} ilgan={saju.saju.day.stem as CheonGan} />
          <HeroPillar label="日" ju={saju.saju.day} ilgan={saju.saju.day.stem as CheonGan} isDayPillar />
          <HeroPillar label="月" ju={saju.saju.month} ilgan={saju.saju.day.stem as CheonGan} />
          <HeroPillar label="年" ju={saju.saju.year} ilgan={saju.saju.day.stem as CheonGan} />
        </div>

        {/* Key stats: 일주 · 월지 · 격국 */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm mb-5">
          <div>
            <span className="text-gray-500">{t.yourIlju}</span>
            <span className="mx-1.5 text-gray-300">·</span>
            <span className="font-bold text-indigo-600">{saju.ilju}</span>
          </div>
          <div>
            <span className="text-gray-500">{t.yourWolji}</span>
            <span className="mx-1.5 text-gray-300">·</span>
            <span className="font-bold text-indigo-600">{saju.wolji}</span>
          </div>
          <div>
            <span className="text-gray-500">{t.yourGyeokguk}</span>
            <span className="mx-1.5 text-gray-300">·</span>
            <span className="font-bold text-indigo-600">
              {saju.gyeokguk}
              {hanja && <span className="text-gray-400 font-normal ml-1">{hanja}</span>}
            </span>
          </div>
        </div>

        {/* Match count — the "quiz result" payoff line */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full">
            <span className="text-indigo-400">✨</span>
            <span className="text-sm">
              <span className="font-bold text-indigo-600">
                {t.countPeople(totalMatches)}
              </span>
              <span className="text-gray-500">
                {t.heroMatchTagline}
              </span>
            </span>
          </div>
        </div>

        {/* Share widget — "친구한테도 가르쳐주기" (ShareButtons renders the
            Kakao coming-soon notice at its footer) */}
        <ShareButtons title={t.shareTitle} variant="hero" />

        {/* Reset button sits below the Kakao notice so users scan the
            share options first, then find the "다시 하기" as a secondary
            action. */}
        <div className="flex justify-center mt-4">
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-medium text-gray-500 hover:text-indigo-600 transition-colors underline underline-offset-4 decoration-gray-300"
          >
            {t.resetMyBirthday}
          </button>
        </div>
      </div>
    </div>
  );
}
