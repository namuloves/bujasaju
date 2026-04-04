import { CheonGan, JiJi, OHaeng, EumYang } from './types';

// 천간 (10 Heavenly Stems)
export const CHEON_GAN: CheonGan[] = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];

// 지지 (12 Earthly Branches)
export const JI_JI: JiJi[] = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

// 60 갑자 (Sexagenary Cycle)
export const GABIA_60: Array<{ stem: CheonGan; branch: JiJi }> = [];
for (let i = 0; i < 60; i++) {
  GABIA_60.push({
    stem: CHEON_GAN[i % 10],
    branch: JI_JI[i % 12],
  });
}

// 천간 → 오행
export const STEM_TO_OHAENG: Record<CheonGan, OHaeng> = {
  '갑': '목', '을': '목',
  '병': '화', '정': '화',
  '무': '토', '기': '토',
  '경': '금', '신': '금',
  '임': '수', '계': '수',
};

// 지지 → 오행
export const BRANCH_TO_OHAENG: Record<JiJi, OHaeng> = {
  '자': '수', '축': '토', '인': '목', '묘': '목',
  '진': '토', '사': '화', '오': '화', '미': '토',
  '신': '금', '유': '금', '술': '토', '해': '수',
};

// 천간 음양
export const STEM_EUMYANG: Record<CheonGan, EumYang> = {
  '갑': '양', '을': '음', '병': '양', '정': '음', '무': '양',
  '기': '음', '경': '양', '신': '음', '임': '양', '계': '음',
};

// 지지 음양
export const BRANCH_EUMYANG: Record<JiJi, EumYang> = {
  '자': '양', '축': '음', '인': '양', '묘': '음', '진': '양', '사': '음',
  '오': '양', '미': '음', '신': '양', '유': '음', '술': '양', '해': '음',
};

// 오행 상생 (Production): 목→화→토→금→수→목
export const OHAENG_SANGSAENG: Record<OHaeng, OHaeng> = {
  '목': '화', '화': '토', '토': '금', '금': '수', '수': '목',
};

// 오행 상극 (Control): 목→토→수→화→금→목
export const OHAENG_SANGGEUK: Record<OHaeng, OHaeng> = {
  '목': '토', '토': '수', '수': '화', '화': '금', '금': '목',
};

// 지장간 (Hidden Stems in each Branch)
// 본기 (main qi) is the LAST element in each array
export const JIJANGGAN: Record<JiJi, CheonGan[]> = {
  '자': ['임', '계'],
  '축': ['계', '신', '기'],
  '인': ['무', '병', '갑'],
  '묘': ['갑', '을'],
  '진': ['을', '계', '무'],
  '사': ['무', '경', '병'],
  '오': ['병', '기', '정'],
  '미': ['정', '을', '기'],
  '신': ['무', '임', '경'],
  '유': ['경', '신'],
  '술': ['신', '정', '무'],
  '해': ['무', '갑', '임'],
};

// 본기 (Main Qi) - the primary hidden stem
export function getBongi(branch: JiJi): CheonGan {
  const hidden = JIJANGGAN[branch];
  return hidden[hidden.length - 1];
}

// 월건표: Year stem → starting month stem
// 갑/기 → 병, 을/경 → 무, 병/신 → 경, 정/임 → 임, 무/계 → 갑
export const WOLGEON_TABLE: Record<number, number> = {
  0: 2, // 갑 → 병
  5: 2, // 기 → 병
  1: 4, // 을 → 무
  6: 4, // 경 → 무
  2: 6, // 병 → 경
  7: 6, // 신 → 경
  3: 8, // 정 → 임
  8: 8, // 임 → 임
  4: 0, // 무 → 갑
  9: 0, // 계 → 갑
};

// 오행 색상 (for UI)
export const OHAENG_COLORS: Record<OHaeng, { bg: string; text: string; border: string }> = {
  '목': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  '화': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  '토': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  '금': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
  '수': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
};

// 격국 한자 display names
export const GYEOKGUK_NAMES: Record<string, string> = {
  '정관격': '正官格',
  '편관격': '偏官格',
  '정재격': '正財格',
  '편재격': '偏財格',
  '식신격': '食神格',
  '상관격': '傷官格',
  '정인격': '正印格',
  '편인격': '偏印格',
  '건록격': '建祿格',
  '양인격': '羊刃格',
};
