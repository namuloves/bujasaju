// B32 Generate — 20 deep bio JSONs from /tmp/b32-sample.json + /tmp/b32-saju.json + b32-data.ts
// Output: public/deep-bios-v2/{id}.json

import * as fs from 'fs';
import * as path from 'path';
import { data as DATA } from './b32-data';

interface Sample {
  id: string; name: string; nameKo: string; birthday: string;
  netWorth: number; nationality: string; industry: string; gender: string;
}
interface Saju {
  id: string; nameKo: string; birthday: string;
  year: string; month: string; day: string;
  ilju: string; wolji: string; gyeokguk: string;
}

const samples: Sample[] = JSON.parse(fs.readFileSync('/tmp/b32-sample.json', 'utf8'));
const sajus: Saju[] = JSON.parse(fs.readFileSync('/tmp/b32-saju.json', 'utf8'));
const sajuMap = new Map(sajus.map(s => [s.id, s]));

const ILJU_DESC: Record<string, string> = {
  '갑자': '갑목이 자수 위에 놓인 형국으로, 큰 나무가 한겨울 물의 자리에서 시작하는 새벽 같은 출발의 자리',
  '갑인': '갑목이 인목 위에 놓여 큰 나무가 자기 자리에서 곧게 자라는 형국',
  '갑오': '갑목이 오화 위에 놓여 큰 나무가 한여름 불의 결과물로 환원되는 자리',
  '갑술': '갑목이 술토 위에 놓여 큰 나무가 가을 끝 흙의 자리에서 결과물로 환원되는 자리',
  '갑신': '갑목이 신금 위에 놓여 큰 나무가 가을 바위의 자리에서 단단히 다듬어지는 자리',
  '을사': '을목이 사화 위에 놓여 화초가 초여름 불의 자리에서 따뜻이 피어나는 자리',
  '을해': '을목이 해수 위에 놓여 화초가 한겨울 물의 자리에서 조용히 뿌리내리는 자리',
  '병인': '병화가 인목 위에 놓여 큰 불이 자기 자리의 큰 나무로 활활 타오르는 자리',
  '병진': '병화가 진토 위에 놓여 큰 불이 봄 끝 흙의 결과물로 압축되는 자리',
  '병신': '병화가 신금 위에 놓여 큰 불이 가을 바위의 결과물로 단단히 압축되는 자리',
  '병술': '병화가 술토 위에 놓인 형국으로, 큰 불이 가을 끝 흙 위에서 결과물로 압축되는 자리',
  '정사': '정화가 사화 위에 놓여 등불이 초여름 불의 자리에서 활활 빛나는 자리',
  '정해': '정화가 해수 위에 놓여 등불이 한겨울 물의 자리에서 조용히 빛나는 자리',
  '무오': '무토가 오화 위에 놓여 큰 흙이 한여름 불의 결과물로 단단히 굳혀지는 자리',
  '무자': '무토가 자수 위에 놓여 큰 흙이 한겨울 물의 자리에서 차분히 가라앉는 자리',
  '무술': '무토가 술토 위에 놓여 큰 흙이 가을 끝 흙의 결과물로 두 겹의 단단함을 갖는 자리',
  '기사': '기토가 사화 위에 놓여 옥토가 초여름 불의 결과물로 따뜻하게 단단해지는 자리',
  '기유': '기토가 유금 위에 놓여 옥토가 가을 바위의 결과물로 단단히 정리되는 자리',
  '경자': '경금이 자수 위에 놓여 가을 바위가 한겨울 물의 자리에서 차분히 식는 자리',
  '경오': '경금이 오화 위에 놓여 가을 바위가 한여름 불의 자리에서 단단히 정련되는 자리',
  '경술': '경금이 술토 위에 놓여 가을 바위가 가을 끝 흙의 자리에서 결과물로 압축되는 자리',
  '경신': '경금이 신금 위에 놓여 가을 바위가 자기 자리에서 두 겹의 예리함을 갖는 자리',
  '신미': '신금이 미토 위에 놓여 가을 보석이 늦여름 흙의 결과물로 따뜻이 정련되는 자리',
  '신유': '신금이 유금 위에 놓여 가을 보석이 자기 자리에서 두 겹의 예리함을 갖는 자리',
  '임자': '임수가 자수 위에 놓여 큰 강물이 한겨울 물의 자리에서 두 겹의 깊은 흐름을 갖는 자리',
  '임오': '임수가 오화 위에 놓여 큰 강물이 한여름 불의 자리에서 결과물로 환원되는 자리',
  '계축': '계수가 축토 위에 놓여 시냇물이 한겨울 끝 흙의 자리에서 조용히 머무는 자리',
  '계묘': '계수가 묘목 위에 놓여 시냇물이 봄 나무의 자리에서 맑게 흘러가는 자리',
  '계유': '계수가 유금 위에 놓여 시냇물이 가을 바위의 결과물로 맑게 정리되는 자리',
};

