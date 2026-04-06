export type CheonGan = '갑' | '을' | '병' | '정' | '무' | '기' | '경' | '신' | '임' | '계';
export type JiJi = '자' | '축' | '인' | '묘' | '진' | '사' | '오' | '미' | '신' | '유' | '술' | '해';
export type OHaeng = '목' | '화' | '토' | '금' | '수';
export type EumYang = '양' | '음';

export type SipSin =
  | '비견' | '겁재'
  | '식신' | '상관'
  | '편인' | '정인'
  | '편재' | '정재'
  | '편관' | '정관';

export type GyeokGuk =
  | '정관격' | '편관격'
  | '정재격' | '편재격'
  | '식신격' | '상관격'
  | '정인격' | '편인격'
  | '건록격' | '양인격';

export interface Ju {
  stem: CheonGan;
  branch: JiJi;
}

export interface Saju {
  year: Ju;
  month: Ju;
  day: Ju;
  hour: Ju | null;
}

export interface SajuResult {
  saju: Saju;
  gyeokguk: GyeokGuk;
  ilju: string;
  wolji: JiJi;
}

export type Gender = 'M' | 'F';

export interface Person {
  id: string;
  name: string;
  nameKo?: string;
  birthday: string; // YYYY-MM-DD
  netWorth: number; // in billions USD
  nationality: string;
  industry: string;
  photoUrl: string;
  gender: Gender;
  source?: string; // Company or source of wealth
  bio?: string; // One-sentence neutral summary of who they are and how they made their fortune
  wealthOrigin?: 'self-made' | 'inherited' | 'mixed'; // mixed = inherited a business and substantially grew it
}

export interface EnrichedPerson extends Person {
  saju: SajuResult;
}
