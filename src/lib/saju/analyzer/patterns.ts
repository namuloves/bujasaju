/**
 * 십성 조합 패턴 매처 — 적천수 + 자평진전 표준.
 *
 * 사주 8글자 안에 두 십성 카테고리가 같이 존재하면 패턴 트리거 (거리 무관 채택).
 * 길격(吉格)은 강조, 흉격(凶格)은 완화책 표시.
 */

import type { Saju, SipSin } from '../types';
import { getSipSin } from '../tenGods';
import { getBongi } from '../constants';

export type PatternId =
  | '관인상생' | '살인상생' | '식상생재' | '재생관'
  | '재자약살' | '식신제살' | '상관패인' | '양인합살'
  | '상관견관' | '비겁쟁재' | '탐재괴인' | '관살혼잡' | '식신봉효';

export interface PatternMatch {
  id: PatternId;
  hanja: string;
  good: '길' | '흉';
  description: string;
}

const PATTERN_DEFS: Record<PatternId, { hanja: string; good: '길' | '흉'; desc: string }> = {
  관인상생: { hanja: '官印相生', good: '길', desc: '정관과 정인이 함께 — 압박이 자양분이 되는 구조. 조직 내 승진과 명예.' },
  살인상생: { hanja: '殺印相生', good: '길', desc: '편관과 정인이 함께 — 시련을 통해 큰 인물로. 정인이 칠살을 화로 변환.' },
  식상생재: { hanja: '食傷生財', good: '길', desc: '식상이 재성을 생함 — 재능이 곧 수익. 전문직·콘텐츠·자영업.' },
  재생관: { hanja: '財生官', good: '길', desc: '재성이 관성을 생함 — 부와 권력 동시 획득. 사업+직위.' },
  재자약살: { hanja: '財滋弱殺', good: '길', desc: '약한 편관을 재성이 도와 — 감당 가능한 도전.' },
  식신제살: { hanja: '食神制殺', good: '길', desc: '식신이 편관을 제압 — 큰 시련을 재능으로 극복.' },
  상관패인: { hanja: '傷官佩印', good: '길', desc: '상관이 정인을 차고 — 날카로운 재능에 학문이 더해짐.' },
  양인합살: { hanja: '羊刃合殺', good: '길', desc: '양인이 편관과 합 — 큰 권력. 군·경·정치 대성.' },
  상관견관: { hanja: '傷官見官', good: '흉', desc: '상관이 정관을 침 — 자유 vs 규범 충돌. 조직 부적응. 인성 통관 시 완화.' },
  비겁쟁재: { hanja: '比劫爭財', good: '흉', desc: '비겁 다수 + 재성 약함 — 형제·동료가 재물 다툼. 동업 불리.' },
  탐재괴인: { hanja: '貪財壞印', good: '흉', desc: '재성이 인성을 극 — 돈에 눈멀어 명예·학문 잃음.' },
  관살혼잡: { hanja: '官煞混雜', good: '흉', desc: '정관과 편관 섞임 — 압박이 일관되지 않음. 갈팡질팡.' },
  식신봉효: { hanja: '食神逢梟', good: '흉', desc: '식신이 편인에게 극당함 — 재능 위축. 표현 막힘.' },
};

/**
 * 사주의 모든 십성 (천간 4 + 지지 본기 4 = 최대 8개, 일간 제외) 추출.
 */
function extractAllSipsin(saju: Saju): SipSin[] {
  const dayStem = saju.day.stem;
  const list: SipSin[] = [];

  const stems = [saju.year.stem, saju.month.stem, saju.hour?.stem];
  for (const s of stems) if (s) list.push(getSipSin(dayStem, s));

  const branches = [saju.year.branch, saju.month.branch, saju.day.branch, saju.hour?.branch];
  for (const b of branches) if (b) list.push(getSipSin(dayStem, getBongi(b)));

  return list;
}

function has(list: SipSin[], ...wanted: SipSin[]): boolean {
  return wanted.every(w => list.includes(w));
}

function count(list: SipSin[], ...wanted: SipSin[]): number {
  return list.filter(s => wanted.includes(s)).length;
}

/**
 * 사주에서 트리거된 패턴 모두 반환.
 */
export function matchPatterns(saju: Saju): PatternMatch[] {
  const list = extractAllSipsin(saju);
  const out: PatternMatch[] = [];

  const add = (id: PatternId) => {
    const d = PATTERN_DEFS[id];
    out.push({ id, hanja: d.hanja, good: d.good, description: d.desc });
  };

  // 길격
  if (has(list, '정관', '정인')) add('관인상생');
  if (has(list, '편관', '정인')) add('살인상생');
  if ((has(list, '식신') || has(list, '상관')) && (has(list, '정재') || has(list, '편재'))) {
    add('식상생재');
  }
  if ((has(list, '정재') || has(list, '편재')) && has(list, '정관')) add('재생관');
  if (has(list, '편관') && (has(list, '정재') || has(list, '편재')) && count(list, '편관') === 1) {
    add('재자약살');
  }
  if (has(list, '식신', '편관')) add('식신제살');
  if (has(list, '상관', '정인')) add('상관패인');
  if (has(list, '겁재', '편관')) add('양인합살');

  // 흉격
  if (has(list, '상관', '정관') && !has(list, '정인') && !has(list, '편인')) {
    add('상관견관');
  }
  const bigeop = count(list, '비견', '겁재');
  const jaesung = count(list, '정재', '편재');
  if (bigeop >= 3 && jaesung <= 1) add('비겁쟁재');
  if (jaesung >= 2 && (has(list, '편인') || has(list, '정인')) && count(list, '편인', '정인') === 1) {
    add('탐재괴인');
  }
  if (has(list, '정관', '편관')) add('관살혼잡');
  if (has(list, '식신', '편인')) add('식신봉효');

  return out;
}
