'use client';

/**
 * DeepBioContent — single-scroll replacement for the tabs (Story / Quotes / Books).
 *
 * 모든 섹션을 한 페이지에 노출. 데이터 없는 섹션은 자동 hide. 페이월(paywall)
 * 없이 바로 노출 (어록·도서가 비어있어도 빈 탭 보일 위험 없음 — 그냥 섹션
 * 전체가 안 보임).
 *
 * 섹션 순서:
 *   1. 사주와의 닮은 점 (userSaju가 있을 때만 — match flow에서 호출 시)
 *   2. Key Facts (출생지·집안·학력·창업 등 라벨-값 표)
 *   3. 사주와 부의 연결 (sajuConnection)
 *   4. 자산 변화 차트
 *   5. 커리어 타임라인
 *   6. 어록 (있을 때만)
 *   7. 실패와 교훈 (있을 때만)
 *   8. 추천 도서 (있을 때만)
 *   9. 출처
 */

import type { DeepBio, Quote, Book } from '@/lib/deepBio';
import type { EnrichedPerson, SajuResult, CheonGan } from '@/lib/saju/types';
import WealthChart from './WealthChart';
import { ko } from './DeepBioTabs';
import { getSipSin } from '@/lib/saju/tenGods';

interface Props {
  bio: DeepBio;
  person: EnrichedPerson;
  /** 사용자 사주 — match flow에서 전달. 있으면 비교 박스 노출. */
  userSaju?: SajuResult;
  lang: string;
  /** Rendered only at the top of the mobile view (e.g. a compact saju chart). */
  mobileHeader?: React.ReactNode;
}

const STEM_TO_OHAENG: Record<string, string> = {
  갑: '목', 을: '목', 병: '화', 정: '화', 무: '토',
  기: '토', 경: '금', 신: '금', 임: '수', 계: '수',
};

const ILJU_IMAGE: Record<string, string> = {
  갑: '큰 나무', 을: '풀·화초', 병: '태양', 정: '촛불·등불',
  무: '큰 산', 기: '논밭', 경: '쇠덩이', 신: '보석',
  임: '큰 물·강', 계: '비·이슬',
};

const BRANCH_IMAGE: Record<string, string> = {
  자: '한겨울 물', 축: '늦겨울 진흙', 인: '이른봄 큰나무', 묘: '봄 풀',
  진: '늦봄 흙', 사: '초여름 큰불', 오: '한여름 태양', 미: '늦여름 마른흙',
  신: '초가을 금', 유: '한가을 보석', 술: '늦가을 마른땅', 해: '초겨울 물',
};

/** 사용자 vs 부자 사주 비교 항목들 만들기 */
function buildMatchPoints(userSaju: SajuResult, person: EnrichedPerson, lang: string): {
  type: 'match' | 'differ';
  text: string;
}[] {
  const points: { type: 'match' | 'differ'; text: string }[] = [];

  const userSj = userSaju.saju;
  const personIlju = person.saju.ilju;
  const userIlju = `${userSj.day.stem}${userSj.day.branch}`;
  if (personIlju === userIlju) {
    const stemImg = ILJU_IMAGE[userSj.day.stem];
    const branchImg = BRANCH_IMAGE[userSj.day.branch];
    points.push({
      type: 'match',
      text: `같은 일주 — ${userIlju} (${stemImg} + ${branchImg})`,
    });
  }

  // 격국 비교
  if (userSaju.gyeokguk === person.saju.gyeokguk) {
    points.push({
      type: 'match',
      text: `같은 격국 — ${userSaju.gyeokguk}`,
    });
  } else {
    points.push({
      type: 'differ',
      text: `다른 격국 — 그는 ${person.saju.gyeokguk}, 당신은 ${userSaju.gyeokguk}`,
    });
  }

  // 월지 비교
  if (userSj.month.branch === userSaju.wolji && userSaju.wolji === person.saju.wolji) {
    points.push({
      type: 'match',
      text: `같은 월지 — ${userSaju.wolji}월생`,
    });
  }

  // 일간 오행 비교
  const userDayOh = STEM_TO_OHAENG[userSj.day.stem];
  const personDayOh = STEM_TO_OHAENG[person.saju.ilju[0]];
  if (userDayOh === personDayOh && userIlju !== personIlju) {
    points.push({
      type: 'match',
      text: `같은 일간 오행 — ${userDayOh}`,
    });
  }

  return points;
}

