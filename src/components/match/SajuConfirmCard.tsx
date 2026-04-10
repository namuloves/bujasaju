'use client';

import { useLanguage } from '@/lib/i18n';
import type { SajuResult, Ju } from '@/lib/saju/types';
import { STEM_TO_OHAENG, BRANCH_TO_OHAENG, OHAENG_COLORS, getBongi } from '@/lib/saju/constants';
import { getSipSin } from '@/lib/saju/tenGods';
import type { CheonGan, JiJi } from '@/lib/saju/types';

interface Props {
  saju: SajuResult;
  onConfirm: () => void;
  onEdit: () => void;
}

function Pillar({
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
        <div className="text-[10px] text-gray-400 mb-1">{label}</div>
        <div className="text-[10px] text-gray-300 mb-1 h-3">·</div>
        <div className="w-14 h-14 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-xl">
          ?
        </div>
        <div className="w-14 h-14 rounded-lg border border-dashed border-gray-300 mt-1 flex items-center justify-center text-gray-300 text-xl">
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

  const stemSipsin = isDayPillar ? '일간' : getSipSin(ilgan, ju.stem as CheonGan);
  const branchBongi = getBongi(ju.branch as JiJi);
  const branchSipsin = getSipSin(ilgan, branchBongi);

  return (
    <div className="flex flex-col items-center">
      <div className="text-[10px] text-gray-400 mb-1">{label}</div>
      <div className={`text-[10px] mb-1 font-medium ${isDayPillar ? 'text-indigo-500' : 'text-gray-500'}`}>
        {stemSipsin}
      </div>
      <div
        className={`w-14 h-14 rounded-lg border flex items-center justify-center text-2xl font-bold ${stemColor.bg} ${stemColor.text} ${stemColor.border}`}
      >
        {ju.stem}
      </div>
      <div
        className={`w-14 h-14 rounded-lg border mt-1 flex items-center justify-center text-2xl font-bold ${branchColor.bg} ${branchColor.text} ${branchColor.border}`}
      >
        {ju.branch}
      </div>
      <div className="text-[10px] text-gray-500 mt-1 font-medium">
        {branchSipsin}
      </div>
    </div>
  );
}

export default function SajuConfirmCard({ saju, onConfirm, onEdit }: Props) {
  const { t } = useLanguage();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
      <h2 className="text-lg font-bold text-center text-gray-900 mb-6">
        {t.confirmTitle}
      </h2>

      <div className="flex justify-center gap-3 sm:gap-4 mb-6">
        <Pillar label={t.hour} ju={saju.saju.hour} ilgan={saju.saju.day.stem as CheonGan} />
        <Pillar label={t.day} ju={saju.saju.day} ilgan={saju.saju.day.stem as CheonGan} isDayPillar />
        <Pillar label={t.month} ju={saju.saju.month} ilgan={saju.saju.day.stem as CheonGan} />
        <Pillar label={t.year} ju={saju.saju.year} ilgan={saju.saju.day.stem as CheonGan} />
      </div>

      <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm mb-6">
        <div>
          <span className="text-gray-500">{t.yourIlju}: </span>
          <span className="font-semibold text-indigo-600">{saju.ilju}</span>
        </div>
        <div>
          <span className="text-gray-500">{t.yourWolji}: </span>
          <span className="font-semibold text-indigo-600">{saju.wolji}</span>
        </div>
        <div>
          <span className="text-gray-500">{t.yourGyeokguk}: </span>
          <span className="font-semibold text-indigo-600">{saju.gyeokguk}</span>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="px-5 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          {t.edit}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
        >
          {t.seeResults} →
        </button>
      </div>
    </div>
  );
}
