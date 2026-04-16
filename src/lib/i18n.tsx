'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Lang = 'ko' | 'en';

type Dict = {
  // Header
  siteTagline: string;
  siteSubTagline: string;
  // FilterPanel
  searchPlaceholder: string;
  gender: string;
  all: string;
  male: string;
  female: string;
  dayPillar: string;
  allDayPillars: string;
  dayMaster: string;
  monthBranch: string;
  pattern: string;
  allNationalities: string;
  allIndustries: string;
  sort: string;
  sortNetWorthDesc: string;
  sortNetWorthAsc: string;
  sortNameAsc: string;
  resultsOf: (total: number) => string;
  clearFilters: string;
  // PersonGrid
  noResults: string;
  adjustFilters: string;
  // PersonCard
  cardDayPillar: string;
  cardPattern: string;
  cardMonthBranch: string;
  viewChart: string;
  showMore: string;
  showLess: string;
  hourPillar: string;
  monthPillar: string;
  yearPillar: string;
  // Language toggle
  languageLabel: string;
  // Analytics panel
  analyticsHeadlineWelcome: (total: number) => string;
  analyticsHeadlineFiltered: (count: number, pct: string) => string;
  analyticsTopDayMaster: string;        // "Top day masters" / "가장 많은 일간"
  analyticsTopDayPillar: string;        // "가장 많은 일주"
  analyticsTopPattern: string;          // "가장 많은 격국"
  analyticsTopNationality: string;      // "국적 TOP 5"
  analyticsTopIndustry: string;         // "업종 TOP 5"
  lastUpdated: string;
  creditsThanks: string;
  // Tabs
  tabMatch: string;
  tabBrowse: string;
  // Match flow
  matchHeadline: string;
  matchSubhead: string;
  inputModeBirthday: string;
  inputModeDirect: string;
  year: string;
  month: string;
  day: string;
  hour: string;
  hourOptional: string;
  hourUnknown: string;
  minute: string;
  submit: string;
  edit: string;
  confirmTitle: string;
  yourSaju: string;
  yourIlju: string;
  yourGyeokguk: string;
  yourWolji: string;
  seeResults: string;
  chartTwinsTitle: string; // 차트가 가장 비슷한 사람
  monthJuTitle: string;  // 같은 일주 · 같은 월주
  monthJuEmpty: string;  // 정확히 같은 월주를 가진 부자는 없습니다
  group1Title: string;   // 같은 일주 · 같은 월지
  group2Title: string;   // 같은 일주 · 같은 격국
  group3Title: string;   // 같은 일주
  groupEmpty: string;    // 일치하는 사람이 없습니다
  countPeople: (n: number) => string; // "N명"
  resetMyBirthday: string;
  directIljuLabel: string;
  directWoljiLabel: string;
  directGyeokgukLabel: string;
  hourPillarLabel: string;
  dayPillarLabel: string;
  monthPillarLabel: string;
  yearPillarLabel: string;
  revealReading: string;
  revealMatching: string;
  revealFound: (n: number) => string;
  seeSameIljuButton: (n: number) => string;
  hideSameIljuButton: string;
  heroMatchTagline: string;
  shareTitle: string;
  shareCopyLink: string;
  shareCopied: string;
  shareMore: string;
  shareSms: string;
  shareInstagram: string;
  shareInstagramHint: string;
  shareKakaoNotice: string;
  shareDefaultText: string;
  // Email capture — shown after match results
  emailCaptureTitle: string;
  emailCaptureSubtitle: string;
  emailCapturePlaceholder: string;
  emailCaptureSubmit: string;
  emailCaptureSubmitting: string;
  emailCaptureConsent: string;
  emailCaptureSuccess: string;
  emailCaptureErrorInvalid: string;
  emailCaptureErrorConsent: string;
  emailCaptureErrorGeneric: string;
};

