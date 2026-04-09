'use client';

import type { SajuResult, Ju, CheonGan, JiJi } from '@/lib/saju/types';
import { STEM_TO_OHAENG, BRANCH_TO_OHAENG, OHAENG_COLORS, GYEOKGUK_NAMES } from '@/lib/saju/constants';
import { useLanguage } from '@/lib/i18n';
import ShareButtons from './ShareButtons';

interface Props {
  saju: SajuResult;
  totalMatches: number;
  onReset: () => void;
}

function HeroPillar({ label, ju }: { label: string; ju: Ju | null }) {
  if (!ju) {
    return (
      <div className="flex flex-col items-center">
        <div className="text-xs text-gray-400 mb-1.5 font-medium">{label}</div>
        <div className="w-[68px] h-[68px] sm:w-20 sm:h-20 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-3xl">
          ?
        </div>
        <div className="w-[68px] h-[68px] sm:w-20 sm:h-20 rounded-xl border border-dashed border-gray-300 mt-1.5 flex items-center justify-center text-gray-300 text-3xl">
          ?
        </div>
      </div>
    );
  }
  const stemOh = STEM_TO_OHAENG[ju.stem as CheonGan];
  const branchOh = BRANCH_TO_OHAENG[ju.branch as JiJi];
  const stemColor = OHAENG_COLORS[stemOh];
  const branchColor = OHAENG_COLORS[branchOh];
  return (
    <div className="flex flex-col items-center">
      <div className="text-xs text-gray-400 mb-1.5 font-medium">{label}</div>
      <div
        className={`w-[68px] h-[68px] sm:w-20 sm:h-20 rounded-xl border flex items-center justify-center text-4xl sm:text-5xl font-bold shadow-sm ${stemColor.bg} ${stemColor.text} ${stemColor.border}`}
      >
        {ju.stem}
      </div>
      <div
        className={`w-[68px] h-[68px] sm:w-20 sm:h-20 rounded-xl border mt-1.5 flex items-center justify-center text-4xl sm:text-5xl font-bold shadow-sm ${branchColor.bg} ${branchColor.text} ${branchColor.border}`}
      >
        {ju.branch}
      </div>
    </div>
  );
}

export default function SajuHero({ saju, totalMatches, onReset }: Props) {
  const { t } = useLanguage();
  const hanja = GYEOKGUK_NAMES[saju.gyeokguk] || '';

  return (
    <div className="relative bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-2xl border border-gray-200 overflow-hidden">
      {/* Reset button — subtle top-right */}
      <button
        type="button"
        onClick={onReset}
        className="absolute top-4 right-4 text-xs font-medium text-gray-500 hover:text-indigo-600 transition-colors z-10"
      >
        {t.resetMyBirthday}
      </button>

      <div className="px-6 sm:px-8 py-8 sm:py-10">
        {/* Headline */}
        <div className="text-center mb-6">
          <div className="text-xs font-semibold text-indigo-500 tracking-widest uppercase mb-1">
            {t.yourSaju}
          </div>
        </div>

        {/* 4 pillars */}
        <div className="flex justify-center gap-2.5 sm:gap-4 mb-6">
          <HeroPillar label="時" ju={saju.saju.hour} />
          <HeroPillar label="日" ju={saju.saju.day} />
          <HeroPillar label="月" ju={saju.saju.month} />
          <HeroPillar label="年" ju={saju.saju.year} />
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
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-full border border-indigo-100">
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

        {/* Share widget — "친구한테도 가르쳐주기" */}
        <ShareButtons title={t.shareTitle} variant="hero" />
      </div>
    </div>
  );
}
