'use client';

import { CheonGan, JiJi, OHaeng } from '@/lib/saju/types';
import { STEM_TO_OHAENG, BRANCH_TO_OHAENG, OHAENG_COLORS } from '@/lib/saju/constants';

interface SajuBadgeProps {
  stem?: CheonGan;
  branch?: JiJi;
  size?: 'sm' | 'md' | 'lg';
}

function getOhaengStyle(ohaeng: OHaeng) {
  const colors = OHAENG_COLORS[ohaeng];
  return `${colors.bg} ${colors.text} ${colors.border}`;
}

export default function SajuBadge({ stem, branch, size = 'md' }: SajuBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span className="inline-flex gap-0.5">
      {stem && (
        <span
          className={`inline-block rounded-l border font-bold ${sizeClasses[size]} ${getOhaengStyle(STEM_TO_OHAENG[stem])}`}
        >
          {stem}
        </span>
      )}
      {branch && (
        <span
          className={`inline-block ${stem ? 'rounded-r' : 'rounded'} border font-bold ${sizeClasses[size]} ${getOhaengStyle(BRANCH_TO_OHAENG[branch])}`}
        >
          {branch}
        </span>
      )}
    </span>
  );
}