export default function DeepBioContent({ bio, person, userSaju, lang, mobileHeader }: Props) {
  const matchPoints = userSaju ? buildMatchPoints(userSaju, person, lang) : [];

  // Key facts — childhood에서 추출
  const keyFacts: { label: string; value: string }[] = [];
  if (bio.childhood?.birthPlace) {
    keyFacts.push({
      label: lang === 'ko' ? '출생지' : 'Born',
      value: ko(lang, bio.childhood.birthPlace, bio.childhood.birthPlaceKo),
    });
  }
  if (bio.childhood?.familyBackground) {
    keyFacts.push({
      label: lang === 'ko' ? '집안' : 'Family',
      value: ko(lang, bio.childhood.familyBackground, bio.childhood.familyBackgroundKo),
    });
  }
  if (bio.childhood?.education) {
    keyFacts.push({
      label: lang === 'ko' ? '학력' : 'Education',
      value: ko(lang, bio.childhood.education, bio.childhood.educationKo),
    });
  }
  if (person.wealthOrigin) {
    keyFacts.push({
      label: lang === 'ko' ? '부의 출처' : 'Source',
      value: lang === 'ko'
        ? (person.wealthOrigin === 'self-made' ? '자수성가' : person.wealthOrigin === 'inherited' ? '상속' : person.wealthOrigin)
        : person.wealthOrigin,
    });
  }

  const hasQuotes = bio.quotes && bio.quotes.length > 0;
  const hasFailures = bio.failures && bio.failures.length > 0;
  const hasAuthored = bio.books?.authored?.filter(b => b.title).length > 0;
  const hasRecommended = bio.books?.recommended?.length > 0;
  const hasBooks = hasAuthored || hasRecommended;
  const hasTimeline = bio.careerTimeline && bio.careerTimeline.length > 0;
  const hasWealth = bio.wealthHistory && bio.wealthHistory.length >= 2;
  const hasTraits = bio.personalTraits && (bio.personalTraits.knownFor || bio.personalTraits.philanthropy);
  const hasSources = bio.sources && bio.sources.length > 0;

  return (
    <div className="space-y-6">
      {mobileHeader && <div className="lg:hidden">{mobileHeader}</div>}

      {/* 1. Saju match callout (only when userSaju is provided) */}
      {userSaju && matchPoints.length > 0 && (
        <section className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-4">
          <h3 className="text-sm font-bold text-indigo-900 mb-2.5 flex items-center gap-1.5">
            <span>🔮</span>
            <span>{lang === 'ko' ? '당신과 닮은 점' : 'Your Connection'}</span>
          </h3>
          <ul className="space-y-1.5 text-sm">
            {matchPoints.map((p, i) => (
              <li key={i} className="flex gap-2 leading-relaxed">
                <span className={p.type === 'match' ? 'text-emerald-600 font-bold shrink-0' : 'text-rose-500 font-bold shrink-0'}>
                  {p.type === 'match' ? '✓' : '✗'}
                </span>
                <span className="text-gray-800">{p.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 2. Key Facts (label-value) */}
      {keyFacts.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-2.5">
            {lang === 'ko' ? '👤 한눈에 보는 정보' : '👤 Key Facts'}
          </h3>
          <dl className="rounded-lg border border-gray-100 divide-y divide-gray-100">
            {keyFacts.map((f, i) => (
              <div key={i} className="flex gap-3 px-3 py-2.5">
                <dt className="text-xs text-gray-500 font-medium w-20 shrink-0 pt-0.5">{f.label}</dt>
                <dd className="text-sm text-gray-800 leading-snug flex-1">{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* 3. Saju connection (v2 only — type-cast since DeepBio doesn't include this field) */}
      {(() => {
        const sc = (bio as unknown as { sajuConnection?: { summary?: string; summaryKo?: string } }).sajuConnection;
        if (!sc || (!sc.summary && !sc.summaryKo)) return null;
        return (
          <section className="bg-amber-50/40 border border-amber-100 rounded-xl p-3.5">
            <h3 className="text-sm font-bold text-amber-900 mb-1.5 flex items-center gap-1.5">
              <span>🔗</span>
              <span>{lang === 'ko' ? '사주와 부의 연결' : 'Saju ↔ Wealth'}</span>
            </h3>
            <p className="text-sm text-gray-800 leading-relaxed">
              {ko(lang, sc.summary ?? '', sc.summaryKo)}
            </p>
          </section>
        );
      })()}

      {/* 4. Personal traits — tags */}
      {hasTraits && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-2.5">
            {lang === 'ko' ? '⭐ 대표 활동' : '⭐ Known For'}
          </h3>
          <p className="text-sm text-gray-800 leading-relaxed">
            {ko(lang, bio.personalTraits!.knownFor, bio.personalTraits!.knownForKo)}
          </p>
          {bio.personalTraits!.philanthropy && (
            <div className="mt-2 inline-flex items-start gap-1.5 bg-emerald-50 text-emerald-700 rounded-lg px-2.5 py-1.5 text-xs font-medium">
              <span>🤝</span>
              <span className="leading-snug">{ko(lang, bio.personalTraits!.philanthropy, bio.personalTraits!.philanthropyKo)}</span>
            </div>
          )}
        </section>
      )}

      {/* 5. Wealth chart */}
      {hasWealth && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-2">
            {lang === 'ko' ? '💰 자산 변화' : '💰 Wealth History'}
          </h3>
          <WealthChart
            data={bio.wealthHistory}
            timeline={bio.careerTimeline}
            lang={lang}
            className="bg-gray-50 rounded-xl p-3"
            source={bio.wealthHistorySource}
          />
        </section>
      )}

      {/* 6. Career timeline */}
      {hasTimeline && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-3">
            {lang === 'ko' ? '📅 커리어 타임라인' : '📅 Career Timeline'}
          </h3>
          <div className="relative pl-5 border-l-2 border-indigo-100 space-y-3">
            {bio.careerTimeline.map((event, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[27px] top-0.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white" />
                <div className="text-[10px] font-bold text-indigo-600">{event.year}</div>
                <div className="text-[13px] text-gray-700 mt-0.5 leading-snug">
                  {ko(lang, event.event, event.eventKo)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. Quotes */}
      {hasQuotes && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-2.5">
            {lang === 'ko' ? '💬 어록' : '💬 Quotes'}
          </h3>
          <div className="space-y-3">
            {bio.quotes.map((q, i) => (
              <QuoteCard key={i} quote={q} lang={lang} />
            ))}
          </div>
        </section>
      )}

      {/* 8. Failures */}
      {hasFailures && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-2.5">
            {lang === 'ko' ? '⚠️ 실패와 교훈' : '⚠️ Failures & Lessons'}
          </h3>
          <div className="space-y-2.5">
            {bio.failures.map((f, i) => (
              <div key={i} className="bg-rose-50/60 border border-rose-100 rounded-lg p-3">
                <div className="text-xs font-bold text-rose-700">{f.year}</div>
                <p className="text-[13px] text-gray-800 mt-1 leading-snug">
                  {ko(lang, f.description, f.descriptionKo)}
                </p>
                {f.lesson && (
                  <p className="text-xs text-emerald-700 mt-2 pt-2 border-t border-rose-100/60 leading-snug">
                    <span className="font-semibold">{lang === 'ko' ? '교훈: ' : 'Lesson: '}</span>
                    {ko(lang, f.lesson, f.lessonKo)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 9. Books */}
      {hasBooks && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-2.5">
            {lang === 'ko' ? '📚 도서' : '📚 Books'}
          </h3>
          {hasAuthored && (
            <div className="mb-3">
              <div className="text-xs font-medium text-gray-500 mb-1.5">
                {lang === 'ko' ? '저서' : 'Authored'}
              </div>
              <div className="space-y-2">
                {bio.books.authored.filter(b => b.title).map((b, i) => (
                  <BookCard key={i} book={b} lang={lang} />
                ))}
              </div>
            </div>
          )}
          {hasRecommended && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1.5">
                {lang === 'ko' ? '추천 도서' : 'Recommended'}
              </div>
              <div className="space-y-2">
                {bio.books.recommended.map((b, i) => (
                  <BookCard key={i} book={b} lang={lang} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 10. Sources */}
      {hasSources && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-2">
            {lang === 'ko' ? '📰 출처' : '📰 Sources'}
          </h3>
          <ul className="text-xs text-gray-600 space-y-1.5">
            {bio.sources!.map((s, i) => {
              const label = ko(lang, s.label, s.labelKo);
              const outlet = s.outlet || s.outletKo ? ko(lang, s.outlet ?? '', s.outletKo) : '';
              const meta = [outlet, s.date].filter(Boolean).join(' · ');
              return (
                <li key={i} className="leading-relaxed">
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 hover:underline break-all"
                    >
                      {label}
                    </a>
                  ) : (
                    <span>{label}</span>
                  )}
                  {meta && <span className="text-gray-400"> — {meta}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function QuoteCard({ quote, lang }: { quote: Quote; lang: string }) {
  return (
    <blockquote className="bg-gray-50 rounded-lg p-3.5 border-l-4 border-indigo-300">
      <p className="text-sm text-gray-800 font-medium leading-relaxed">
        &ldquo;{ko(lang, quote.text, quote.textKo)}&rdquo;
      </p>
      {quote.context && (
        <p className="text-xs text-gray-500 mt-2">— {ko(lang, quote.context, quote.contextKo)}</p>
      )}
      {quote.source && (
        <p className="text-xs text-gray-400 mt-1">{quote.source}</p>
      )}
    </blockquote>
  );
}

function BookCard({ book, lang }: { book: Book; lang: string }) {
  if (!book.title) return null;
  return (
    <div className="flex gap-2.5 bg-gray-50 rounded-lg p-2.5">
      <div className="w-9 h-12 bg-gradient-to-br from-indigo-400 to-blue-500 rounded flex items-center justify-center text-white text-base shrink-0">
        📕
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 leading-snug">{book.title}</div>
        {book.author && <div className="text-xs text-gray-500 mt-0.5">{book.author}</div>}
        {book.why && (
          <div className="text-xs text-gray-600 mt-1 leading-snug">
            {ko(lang, book.why, book.whyKo)}
          </div>
        )}
      </div>
    </div>
  );
}
