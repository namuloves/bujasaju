import type { EnrichedPerson } from '@/lib/saju/types';

/**
 * Korean and English alias map for common conglomerate / brand names so a
 * search like "삼성" also matches people whose source / bio are in English
 * ("Samsung"), and vice versa. Keys are the normalized lowercase form of
 * the query; values are extra strings to check against.
 */
const SEARCH_ALIASES: Record<string, string[]> = {
  '삼성': ['samsung', '삼성그룹', '삼성전자'],
  'samsung': ['삼성', '삼성그룹', '삼성전자'],
  '현대': ['hyundai', '현대차', '현대그룹'],
  'hyundai': ['현대', '현대차', '현대그룹'],
  '엘지': ['lg', 'lg그룹', 'lg전자'],
  'lg': ['엘지', 'lg그룹', '엘지전자'],
  'sk': ['에스케이', 'sk그룹', 'sk하이닉스'],
  '에스케이': ['sk', 'sk그룹', 'sk하이닉스'],
  '롯데': ['lotte'],
  'lotte': ['롯데'],
  '한화': ['hanwha'],
  'hanwha': ['한화'],
  '카카오': ['kakao'],
  'kakao': ['카카오'],
  '네이버': ['naver'],
  'naver': ['네이버'],
  '쿠팡': ['coupang'],
  'coupang': ['쿠팡'],
  '신세계': ['shinsegae'],
  'shinsegae': ['신세계'],
  '두산': ['doosan'],
  'doosan': ['두산'],
  '포스코': ['posco'],
  'posco': ['포스코'],
  'cj': ['씨제이', 'cj그룹'],
  '씨제이': ['cj', 'cj그룹'],
  '효성': ['hyosung'],
  'hyosung': ['효성'],
  '아모레': ['amorepacific', '아모레퍼시픽'],
  'amorepacific': ['아모레', '아모레퍼시픽'],
  'gs': ['지에스', 'gs그룹'],
  '지에스': ['gs', 'gs그룹'],
};

/**
 * True if person matches rawQuery (case-insensitive, with KR/EN alias
 * expansion). Searches name, nameKo, source, industry, company, companyKo,
 * bio, and bioKo so brand and company hits surface the owners.
 */
export function matchesSearch(person: EnrichedPerson, rawQuery: string): boolean {
  if (!rawQuery) return true;
  const q = rawQuery.toLowerCase();
  const queries = new Set<string>([q]);
  const aliases = SEARCH_ALIASES[q];
  if (aliases) aliases.forEach((a) => queries.add(a.toLowerCase()));

  const hay = [
    person.name,
    person.nameKo,
    person.source,
    person.industry,
    person.company,
    person.companyKo,
    person.bio,
    person.bioKo,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase())
    .join('   ');

  for (const term of queries) {
    if (hay.includes(term)) return true;
  }
  return false;
}