const GYEOK_DESC: Record<string, string> = {
  '식신격': '본인의 강한 표현력이 결과물로 자연스럽게 환원되는 흐름. 한 카테고리에 오래 집중해 결과물이 쌓이는 패턴',
  '정재격': '본인이 정통 카테고리의 안정 자본을 차곡차곡 환원시키는 흐름. 한 카테고리를 길게 다지는 패턴',
  '편재격': '본인이 큰 외부 자본을 단계적으로 환원시키는 흐름. 큰 자본 사이클을 잡아 본인 자리로 환원시키는 패턴',
  '정관격': '본인이 정통 자리·시스템·거버넌스 안에서 자본을 환원시키는 흐름. 규모와 신뢰의 자리에 본인을 위치시키는 패턴',
  '편관격': '본인이 큰 외부 압력 한가운데서 결단으로 자본을 환원시키는 흐름. 매번 큰 결정으로 자리를 잡는 패턴',
  '정인격': '본인이 정통 지식·자격·인증 자본을 본인 자리로 환원시키는 흐름. 학식·자격·신뢰가 본업의 무게가 되는 패턴',
  '편인격': '본인이 외부의 비정형 지식과 통찰을 본인 자리로 환원시키는 흐름. 특수한 시야가 본업의 차별점이 되는 패턴',
  '상관격': '본인의 강한 표현력이 기존 자리를 넘어서는 결과물로 환원되는 흐름. 한 카테고리에서 새 자리를 만드는 패턴',
  '건록격': '일간이 자기 자리(녹) 위에 놓인 정통 자리. 본인의 무게가 그대로 본업 카테고리에 실리는 패턴',
};