const ko: Dict = {
  siteTagline: '세상은 넓고 부자는 많다!',
  siteSubTagline: '나와 비슷한 사주를 가진 부자는 누가 있을까?',
  searchPlaceholder: '궁금한 부자사주 이름을 검색해 보세요',
  gender: '성별',
  all: '전체',
  male: '남성',
  female: '여성',
  dayPillar: '일주 (六十甲子)',
  allDayPillars: '전체 일주',
  dayMaster: '일간',
  monthBranch: '월지',
  pattern: '격국',
  allNationalities: '모든 국적',
  allIndustries: '모든 업종',
  sort: '정렬',
  sortNetWorthDesc: '자산 높은순',
  sortNetWorthAsc: '자산 낮은순',
  sortNameAsc: '이름순',
  resultsOf: (t) => `/ ${t}명`,
  clearFilters: '필터 초기화',
  noResults: '해당하는 사람이 없습니다',
  adjustFilters: '필터를 조정해 보세요',
  cardDayPillar: '일주',
  cardPattern: '격국',
  cardMonthBranch: '월지',
  viewChart: '사주 확인',
  showMore: '더 보기',
  showLess: '접기',
  hourPillar: '시주',
  monthPillar: '월주',
  yearPillar: '년주',
  languageLabel: '언어',
  analyticsHeadlineWelcome: (total) => `전체 ${total.toLocaleString('ko-KR')}명`,
  analyticsHeadlineFiltered: (count, pct) =>
    `${count.toLocaleString('ko-KR')}명 · 전체의 ${pct}%`,
  analyticsTopDayMaster: '가장 많은 일간',
  analyticsTopDayPillar: '가장 많은 일주',
  analyticsTopPattern: '가장 많은 격국',
  analyticsTopNationality: '국적 TOP 5',
  analyticsTopIndustry: '업종 TOP 5',
  lastUpdated: '최종 업데이트 2026년 4월 8일',
  creditsThanks: '도움주신 내친이님 감사합니다',
  tabMatch: '매치',
  tabBrowse: '전체 부자',
  matchHeadline: '나와 비슷한 사주를 가진 부자는 누가 있을까?',
  matchSubhead: '생년월일을 입력하면 같은 일주·월지·격국을 가진 부자들을 찾아드립니다.',
  inputModeBirthday: '생년월일로',
  inputModeDirect: '사주 직접 입력',
  year: '년',
  month: '월',
  day: '일',
  hour: '시',
  hourOptional: '시 (선택)',
  hourUnknown: '모름',
  minute: '분',
  submit: '사주 보기',
  edit: '수정',
  confirmTitle: '당신의 사주가 맞나요?',
  yourSaju: '당신의 사주',
  yourIlju: '일주',
  yourGyeokguk: '격국',
  yourWolji: '월지',
  seeResults: '결과 보기',
  chartTwinsTitle: '차트가 가장 비슷한 사람',
  monthJuTitle: '같은 일주 · 같은 월주',
  monthJuEmpty: '정확히 같은 월주를 가진 부자는 없습니다',
  group1Title: '같은 일주 · 같은 월지',
  group2Title: '같은 일주 · 같은 격국',
  group3Title: '같은 일주',
  groupEmpty: '해당하는 부자가 없습니다',
  countPeople: (n) => `${n.toLocaleString('ko-KR')}명`,
  resetMyBirthday: '다시 하기',
  directIljuLabel: '일주 (六十甲子)',
  directWoljiLabel: '월지 (12 지지)',
  directGyeokgukLabel: '격국',
  hourPillarLabel: '시주',
  dayPillarLabel: '일주',
  monthPillarLabel: '월주',
  yearPillarLabel: '년주',
  revealReading: '사주를 읽는 중…',
  revealMatching: '같은 기운을 찾는 중…',
  revealFound: (n) => `${n.toLocaleString('ko-KR')}명의 부자를 찾았습니다`,
  seeSameIljuButton: (n) => `나랑 일주 같은 부자 보기 (${n.toLocaleString('ko-KR')}명)`,
  hideSameIljuButton: '접기',
  heroMatchTagline: '의 부자가 비슷한 사주를 가졌습니다',
  shareTitle: '친구한테도 가르쳐주기',
  shareCopyLink: '링크 복사',
  shareCopied: '복사됨!',
  shareMore: '더보기',
  shareSms: '문자',
  shareInstagram: '인스타그램',
  shareInstagramHint: '링크가 복사됐어요! 인스타 스토리나 DM에 붙여넣기 하세요',
  shareKakaoNotice: '카카오톡 공유 기능은 추후에 추가될 예정입니다.',
  shareDefaultText: '내 사주랑 비슷한 부자는? 부자사주에서 확인해 보세요',
  emailCaptureTitle: '새로운 부자가 추가되면 알려드릴까요?',
  emailCaptureSubtitle: '이메일을 남겨주시면 새 기능과 새 부자사주가 업데이트될 때 알려드립니다.',
  emailCapturePlaceholder: '이메일 주소',
  emailCaptureSubmit: '알림 받기',
  emailCaptureSubmitting: '저장 중…',
  emailCaptureConsent: '마케팅 정보 수신에 동의합니다 (언제든지 구독 취소 가능)',
  emailCaptureSuccess: '감사합니다! 업데이트가 있을 때 알려드릴게요.',
  emailCaptureErrorInvalid: '올바른 이메일 주소를 입력해주세요.',
  emailCaptureErrorConsent: '수신 동의에 체크해주세요.',
  emailCaptureErrorGeneric: '저장에 실패했어요. 잠시 후 다시 시도해주세요.',
};

