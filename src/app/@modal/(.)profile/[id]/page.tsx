'use client';

/**
 * Intercepted /profile/[id] — in-app links to a profile (match results,
 * family pages, related people) open the same profile overlay as the
 * browse cards, on top of the current page. Hard refresh / direct URL
 * still hits the standalone page at `src/app/profile/[id]/page.tsx`.
 */

import { useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEnrichedPeople } from '@/lib/data/enriched';
import DeepBioModal from '@/components/deep-bio/DeepBioModal';

export default function InterceptedProfileModal() {
  const router = useRouter();
  const params = useParams();
  const personId = params.id as string;
  const { people, loading } = useEnrichedPeople();
  const person = people.find((p) => p.id === personId);

  // router.back() lines the overlay close up with the browser's back
  // button — same result whether the visitor taps X or goes back.
  const close = useCallback(() => {
    router.back();
  }, [router]);

  // Unknown id: let the standalone page show its "not found" state.
  useEffect(() => {
    if (!loading && !person) window.location.assign(`/profile/${encodeURIComponent(personId)}`);
  }, [loading, person, personId]);

  if (!person) return null;
  return <DeepBioModal key={person.id} person={person} onClose={close} />;
}