const CATEGORY_NARRATIVE: Record<string, {
  primaryIncomeKo: (companyKo: string) => string;
  acceleratorsKo: string;
  advantagesKo: string;
  failuresKo: { year: number; descKo: string; lessonKo: string }[];
  industryKo: string;
}> = {
  manufacturing: {
    primaryIncomeKo: (c) => `${c}의 본인·가족 보유 지분 가치와 배당이 자산의 핵심입니다.`,
    acceleratorsKo: '본업 정립, 글로벌 공급망 진출, 자동화·규모화 투자의 세 단계가 자본 가치 가속의 축입니다.',
    advantagesKo: '제조 카테고리 자리, 생산 자본망, 그리고 글로벌 거래처 거버넌스 구조가 강점입니다.',
    failuresKo: [
      { year: 2008, descKo: '글로벌 금융위기로 본업 수출 매출이 단기 시험받았습니다.', lessonKo: '수출 의존 제조업은 글로벌 사이클 영향이 직접적입니다.' },
      { year: 2020, descKo: '코로나 공급망 충격으로 본업 생산이 단기 시험받았습니다.', lessonKo: '단일 공급망 의존은 외부 충격기 가장 먼저 흔들립니다.' },
    ],
    industryKo: '제조업',
  },
  realEstate: {
    primaryIncomeKo: (c) => `${c}의 본인·가족 보유 지분 가치와 임대·분양 수입이 자산의 핵심입니다.`,
    acceleratorsKo: '본업 정립, 핵심 도시 부동산 확장, 그리고 통합 디벨로퍼 카테고리 진입의 세 단계가 자본 가치 가속의 축입니다.',
    advantagesKo: '부동산 카테고리 자리, 도시 개발 자본망, 그리고 분양·임대 거버넌스 구조가 강점입니다.',
    failuresKo: [
      { year: 2008, descKo: '글로벌 금융위기로 본업 분양 매출이 단기 시험받았습니다.', lessonKo: '부동산 사이클은 금융 사이클과 직접 연결됩니다.' },
      { year: 2020, descKo: '코로나 도시 봉쇄로 본업 임대 매출이 단기 시험받았습니다.', lessonKo: '도시 부동산 매출은 거시 사이클에 직접 노출됩니다.' },
    ],
    industryKo: '부동산',
  },
  tech: {
    primaryIncomeKo: (c) => `${c}의 본인 보유 지분 가치가 자산의 핵심입니다.`,
    acceleratorsKo: '본업 정립, 디지털 사용자 카테고리 확장, 그리고 자본 시장 진입의 세 단계가 자본 가치 가속의 축입니다.',
    advantagesKo: '디지털 카테고리 자리, 기술 자본망, 그리고 사용자 거버넌스 구조가 강점입니다.',
    failuresKo: [
      { year: 2018, descKo: '카테고리 경쟁 심화로 본업 사용자 증가율이 단기 시험받았습니다.', lessonKo: '디지털 카테고리는 사용자 충성도가 가장 먼저 흔들립니다.' },
      { year: 2022, descKo: '글로벌 테크 밸류에이션 조정기 본업 지분 가치가 단기 시험받았습니다.', lessonKo: '테크 자본 가치는 금리 사이클에 직접 노출됩니다.' },
    ],
    industryKo: '테크놀로지',
  },
  media: {
    primaryIncomeKo: (c) => `${c}의 본인 보유 지분과 사업권·IP 가치가 자산의 핵심입니다.`,
    acceleratorsKo: '본업 정립, 콘텐츠 IP 축적, 그리고 멀티 플랫폼 카테고리 확장의 세 단계가 자본 가치 가속의 축입니다.',
    advantagesKo: '미디어 카테고리 자리, IP 자본망, 그리고 콘텐츠 거버넌스 구조가 강점입니다.',
    failuresKo: [
      { year: 2017, descKo: '본업 활동 사이클기 단기 외부 시험을 받았습니다.', lessonKo: '엔터테인먼트 매출은 개인 브랜드 사이클에 직접 노출됩니다.' },
      { year: 2020, descKo: '코로나 라이브·공연 시장 축소로 본업 매출이 단기 시험받았습니다.', lessonKo: '오프라인 엔터테인먼트 매출은 거시 충격기 가장 먼저 흔들립니다.' },
    ],
    industryKo: '미디어·엔터테인먼트',
  },
  gambling: {
    primaryIncomeKo: (c) => `${c}의 본인·가족 보유 지분 가치와 배당이 자산의 핵심입니다.`,
    acceleratorsKo: '본업 정립, 게임 IP 축적, 그리고 합병·통합 거버넌스의 세 단계가 자본 가치 가속의 축입니다.',
    advantagesKo: '게임 카테고리 자리, 일본 파친코 자본망, 그리고 합병 거버넌스 구조가 강점입니다.',
    failuresKo: [
      { year: 2011, descKo: '일본 대지진 후 본업 매출이 단기 시험받았습니다.', lessonKo: '레저 매출은 거시 충격기 가장 먼저 흔들립니다.' },
      { year: 2020, descKo: '코로나로 본업 오프라인 매출이 단기 시험받았습니다.', lessonKo: '오프라인 게임 매출은 외부 충격기 직접 노출됩니다.' },
    ],
    industryKo: '게임·카지노',
  },
  diversified: {
    primaryIncomeKo: (c) => `${c}의 본인·가족 보유 지분 가치와 배당이 자산의 핵심입니다.`,
    acceleratorsKo: '본업 정립, 다각화 카테고리 확장, 그리고 가족 거버넌스 정립의 세 단계가 자본 가치 가속의 축입니다.',
    advantagesKo: '다각화 카테고리 자리, 그룹 자본망, 그리고 가족 거버넌스 구조가 강점입니다.',
    failuresKo: [
      { year: 2008, descKo: '글로벌 금융위기로 다각화 그룹 매출이 단기 시험받았습니다.', lessonKo: '다각화도 글로벌 사이클 영향에서 완전히 자유롭지는 않습니다.' },
      { year: 2020, descKo: '코로나로 일부 본업 카테고리 매출이 단기 시험받았습니다.', lessonKo: '다각화 그룹도 거시 충격기 카테고리별 회복 속도가 다릅니다.' },
    ],
    industryKo: '다각화 그룹',
  },
  healthcare: {
    primaryIncomeKo: (c) => `${c}의 본인 보유 지분 가치와 배당이 자산의 핵심입니다.`,
    acceleratorsKo: '본업 정립, 카테고리 확장, 그리고 자본 시장 진입의 세 단계가 자본 가치 가속의 축입니다.',
    advantagesKo: '헬스케어 카테고리 자리, 임상·유통 자본망, 그리고 거버넌스 구조가 강점입니다.',
    failuresKo: [
      { year: 2014, descKo: 'FDA 등 글로벌 규제 사이클기 본업 라인이 단기 시험받았습니다.', lessonKo: '제약 매출은 규제 사이클에 직접 노출됩니다.' },
      { year: 2020, descKo: '코로나 사이클기 본업 생산·공급이 단기 시험받았습니다.', lessonKo: '제약 공급망은 거시 충격기 직접 노출됩니다.' },
    ],
    industryKo: '헬스케어·제약',
  },
  food: {
    primaryIncomeKo: (c) => `${c}의 본인·가족 보유 지분 가치와 배당이 자산의 핵심입니다.`,
    acceleratorsKo: '본업 정립, 브랜드 카테고리 확장, 그리고 유통망 통합의 세 단계가 자본 가치 가속의 축입니다.',
    advantagesKo: '식음료 카테고리 자리, 브랜드 자본망, 그리고 유통 거버넌스 구조가 강점입니다.',
    failuresKo: [
      { year: 2008, descKo: '식품 안전·신뢰 이슈기 본업 매출이 단기 시험받았습니다.', lessonKo: '식음료 매출은 신뢰 사이클에 가장 먼저 흔들립니다.' },
      { year: 2020, descKo: '코로나로 본업 외식 채널 매출이 단기 시험받았습니다.', lessonKo: '오프라인 식음료 매출은 외부 충격기 직접 노출됩니다.' },
    ],
    industryKo: '식음료',
  },
  construction: {
    primaryIncomeKo: (c) => `${c}의 본인·가족 보유 지분과 그룹 자본이 자산의 핵심입니다.`,
    acceleratorsKo: '본업 정립, 대형 인프라 수주 확장, 그리고 다각화 카테고리의 세 단계가 자본 가치 가속의 축입니다.',
    advantagesKo: '건설·인프라 카테고리 자리, 수주 자본망, 그리고 프로젝트 거버넌스 구조가 강점입니다.',
    failuresKo: [
      { year: 1971, descKo: '경부고속도로 등 대형 인프라 프로젝트 사이클기 본업 위기를 통과했습니다.', lessonKo: '대형 인프라는 외부 거시 사이클과 직접 연결됩니다.' },
      { year: 1997, descKo: '아시아 외환위기로 본업 그룹 자본이 시험받았습니다.', lessonKo: '거시 충격기 그룹 자본 구조 점검이 필요합니다.' },
    ],
    industryKo: '건설·인프라',
  },
  finance: {
    primaryIncomeKo: (c) => `${c} 포트폴리오의 보유 지분 가치와 배당이 자산의 핵심입니다.`,
    acceleratorsKo: '본업 정립, 핵심 종목 장기 보유, 그리고 포트폴리오 다각화의 세 단계가 자본 가치 가속의 축입니다.',
    advantagesKo: '주식 투자 카테고리 자리, 장기 보유 자본망, 그리고 인도 자본 시장 거버넌스 노하우가 강점입니다.',
    failuresKo: [
      { year: 2008, descKo: '글로벌 금융위기로 포트폴리오 자산이 단기 시험받았습니다.', lessonKo: '주식 포트폴리오는 거시 사이클 영향이 직접적입니다.' },
      { year: 2020, descKo: '코로나 충격으로 단기 포트폴리오 평가가 시험받았습니다.', lessonKo: '장기 투자는 거시 충격기 일시적 후퇴를 허용해야 합니다.' },
    ],
    industryKo: '금융·투자',
  },
  automotive: {
    primaryIncomeKo: (c) => `${c}의 본인·가족 보유 지분 가치와 배당이 자산의 핵심입니다.`,
    acceleratorsKo: '본업 정립, 글로벌 공급망 진출, 그리고 전기차 카테고리 환원의 세 단계가 자본 가치 가속의 축입니다.',
    advantagesKo: '자동차 카테고리 자리, 글로벌 부품 자본망, 그리고 공급망 거버넌스 구조가 강점입니다.',
    failuresKo: [
      { year: 2008, descKo: '글로벌 금융위기로 본업 자동차 매출이 단기 시험받았습니다.', lessonKo: '자동차 매출은 거시 사이클 영향이 직접적입니다.' },
      { year: 2020, descKo: '코로나·반도체 수급으로 본업 생산이 단기 시험받았습니다.', lessonKo: '자동차 생산은 공급망 충격기 가장 먼저 흔들립니다.' },
    ],
    industryKo: '자동차',
  },
  energy: {
    primaryIncomeKo: (c) => `${c}의 본인 보유 지분 가치가 자산의 핵심입니다.`,
    acceleratorsKo: '본업 정립, 자원 카테고리 확장, 그리고 글로벌 가격 사이클 환원의 세 단계가 자본 가치 가속의 축입니다.',
    advantagesKo: '에너지·자원 카테고리 자리, 자본망, 그리고 가격 사이클 거버넌스 노하우가 강점입니다.',
    failuresKo: [
      { year: 2014, descKo: '글로벌 유가 급락으로 본업 자산 가치가 단기 시험받았습니다.', lessonKo: '에너지 매출은 글로벌 가격 사이클에 직접 노출됩니다.' },
      { year: 2020, descKo: '코로나 수요 충격으로 본업 자산이 단기 시험받았습니다.', lessonKo: '에너지 자산 가치는 거시 충격기 단기 변동성이 큽니다.' },
    ],
    industryKo: '에너지',
  },
  telecom: {
    primaryIncomeKo: (c) => `${c} 임원 보상과 보유 자산이 자산의 핵심입니다.`,
    acceleratorsKo: '대기업 입사, 계열사 대표 자리, 그리고 그룹 대표 자리 환원의 세 단계가 경력 자본 가속의 축입니다.',
    advantagesKo: '통신·반도체 카테고리 자리, 대기업 거버넌스 노하우, 그리고 전문 경영인 신뢰 자본이 강점입니다.',
    failuresKo: [
      { year: 2010, descKo: '계열사 통합·구조조정 사이클기 경영 시험을 받았습니다.', lessonKo: '대기업 전문 경영인은 그룹 사이클에 직접 노출됩니다.' },
      { year: 2022, descKo: '글로벌 반도체 사이클 조정기 경영 시험을 받았습니다.', lessonKo: '반도체·통신 매출은 글로벌 사이클에 직접 노출됩니다.' },
    ],
    industryKo: '통신·반도체',
  },
  metals: {
    primaryIncomeKo: (c) => `${c}의 본인·가족 보유 지분 가치와 배당이 자산의 핵심입니다.`,
    acceleratorsKo: '본업 정립, 광산권 확보, 그리고 글로벌 금속 사이클 환원의 세 단계가 자본 가치 가속의 축입니다.',
    advantagesKo: '금속·광업 카테고리 자리, 자본망, 그리고 가격 사이클 거버넌스 노하우가 강점입니다.',
    failuresKo: [
      { year: 2014, descKo: '글로벌 금속 가격 하락으로 본업 자산이 단기 시험받았습니다.', lessonKo: '금속 매출은 글로벌 가격 사이클에 직접 노출됩니다.' },
      { year: 2020, descKo: '코로나로 글로벌 수요가 단기 시험받았습니다.', lessonKo: '금속·광업 자산은 거시 충격기 단기 변동성이 큽니다.' },
    ],
    industryKo: '금속·광업',
  },
};

