import { CheonGan, JiJi, GyeokGuk, SipSin } from './types';
import { getBongi } from './constants';
import { getSipSin } from './tenGods';

const SIPSIN_TO_GYEOKGUK: Record<SipSin, GyeokGuk> = {
  '정관': '정관격',
  '편관': '편관격',
  '정재': '정재격',
  '편재': '편재격',
  '식신': '식신격',
  '상관': '상관격',
  '정인': '정인격',
  '편인': '편인격',
  '비견': '건록격',
  '겁재': '양인격',
};

// Determine 격국 from 일간 (day stem) and 월지 (month branch)
export function determineGyeokguk(dayStem: CheonGan, monthBranch: JiJi): GyeokGuk {
  const bongi = getBongi(monthBranch);
  const sipsin = getSipSin(dayStem, bongi);
  return SIPSIN_TO_GYEOKGUK[sipsin];
}