const en: Dict = {
  siteTagline: 'Saju analysis of the world\u2019s billionaires',
  siteSubTagline: 'Which billionaires share your 사주 structure?',
  searchPlaceholder: 'Search by name...',
  gender: 'Gender',
  all: 'All',
  male: 'Male',
  female: 'Female',
  dayPillar: 'Day Pillar (일주 · 六十甲子)',
  allDayPillars: 'All day pillars',
  dayMaster: 'Day Master (일간)',
  monthBranch: 'Month Branch (월지)',
  pattern: 'Pattern (격국)',
  allNationalities: 'All nationalities',
  allIndustries: 'All industries',
  sort: 'Sort',
  sortNetWorthDesc: 'Net worth, high to low',
  sortNetWorthAsc: 'Net worth, low to high',
  sortNameAsc: 'Name (A–Z)',
  resultsOf: (t) => `of ${t}`,
  clearFilters: 'Clear filters',
  noResults: 'No one matches these filters',
  adjustFilters: 'Try adjusting your filters',
  cardDayPillar: 'Day Pillar',
  cardPattern: 'Pattern',
  cardMonthBranch: 'Month Branch',
  viewChart: 'View chart',
  showMore: 'Show more',
  showLess: 'Show less',
  hourPillar: 'Hour',
  monthPillar: 'Month',
  yearPillar: 'Year',
  languageLabel: 'Language',
  analyticsHeadlineWelcome: (total) => `${total.toLocaleString('en-US')} billionaires`,
  analyticsHeadlineFiltered: (count, pct) =>
    `${count.toLocaleString('en-US')} · ${pct}% of all`,
  analyticsTopDayMaster: 'Top day masters',
  analyticsTopDayPillar: 'Top day pillars',
  analyticsTopPattern: 'Top patterns',
  analyticsTopNationality: 'Top 5 nationalities',
  analyticsTopIndustry: 'Top 5 industries',
  lastUpdated: 'Last updated Apr 8, 2026',
  creditsThanks: 'Thanks to 내친이 for the help',
  // Tab labels stay in Korean by user request
  tabMatch: '매치',
  tabBrowse: '전체 부자',
  matchHeadline: 'Which billionaires share your 사주?',
  matchSubhead: 'Enter your birthday to find billionaires with the same 일주, 월지, and 격국',
  inputModeBirthday: 'By birthday',
  inputModeDirect: 'Enter saju directly',
  year: 'Year',
  month: 'Month',
  day: 'Day',
  hour: 'Hour',
  hourOptional: 'Hour (optional)',
  hourUnknown: 'Unknown',
  minute: 'Minute',
  submit: 'Calculate my 사주',
  edit: 'Edit',
  confirmTitle: 'Is this your 사주?',
  yourSaju: 'Your 사주',
  yourIlju: '일주',
  yourGyeokguk: '격국',
  yourWolji: '월지',
  seeResults: 'See results',
  chartTwinsTitle: 'Most similar chart',
  monthJuTitle: 'Same 일주 · same 월주',
  monthJuEmpty: 'No billionaires share your exact 월주',
  group1Title: 'Same 일주 · same 월지',
  group2Title: 'Same 일주 · same 격국',
  group3Title: 'Same 일주',
  groupEmpty: 'No billionaires in this group',
  countPeople: (n) => `${n.toLocaleString('en-US')} people`,
  resetMyBirthday: 'Try again',
  directIljuLabel: '일주 (Day Pillar)',
  directWoljiLabel: '월지 (Month Branch)',
  directGyeokgukLabel: '격국 (Pattern)',
  hourPillarLabel: '시주 (Hour)',
  dayPillarLabel: '일주 (Day)',
  monthPillarLabel: '월주 (Month)',
  yearPillarLabel: '년주 (Year)',
  revealReading: 'Reading your 사주…',
  revealMatching: 'Finding kindred spirits…',
  revealFound: (n) => `Found ${n.toLocaleString('en-US')} billionaires`,
  seeSameIljuButton: (n) => `See billionaires with my 일주 (${n.toLocaleString('en-US')})`,
  hideSameIljuButton: 'Hide',
  heroMatchTagline: ' billionaires share your energy',
  shareTitle: 'Share with friends',
  shareCopyLink: 'Copy link',
  shareCopied: 'Copied!',
  shareMore: 'More',
  shareSms: 'Text',
  shareInstagram: 'Instagram',
  shareInstagramHint: 'Link copied! Paste it into your Instagram story or DM',
  shareKakaoNotice: 'KakaoTalk sharing is coming soon.',
  shareDefaultText: 'Which billionaires share your 사주? Find out on 부자사주',
  emailCaptureTitle: 'Want to know when new billionaires are added?',
  emailCaptureSubtitle: 'Leave your email and I\u2019ll let you know when new features and new billionaire charts are added.',
  emailCapturePlaceholder: 'Email address',
  emailCaptureSubmit: 'Notify me',
  emailCaptureSubmitting: 'Saving\u2026',
  emailCaptureConsent: 'I agree to receive updates (unsubscribe anytime)',
  emailCaptureSuccess: 'Thanks! I\u2019ll let you know when there are updates.',
  emailCaptureErrorInvalid: 'Please enter a valid email address.',
  emailCaptureErrorConsent: 'Please check the consent box.',
  emailCaptureErrorGeneric: 'Something went wrong. Please try again in a moment.',
};

const dictionaries: Record<Lang, Dict> = { ko, en };

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dict;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = 'bujasaju.lang';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ko');

  // Load persisted preference on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'ko' || stored === 'en') {
        setLangState(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  // Sync <html lang> and persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const value: LanguageContextValue = {
    lang,
    setLang: setLangState,
    t: dictionaries[lang],
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