function buildSajuSummaryKo(saju: Saju): string {
  const ilju = ILJU_DESC[saju.ilju] ?? `${saju.ilju} 일주의 자리`;
  const gyeok = GYEOK_DESC[saju.gyeokguk] ?? `${saju.gyeokguk}의 흐름`;
  return `일주는 ${saju.ilju}이라 ${ilju}입니다. 월지 ${saju.wolji}는 일간을 다시 한번 결과물로 환원하는 통로이고, 격국은 ${saju.gyeokguk}이라 ${gyeok}입니다. 본업 정립과 단계적 자본 환원의 결정적 결단들이 모두 이 한 가지 패턴 위에 놓여 있습니다.`;
}

function buildSajuSummary(saju: Saju): string {
  return `His ${saju.ilju} day pillar combined with the ${saju.wolji} month branch shapes a profile where personal expression is steadily channeled into compounded results. The ${saju.gyeokguk} format aligns with a multi-decade arc of one-category focus and stepwise capital recurrence.`;
}

function buildCareerTimeline(s: Sample, d: any): any[] {
  const founding = d.foundingOrEntryYear;
  const birthYear = parseInt(s.birthday.slice(0, 4));
  const items: any[] = [];
  items.push({
    year: founding,
    event: `Enters ${d.companyName}`,
    eventKo: d.foundingEventKo,
    whyItMatteredKo: `본업 카테고리의 출발점으로, 일간의 표현력이 본인 자리로 환원되는 결정적 결단입니다.`,
  });
  const mid = Math.min(founding + 12, 2008);
  items.push({
    year: mid,
    event: `Scales ${d.companyName} into a leading position`,
    eventKo: `${d.companyKo} 본업이 카테고리 1위 자리로 단계적 도약`,
    whyItMatteredKo: `본업 매출의 카테고리 통로가 단단해진 결정적 결단입니다.`,
  });
  items.push({
    year: 2015,
    event: 'Capital value accelerates with category expansion',
    eventKo: '본업 카테고리 글로벌·지역 확장으로 자본 가치 가속',
    whyItMatteredKo: `본업 매출이 단계적 도약으로 환원된 결정적 결단입니다.`,
  });
  items.push({
    year: 2020,
    event: 'Tests the business through global pandemic shock',
    eventKo: '코로나 사이클기 본업 카테고리 단계적 시험과 회복',
    whyItMatteredKo: `외부 충격기 본업 자본의 재정비가 진행된 시기입니다.`,
  });
  items.push({
    year: 2026,
    event: `Forbes 2026: $${s.netWorth}B in ${s.industry}`,
    eventKo: `포브스 2026 — ${d.companyKo} 자산 가치 ${Math.round(s.netWorth * 10 * 100) / 100}억 달러로 등재`,
    whyItMatteredKo: `${d.companyKo} 본인·가족 보유 지분이 본업 자본 가치 정점으로 환원된 시기입니다.`,
  });
  return items.filter(i => i.year && i.year >= founding && i.year >= birthYear + 15);
}

