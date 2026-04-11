'use client';

import type { DeepBio, Quote, Book } from '@/lib/deepBio';
import WealthChart from './WealthChart';

/** Pick Korean text if available and lang is 'ko', otherwise fall back to English. */
export function ko<T extends string | null | undefined>(lang: string, en: T, korean?: T): T {
  if (lang === 'ko' && korean) return korean;
  return en;
}

export type Tab = 'story' | 'quotes' | 'books' | 'saju';

// ---------- Tab Bar ----------

export function TabBar({ tab, setTab, lang }: { tab: Tab; setTab: (t: Tab) => void; lang: string }) {
  return (
    <div className="flex border-b border-gray-200 shrink-0">
      {([
        { key: 'story' as Tab, label: lang === 'ko' ? '스토리' : 'Story' },
        { key: 'quotes' as Tab, label: lang === 'ko' ? '명언' : 'Quotes' },
        { key: 'books' as Tab, label: lang === 'ko' ? '도서' : 'Books' },
      ]).map(t => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            tab === t.key
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Tab Content ----------

export function TabContent({ bio, tab, unlocked, onUnlock, lang }: {
  bio: DeepBio;
  tab: Tab;
  unlocked: boolean;
  onUnlock: () => void;
  lang: string;
}) {
  return (
    <>
      {tab === 'story' && <StoryTab bio={bio} unlocked={unlocked} onUnlock={onUnlock} lang={lang} />}
      {tab === 'quotes' && <QuotesTab bio={bio} unlocked={unlocked} onUnlock={onUnlock} lang={lang} />}
      {tab === 'books' && <BooksTab bio={bio} lang={lang} />}
    </>
  );
}

// ---------- Loading / Empty States ----------

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 rounded-full border-[3px] border-indigo-100 border-t-indigo-600 animate-spin" />
    </div>
  );
}

export function EmptyBioState({ lang }: { lang: string }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="text-3xl mb-3">🔒</div>
      <p className="text-sm text-gray-500">
        {lang === 'ko'
          ? '이 인물의 상세 프로필은 준비 중입니다.'
          : 'Detailed profile for this person is coming soon.'}
      </p>
    </div>
  );
}

// ---------- Story Tab ----------

function StoryTab({ bio, unlocked, onUnlock, lang }: { bio: DeepBio; unlocked: boolean; onUnlock: () => void; lang: string }) {
  return (
    <div className="space-y-6">
      {/* Mobile: early life section (on desktop it's in the modal header) */}
      {bio.childhood && (
        <section className="md:hidden">
          <h3 className="text-sm font-bold text-gray-900 mb-2">
            {lang === 'ko' ? '🧒 성장 배경' : '🧒 Early Life'}
          </h3>
          <div className="text-sm text-gray-700 space-y-2">
            <p><span className="text-gray-500">{lang === 'ko' ? '출생지:' : 'Born:'}</span> {ko(lang, bio.childhood.birthPlace, bio.childhood.birthPlaceKo)}</p>
            <p>{ko(lang, bio.childhood.earlyLife, bio.childhood.earlyLifeKo)}</p>
            {bio.childhood.education && (
              <p><span className="text-gray-500">{lang === 'ko' ? '학력:' : 'Education:'}</span> {ko(lang, bio.childhood.education, bio.childhood.educationKo)}</p>
            )}
          </div>
        </section>
      )}

      {/* Mobile: wealth chart */}
      {bio.wealthHistory.length >= 2 && (
        <section className="md:hidden">
          <h3 className="text-sm font-bold text-gray-900 mb-2">
            {lang === 'ko' ? '💰 자산 변화' : '💰 Wealth History'}
          </h3>
          <WealthChart data={bio.wealthHistory} timeline={bio.careerTimeline} lang={lang} className="bg-gray-50 rounded-xl p-3" />
        </section>
      )}

      {/* Desktop: career timeline (left) + wealth chart (right) side by side */}
      {(bio.careerTimeline.length > 0 || bio.wealthHistory.length >= 2) && (
        <div className="hidden md:grid md:grid-cols-2 md:gap-6">
          {bio.careerTimeline.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                {lang === 'ko' ? '📈 커리어 타임라인' : '📈 Career Timeline'}
              </h3>
              <div className="relative pl-5 border-l-2 border-indigo-100 space-y-3">
                {bio.careerTimeline.map((event, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[23px] w-3 h-3 rounded-full bg-indigo-500 border-2 border-white" />
                    <div className="text-[10px] font-bold text-indigo-600">{event.year}</div>
                    <div className="text-sm text-gray-700 mt-0.5">{ko(lang, event.event, event.eventKo)}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {bio.wealthHistory.length >= 2 && (
            <section>
              <h3 className="text-sm font-bold text-gray-900 mb-2">
                {lang === 'ko' ? '💰 자산 변화' : '💰 Wealth History'}
              </h3>
              <WealthChart data={bio.wealthHistory} timeline={bio.careerTimeline} lang={lang} className="bg-gray-50 rounded-xl p-3" />
            </section>
          )}
        </div>
      )}

      {/* Mobile: career timeline */}
          {bio.careerTimeline.length > 0 && (
            <section className="md:hidden">
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                {lang === 'ko' ? '📈 커리어 타임라인' : '📈 Career Timeline'}
              </h3>
              <div className="relative pl-5 border-l-2 border-indigo-100 space-y-3">
                {bio.careerTimeline.map((event, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[23px] w-3 h-3 rounded-full bg-indigo-500 border-2 border-white" />
                    <div className="text-[10px] font-bold text-indigo-600">{event.year}</div>
                    <div className="text-sm text-gray-700 mt-0.5">{ko(lang, event.event, event.eventKo)}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {bio.failures.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-gray-900 mb-2">
                {lang === 'ko' ? '💥 실패와 역경' : '💥 Failures & Setbacks'}
              </h3>
              <div className="space-y-3">
                {bio.failures.map((f, i) => (
                  <div key={i} className="bg-amber-50 rounded-lg p-3">
                    <div className="text-xs font-bold text-amber-700">{f.year}</div>
                    <p className="text-sm text-gray-700 mt-1">{ko(lang, f.description, f.descriptionKo)}</p>
                    {f.lesson && (
                      <p className="text-xs text-amber-600 mt-1.5 italic">→ {ko(lang, f.lesson, f.lessonKo)}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {bio.personalTraits && (
            <section>
              <h3 className="text-sm font-bold text-gray-900 mb-2">
                {lang === 'ko' ? '🧬 특징' : '🧬 Traits'}
              </h3>
              <div className="text-sm text-gray-700 space-y-1.5">
                <p>{ko(lang, bio.personalTraits.knownFor, bio.personalTraits.knownForKo)}</p>
                {bio.personalTraits.philanthropy && (
                  <p className="text-gray-500">🤝 {ko(lang, bio.personalTraits.philanthropy, bio.personalTraits.philanthropyKo)}</p>
                )}
              </div>
            </section>
          )}
    </div>
  );
}

// ---------- Quotes Tab ----------

function QuotesTab({ bio, unlocked, onUnlock, lang }: { bio: DeepBio; unlocked: boolean; onUnlock: () => void; lang: string }) {
  if (bio.quotes.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-gray-400">
        {lang === 'ko' ? '등록된 명언이 없습니다.' : 'No quotes available.'}
      </div>
    );
  }

  const freeQuotes = bio.quotes.slice(0, 1);
  const paidQuotes = bio.quotes.slice(1);

  return (
    <div className="space-y-4">
      {freeQuotes.map((q, i) => (
        <QuoteCard key={i} quote={q} lang={lang} />
      ))}
      {!unlocked && paidQuotes.length > 0 ? (
        <PaywallGate onUnlock={onUnlock} lang={lang} extra={`+${paidQuotes.length} ${lang === 'ko' ? '개 더' : 'more'}`} />
      ) : (
        paidQuotes.map((q, i) => <QuoteCard key={i + 1} quote={q} lang={lang} />)
      )}
    </div>
  );
}

function QuoteCard({ quote, lang }: { quote: Quote; lang: string }) {
  return (
    <blockquote className="bg-gray-50 rounded-xl p-4 border-l-4 border-indigo-300">
      <p className="text-sm text-gray-800 italic leading-relaxed">&ldquo;{ko(lang, quote.text, quote.textKo)}&rdquo;</p>
      {quote.context && (
        <p className="text-xs text-gray-500 mt-2">— {ko(lang, quote.context, quote.contextKo)}</p>
      )}
      {quote.source && (
        <p className="text-xs text-gray-400 mt-1">{quote.source}</p>
      )}
    </blockquote>
  );
}

// ---------- Books Tab ----------

function BooksTab({ bio, lang }: { bio: DeepBio; lang: string }) {
  const hasAuthored = bio.books.authored.filter(b => b.title).length > 0;
  const hasRecommended = bio.books.recommended.length > 0;

  if (!hasAuthored && !hasRecommended) {
    return (
      <div className="text-center py-12 text-sm text-gray-400">
        {lang === 'ko' ? '등록된 도서 정보가 없습니다.' : 'No book information available.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {hasAuthored && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-2">
            {lang === 'ko' ? '✍️ 저서' : '✍️ Authored'}
          </h3>
          <div className="space-y-2">
            {bio.books.authored.filter(b => b.title).map((b, i) => (
              <BookCard key={i} book={b} lang={lang} />
            ))}
          </div>
        </section>
      )}
      {hasRecommended && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-2">
            {lang === 'ko' ? '📖 추천 도서' : '📖 Recommended'}
          </h3>
          <div className="space-y-2">
            {bio.books.recommended.map((b, i) => (
              <BookCard key={i} book={b} lang={lang} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function BookCard({ book, lang }: { book: Book; lang: string }) {
  if (!book.title) return null;
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-sm font-medium text-gray-900">{book.title}</div>
      {book.author && <div className="text-xs text-gray-500 mt-0.5">{book.author}</div>}
      {book.why && <div className="text-xs text-gray-600 mt-1 italic">{ko(lang, book.why, book.whyKo)}</div>}
    </div>
  );
}

// ---------- Paywall Gate ----------

export function PaywallGate({ onUnlock, lang, extra }: { onUnlock: () => void; lang: string; extra?: string }) {
  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />
      <div className="bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-200 p-6 text-center">
        <div className="text-2xl mb-2">🔐</div>
        <h4 className="text-sm font-bold text-gray-900">
          {lang === 'ko' ? '더 알아보기' : 'See more'}
          {extra && <span className="text-indigo-500 ml-1">{extra}</span>}
        </h4>
        <p className="text-xs text-gray-500 mt-1 mb-4">
          {lang === 'ko'
            ? '커리어 타임라인, 실패 스토리, 명언을 확인하세요'
            : 'Unlock career timeline, failures, and quotes'}
        </p>
        <button
          onClick={onUnlock}
          className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
        >
          {lang === 'ko' ? '잠금 해제 (준비 중)' : 'Unlock (Coming Soon)'}
        </button>
      </div>
    </div>
  );
}
