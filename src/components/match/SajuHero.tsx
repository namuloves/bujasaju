'use client';

import type { SajuResult, Ju, CheonGan, JiJi, EnrichedPerson } from '@/lib/saju/types';
import { STEM_TO_OHAENG, BRANCH_TO_OHAENG, OHAENG_COLORS, GYEOKGUK_NAMES, getBongi } from '@/lib/saju/constants';
import { getSipSin } from '@/lib/saju/tenGods';
import { useLanguage } from '@/lib/i18n';

interface ComboStats {
  myCount: number;   // 이 조합의 부자 수
  rank: number;      // 전체 순위 (1 = 가장 많은)
  totalCombos: number; // 총 조합 수 (706)
}

interface Props {
  saju: SajuResult;
  totalMatches: number;
  onReset: () => void;
  featuredPerson?: EnrichedPerson | null;
  comboStats?: ComboStats | null;
}

export function HeroPillar({
  label,
  ju,
  ilgan,
  isDayPillar,
  compact,
}: {
  label: string;
  ju: Ju | null;
  ilgan: CheonGan;
  isDayPillar?: boolean;
  compact?: boolean;
}) {
  const cell = compact
    ? 'w-7 h-7 rounded-md text-base'
    : 'w-9 h-9 sm:w-10 sm:h-10 rounded-lg text-xl';
  const cellEmpty = compact
    ? 'w-7 h-7 rounded-md text-xs'
    : 'w-9 h-9 sm:w-10 sm:h-10 rounded-lg text-base';
  const labelSize = compact ? 'text-[9px]' : 'text-[10px]';
  const sipsinSize = compact ? 'text-[8px]' : 'text-[9px]';

  if (!ju) {
    return (
      <div className="flex flex-col items-center">
        <div className={`${labelSize} text-gray-400 mb-1 font-medium`}>{label}</div>
        <div className={`${sipsinSize} text-gray-300 mb-0.5 h-3`}>·</div>
        <div className={`${cellEmpty} border border-dashed border-gray-300 flex items-center justify-center text-gray-300`}>
          ?
        </div>
        <div className={`${cellEmpty} border border-dashed border-gray-300 mt-1 flex items-center justify-center text-gray-300`}>
          ?
        </div>
        <div className={`${sipsinSize} text-gray-300 mt-0.5 h-3`}>·</div>
      </div>
    );
  }
  const stemOh = STEM_TO_OHAENG[ju.stem as CheonGan];
  const branchOh = BRANCH_TO_OHAENG[ju.branch as JiJi];
  const stemColor = OHAENG_COLORS[stemOh];
  const branchColor = OHAENG_COLORS[branchOh];

  const stemSipsin = isDayPillar
    ? '일간'
    : getSipSin(ilgan, ju.stem as CheonGan);
  const branchBongi = getBongi(ju.branch as JiJi);
  const branchSipsin = getSipSin(ilgan, branchBongi);

  return (
    <div className="flex flex-col items-center">
      <div className={`${labelSize} text-gray-400 mb-1 font-medium`}>{label}</div>
      <div className={`${sipsinSize} mb-0.5 font-medium ${isDayPillar ? 'text-indigo-500' : 'text-gray-500'}`}>
        {stemSipsin}
      </div>
      <div
        className={`${cell} border flex items-center justify-center font-bold shadow-sm ${stemColor.bg} ${stemColor.text} ${stemColor.border}`}
      >
        {ju.stem}
      </div>
      <div
        className={`${cell} border mt-1 flex items-center justify-center font-bold shadow-sm ${branchColor.bg} ${branchColor.text} ${branchColor.border}`}
      >
        {ju.branch}
      </div>
      <div className={`${sipsinSize} text-gray-500 mt-0.5 font-medium`}>
        {branchSipsin}
      </div>
    </div>
  );
}

