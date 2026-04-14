'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { useEnrichedPeople } from '@/lib/data/enriched';
import type { DeepBio } from '@/lib/deepBio';
import { fetchDeepBio } from '@/lib/deepBio';
import { TabBar, TabContent, LoadingSpinner, EmptyBioState, ko, type Tab } from '@/components/deep-bio/DeepBioTabs';

function normalizePhotoUrl(url: string | undefined | null, name: string): string {
  if (!url) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=400&background=random&bold=true`;
  }
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://')) return url.replace(/^http:/, 'https:');
  return url;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { lang } = useLanguage();
  const { people, loading: peopleLoading } = useEnrichedPeople();
  const [bio, setBio] = useState<DeepBio | null>(null);
  const [bioLoading, setBioLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('story');
  const [unlocked, setUnlocked] = useState(false);

  const personId = params.id as string;
  const person = people.find(p => p.id === personId);

  useEffect(() => {
    fetchDeepBio(personId).then(data => {
      setBio(data);
      setBioLoading(false);
    });
  }, [personId]);

  // Full-page loading
  if (peopleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <p className="text-gray-500 text-sm">{lang === 'ko' ? '인물을 찾을 수 없습니다.' : 'Person not found.'}</p>
        <button onClick={() => router.back()} className="text-sm text-indigo-600 hover:text-indigo-800">
          {lang === 'ko' ? '← 돌아가기' : '← Go back'}
        </button>
      </div>
    );
  }

  const displayName = lang === 'ko' ? (person.nameKo || person.name) : person.name;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-800 transition-colors text-sm flex items-center gap-1"
          >
            <span className="text-lg">←</span>
            <span>{lang === 'ko' ? '돌아가기' : 'Back'}</span>
          </button>
          <div className="h-4 w-px bg-gray-200" />
          <span className="text-sm text-gray-400 truncate">{displayName}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Hero: Photo left + Info right */}
        <div className="flex gap-8 items-start">
          {/* Portrait photo */}
          <div className="shrink-0">
            <div className="w-48 h-60 rounded-2xl overflow-hidden bg-gray-200 shadow-lg">
              <img
                src={normalizePhotoUrl(person.photoUrl, person.name)}
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
          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
            {person.nameKo && lang === 'ko' && (
              <p className="text-sm text-gray-400 mt-1">{person.name}</p>
            )}
            {person.nameKo && lang !== 'ko' && (
              <p className="text-sm text-gray-400 mt-1">{person.nameKo}</p>
            )}

            <div className="flex items-center gap-3 mt-3 text-sm text-gray-600">
              <span className="font-semibold text-indigo-600 text-lg">${person.netWorth}B</span>
              {person.source && (
                <>
                  <span className="text-gray-300">·</span>
                  <span>{person.source}</span>
                </>
              )}
            </div>

            <div className="mt-4 space-y-1.5 text-sm text-gray-600">
              <p>
                <span className="text-gray-400 w-16 inline-block">{lang === 'ko' ? '산업' : 'Industry'}</span>
                <span className="ml-2">{person.industry}</span>
              </p>
              <p>
                <span className="text-gray-400 w-16 inline-block">{lang === 'ko' ? '생년월일' : 'Born'}</span>
                <span className="ml-2">{person.birthday.replace(/-/g, '.')}{person.deathDate ? ` - ${person.deathDate.replace(/-/g, '.')}` : ''}</span>
              </p>
              {bio?.childhood?.birthPlace && (
                <p>
                  <span className="text-gray-400 w-16 inline-block">{lang === 'ko' ? '출생지' : 'Birthplace'}</span>
                  <span className="ml-2">{ko(lang, bio.childhood.birthPlace, bio.childhood.birthPlaceKo)}</span>
                </p>
              )}
              {bio?.childhood?.education && (
                <p>
                  <span className="text-gray-400 w-16 inline-block">{lang === 'ko' ? '학력' : 'Education'}</span>
                  <span className="ml-2">{ko(lang, bio.childhood.education, bio.childhood.educationKo)}</span>
                </p>
              )}
            </div>

            {/* Short bio */}
            {person.bio && (
              <p className="mt-4 text-sm text-gray-500 leading-relaxed line-clamp-3">
                {lang === 'ko' ? (person.bioKo ?? person.bio) : person.bio}
              </p>
            )}
          </div>
        </div>

        {/* Tab content area */}
        <div className="mt-10">
          <TabBar tab={tab} setTab={setTab} lang={lang} />

          <div className="mt-6">
            {bioLoading ? (
              <LoadingSpinner />
            ) : !bio ? (
              <EmptyBioState lang={lang} />
            ) : (
              <TabContent bio={bio} tab={tab} unlocked={unlocked} onUnlock={() => setUnlocked(true)} lang={lang} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
