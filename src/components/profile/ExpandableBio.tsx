'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Short bio with a 3-line clamp + tap-to-expand toggle. The "더보기"/"접기"
 * button only renders when the text is actually long enough to be clamped,
 * so short bios stay clean. Class props default to the v1 profile styling;
 * profile v2 passes its own.
 */
interface Props {
  text: string;
  lang: string;
  className?: string;
  textClassName?: string;
  buttonClassName?: string;
}

export default function ExpandableBio({
  text,
  lang,
  className = 'mt-4',
  textClassName = 'text-sm text-gray-500 leading-relaxed text-left',
  buttonClassName = 'mt-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors',
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement | null>(null);

  // Detect the clamp by comparing the clamped height with scrollHeight,
  // one frame after layout settles. Re-runs when the text changes.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      setIsClamped(el.scrollHeight > el.clientHeight + 1);
    });
    return () => cancelAnimationFrame(id);
  }, [text]);

  return (
    <div className={className}>
      <p ref={ref} className={`${textClassName} ${expanded ? '' : 'line-clamp-3'}`}>
        {text}
      </p>
      {isClamped && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className={buttonClassName}>
          {expanded
            ? (lang === 'ko' ? '접기 ↑' : 'Show less ↑')
            : (lang === 'ko' ? '더보기 ↓' : 'Show more ↓')}
        </button>
      )}
    </div>
  );
}