export default function SajuHero({ saju, totalMatches, onReset, featuredPerson, comboStats }: Props) {
  const { t, lang } = useLanguage();
  const hanja = GYEOKGUK_NAMES[saju.gyeokguk] || '';
  const fpSaju = featuredPerson?.saju;

  return (
    <div className="relative bg-white rounded-2xl overflow-hidden">
      <div className="px-4 sm:px-6 py-5 sm:py-6">
        {/* Headline */}
        <div className="text-center mb-3">
          <div className="text-xs font-bold text-gray-600">
            {t.yourSaju}
          </div>
        </div>

        {/* 4 pillars with 십성 labels on stem (above) and 지장간 본기 (below) */}
        <div className="flex justify-center gap-2 sm:gap-3 mb-4">
          <HeroPillar label="時" ju={saju.saju.hour} ilgan={saju.saju.day.stem as CheonGan} />
          <HeroPillar label="日" ju={saju.saju.day} ilgan={saju.saju.day.stem as CheonGan} isDayPillar />
          <HeroPillar label="月" ju={saju.saju.month} ilgan={saju.saju.day.stem as CheonGan} />
          <HeroPillar label="年" ju={saju.saju.year} ilgan={saju.saju.day.stem as CheonGan} />
        </div>

        {/* Key stats: 일주 · 월지 · 격국 */}
        <div className="flex flex-nowrap justify-center gap-x-3 text-xs mb-4 whitespace-nowrap">
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

        {/* Featured person's saju chart */}
        {fpSaju && (
          <div className="mb-4 mt-8">
            <div className="text-center mb-3">
              <div className="text-xs font-bold text-gray-600">
                {lang === 'ko'
                  ? `${featuredPerson!.nameKo ?? featuredPerson!.name}의 사주`
                  : `${featuredPerson!.name}'s Saju`}
              </div>
            </div>
            <div className="flex justify-center gap-2 sm:gap-3 mb-3">
              <HeroPillar label="時" ju={null} ilgan={fpSaju.saju.day.stem as CheonGan} />
              <HeroPillar label="日" ju={fpSaju.saju.day} ilgan={fpSaju.saju.day.stem as CheonGan} isDayPillar />
              <HeroPillar label="月" ju={fpSaju.saju.month} ilgan={fpSaju.saju.day.stem as CheonGan} />
              <HeroPillar label="年" ju={fpSaju.saju.year} ilgan={fpSaju.saju.day.stem as CheonGan} />
            </div>
            <div className="flex flex-nowrap justify-center gap-x-3 text-xs whitespace-nowrap">
              <div>
                <span className="text-gray-500">{t.yourIlju}</span>
                <span className="mx-1.5 text-gray-300">·</span>
                <span className="font-bold text-indigo-600">{fpSaju.ilju}</span>
              </div>
              <div>
                <span className="text-gray-500">{t.yourWolji}</span>
                <span className="mx-1.5 text-gray-300">·</span>
                <span className="font-bold text-indigo-600">{fpSaju.wolji}</span>
              </div>
              <div>
                <span className="text-gray-500">{t.yourGyeokguk}</span>
                <span className="mx-1.5 text-gray-300">·</span>
                <span className="font-bold text-indigo-600">
                  {fpSaju.gyeokguk}
                  {GYEOKGUK_NAMES[fpSaju.gyeokguk] && (
                    <span className="text-gray-400 font-normal ml-1">{GYEOKGUK_NAMES[fpSaju.gyeokguk]}</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Match count — the "quiz result" payoff line */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 py-2 bg-white rounded-full">
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
          {comboStats && comboStats.myCount > 0 && (
            <div className="mt-1.5 text-xs text-gray-400">
              <span>📊 </span>
              {lang === 'ko' ? (
                <>
                  당신의 사주 조합({saju.ilju}·{saju.wolji})은 전체 {comboStats.totalCombos}개 조합 중{' '}
                  <span className="font-semibold text-gray-600">
                    {comboStats.rank === 1
                      ? '1위'
                      : `${comboStats.rank}위`}
                  </span>
                  ! {comboStats.myCount}명의 부자가 이 조합을 가졌습니다
                </>
              ) : (
                <>
                  Your combo ({saju.ilju}·{saju.wolji}) ranks{' '}
                  <span className="font-semibold text-gray-600">
                    #{comboStats.rank}
                  </span>{' '}
                  out of {comboStats.totalCombos} — {comboStats.myCount} billionaires share it
                </>
              )}
            </div>
          )}
        </div>

        {/* Reset button */}
        <div className="flex justify-center mt-3">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-indigo-600 transition-colors"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            {t.resetMyBirthday}
          </button>
        </div>
      </div>
    </div>
  );
}
