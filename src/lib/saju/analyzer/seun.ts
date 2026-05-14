/**
 * 세운(연운) + 월운 — 60갑자 순환.
 *
 * 세운: 매년 천간/지지가 60갑자 순서로 진행.
 *   기준: 1984년 = 갑자년 (60갑자 시작점, 통상)
 *
 * 월운: 매월 천간은 년간에 따라 결정 (월건 공식),
 *       지지는 12절 순서 (입춘=인월, 경칩=묘월, ...).
 */

import type { CheonGan, JiJi } from '../types';
import { CHEON_GAN, JI_JI, WOLGEON_TABLE } from '../constants';

export interface YearPillar {
  year: number;
  stem: CheonGan;
  branch: JiJi;
  ganji: string;
}

export interface MonthPillar {
  month: number; // 1-12 (양력 기준 절기 순서: 1=인월, 2=묘월, ..., 12=축월)
  branch: JiJi;
  stem: CheonGan;
  ganji: string;
}

/**
 * 한 해의 60갑자.
 *
 * 1984년 = 갑자(0). 1984에서 양수면 +N, 음수면 -N으로 순환.
 */
export function getYearPillar(year: number): YearPillar {
  const offset = ((year - 1984) % 60 + 60) % 60;
  const stem = CHEON_GAN[offset % 10];
  const branch = JI_JI[offset % 12];
  return { year, stem, branch, ganji: `${stem}${branch}` };
}

/**
 * 시작 연도부터 N년 만큼의 세운 리스트.
 */
export function getYearRange(startYear: number, count: number): YearPillar[] {
  const out: YearPillar[] = [];
  for (let i = 0; i < count; i++) {
    out.push(getYearPillar(startYear + i));
  }
  return out;
}

/**
 * 한 해의 12달 월운.
 *
 * 절기 기준 월 순서:
 *   1=인월(입춘~), 2=묘월, 3=진월, 4=사월, 5=오월, 6=미월,
 *   7=신월, 8=유월, 9=술월, 10=해월, 11=자월, 12=축월
 *
 * 월간 공식 (월건):
 *   년간 갑/기 → 1월(인) 시작 천간 = 병 (인덱스 2)
 *   년간 을/경 → 1월 시작 천간 = 무 (4)
 *   년간 병/신 → 경 (6)
 *   년간 정/임 → 임 (8)
 *   년간 무/계 → 갑 (0)
 *   각 월 +1씩 천간 진행.
 */
export function getMonthPillarsOfYear(year: number): MonthPillar[] {
  const yearPillar = getYearPillar(year);
  const yearStemIdx = CHEON_GAN.indexOf(yearPillar.stem);
  const startStemIdx = WOLGEON_TABLE[yearStemIdx];

  // 월 순서: 인(2)부터 시작해서 12달
  const monthBranchOrder: JiJi[] = ['인', '묘', '진', '사', '오', '미', '신', '유', '술', '해', '자', '축'];

  const out: MonthPillar[] = [];
  for (let i = 0; i < 12; i++) {
    const stem = CHEON_GAN[(startStemIdx + i) % 10];
    const branch = monthBranchOrder[i];
    out.push({ month: i + 1, branch, stem, ganji: `${stem}${branch}` });
  }
  return out;
}

/**
 * 현재 또는 특정 연도의 세운 한 줄.
 */
export function getCurrentYearPillar(): YearPillar {
  return getYearPillar(new Date().getFullYear());
}
