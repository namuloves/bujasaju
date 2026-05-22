'use client';

import { useLanguage } from '@/lib/i18n';
import type { SajuResult, CheonGan } from '@/lib/saju/types';
import { HeroPillar } from './SajuHero';

interface Props {
  saju: SajuResult;
  onConfirm: () => void;
  onEdit: () => void;
}

export default function SajuConfirmCard({ saju, onConfirm, onEdit }: Props) {
  const { t } = useLanguage();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
      <h2 className="text-lg font-bold text-center text-gray-900 mb-6">
        {t.confirmTitle}
      </h2>

      <div className="flex justify-center gap-2 sm:gap-3 mb-6">
        <HeroPillar label={t.hour} ju={saju.saju.hour} ilgan={saju.saju.day.stem as CheonGan} large />
        <HeroPillar label={t.day} ju={saju.saju.day} ilgan={saju.saju.day.stem as CheonGan} isDayPillar large />
        <HeroPillar label={t.month} ju={saju.saju.month} ilgan={saju.saju.day.stem as CheonGan} large />
        <HeroPillar label={t.year} ju={saju.saju.year} ilgan={saju.saju.day.stem as CheonGan} large />
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
          className="px-5 py-2 text-sm font-semibold text-white bg-gray-900 hover:bg-black rounded-lg transition-colors"
        >
          {t.seeResults} →
        </button>
      </div>
    </div>
  );
}