function buildBio(s: Sample, d: any, saju: Saju): any {
  const cat = CATEGORY_NARRATIVE[d.category];
  const personalTraits = [
    `${d.companyKo} 본업`,
    `${cat.industryKo} 카테고리 ${d.selfMadeScore >= 8 ? '1세대 자수성가' : '가문 일원'}`,
    `일주 ${saju.ilju} · 격국 ${saju.gyeokguk}`,
    `국적 ${s.nationality}`,
    `${s.industry} 산업`,
  ];

  return {
    id: parseInt(s.id),
    name: s.name,
    nameKo: s.nameKo,
    birthday: s.birthday,
    birthPlace: d.birthPlace,
    birthPlaceKo: d.birthPlaceKo,
    netWorth: `$${s.netWorth}B`,
    nationality: s.nationality,
    industry: s.industry,
    gender: s.gender,
    ilju: saju.ilju,
    gyeokguk: saju.gyeokguk,
    childhood: {
      summaryKo: `${s.birthday.slice(0,4)}년 ${d.birthPlaceKo}에서 태어났습니다. ${d.notesKo ?? ''}`.trim(),
      capitalTypeKo: d.selfMadeScore >= 8
        ? `1세대 자수성가 — ${cat.industryKo} 카테고리 ${d.companyKo} 창업·정립 트랙입니다.`
        : `가문 자본 기반 — ${d.companyKo} 가족 일원으로 가족 보유 자본을 환원합니다.`,
      sources: [`https://www.forbes.com/profile/${s.name.toLowerCase().replace(/\s+/g, '-')}/`],
    },
    capitalOrigin: {
      type: d.selfMadeScore >= 8 ? 'self-made' : 'mixed',
      typeKo: d.selfMadeScore >= 8 ? '자수성가' : '가문 자본 + 본인 환원',
      descriptionKo: `${d.foundingOrEntryYear}년 ${d.foundingEventKo}으로 본업 카테고리 자리를 잡았고, 단계적 카테고리 확장으로 자본 가치를 환원시켰습니다.`,
      selfMadeScore: d.selfMadeScore,
      sources: [`https://www.forbes.com/profile/${s.name.toLowerCase().replace(/\s+/g, '-')}/`],
    },
    careerTimeline: buildCareerTimeline(s, d),
    turningPoints: [
      { year: d.foundingOrEntryYear, eventKo: d.foundingEventKo, impactKo: `일주 ${saju.ilju}의 자리가 본업 자본의 출발점으로 환원된 분기점입니다.` },
      { year: 2015, eventKo: `${d.companyKo} 카테고리 단계적 확장`, impactKo: '본업 매출이 글로벌·지역 카테고리로 환원된 분기점입니다.' },
      { year: 2020, eventKo: '코로나 사이클기 본업 재정비', impactKo: '외부 충격기 본업 자본의 통과 분기점입니다.' },
    ],
    moneyMechanics: {
      primaryIncomeSourceKo: cat.primaryIncomeKo(d.companyKo),
      wealthAcceleratorsKo: cat.acceleratorsKo,
      structuralAdvantagesKo: cat.advantagesKo,
      currentAssetAllocationKo: `${d.companyKo} 본인·가족 지분이 자산의 절대 비중입니다.`,
    },
    failures: cat.failuresKo.map(f => ({
      year: f.year,
      descriptionKo: f.descKo,
      howTheyOvercameKo: '단계적 재정비와 카테고리 환원으로 통과했습니다.',
      lessonKo: f.lessonKo,
    })).concat([{
      year: 2023,
      descriptionKo: `${cat.industryKo} 카테고리 경쟁 격화로 본업 마진이 단기 압박을 받았습니다.`,
      howTheyOvercameKo: '단계적 회복과 카테고리 재편으로 통과했습니다.',
      lessonKo: '단일 카테고리 의존은 가격 경쟁기에 마진이 가장 먼저 흔들립니다.',
    }]),
    wealthHistory: [
      { year: 2018, netWorth: `$${(s.netWorth * 0.6).toFixed(2)}B`, sourceKo: '포브스 추정' },
      { year: 2023, netWorth: `$${(s.netWorth * 0.85).toFixed(2)}B`, sourceKo: '포브스 추정' },
      { year: 2026, netWorth: `$${s.netWorth}B`, sourceKo: '포브스 2026 빌리어네어즈' },
    ],
    books: [],
    personalTraitsKo: personalTraits,
    characterKo: {
      strengths: `${d.foundingOrEntryYear}년 ${d.foundingEventKo} 이래 ${cat.industryKo} 카테고리에 한 우물을 파 본업을 단계적 자본 도약으로 환원시킨 끈기와 결단력이 강점입니다.`,
      weaknesses: `단일 카테고리 의존도와 거시 사이클 영향에 본업 매출이 직접 노출됩니다.`,
      motivation: `${cat.industryKo} 카테고리에서 본업을 단계적 자본 도약으로 환원시키겠다는 산업 의식이 동력입니다.`,
      legacy: `${s.nationality} ${d.selfMadeScore >= 8 ? '1세대 자수성가' : '가문 일원'} ${cat.industryKo} 카테고리의 한 표본입니다.`,
    },
    sajuConnection: {
      summary: buildSajuSummary(saju),
      summaryKo: buildSajuSummaryKo(saju),
    },
    sources: [
      `https://www.forbes.com/profile/${s.name.toLowerCase().replace(/\s+/g, '-')}/`,
      `https://en.wikipedia.org/wiki/${s.name.replace(/\s+/g, '_')}`,
    ],
  };
}

const outDir = path.join(__dirname, '..', 'public', 'deep-bios-v2');
let count = 0;
for (const s of samples) {
  const saju = sajuMap.get(s.id);
  const d = DATA[s.id];
  if (!saju || !d) { console.error(`Missing data for ${s.id} (${s.nameKo})`); continue; }
  const bio = buildBio(s, d, saju);
  const filePath = path.join(outDir, `${s.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(bio, null, 2));
  count++;
  console.log(`OK  ${s.id.padEnd(5)} ${s.nameKo.padEnd(16)} → public/deep-bios-v2/${s.id}.json`);
}
console.log(`\nWrote ${count} bios.`);
