'use client';

import { useState } from 'react';
import type { EnrichedPerson } from '@/lib/saju/types';
import { normalizePhotoUrl, proxyWikimedia } from '@/components/profile/format';

function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0][0] ?? '';
  const last = words.length > 1 ? words[words.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase();
}

interface Props {
  person: EnrichedPerson;
  /** Size, shape and anything else for the frame. */
  className: string;
  /** Font size for the initials fallback. */
  textClass: string;
}

/** Photo, or a neutral gray tile with initials when there is no photo or
 *  it fails to load. Existing gray tokens only. */
export default function Portrait({ person, className, textClass }: Props) {
  const src = proxyWikimedia(normalizePhotoUrl(person.photoUrl));
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center`} aria-label={person.name} role="img">
        <span className={`${textClass} font-medium text-gray-500 select-none`}>{initialsOf(person.name)}</span>
      </div>
    );
  }
  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={person.name} className="w-full h-full object-cover" onError={() => setFailed(true)} />
    </div>
  );
}
