import { CheonGan, OHaeng, SipSin } from './types';
import { STEM_TO_OHAENG, STEM_EUMYANG, OHAENG_SANGSAENG, OHAENG_SANGGEUK } from './constants';

// Determine the 십신 (Ten Gods) relationship between "me" (일간) and "other" stem
export function getSipSin(me: CheonGan, other: CheonGan): SipSin {
  const myOhaeng = STEM_TO_OHAENG[me];
  const otherOhaeng = STEM_TO_OHAENG[other];
  const samePolarity = STEM_EUMYANG[me] === STEM_EUMYANG[other];

  // Same element
  if (myOhaeng === otherOhaeng) {
    return samePolarity ? '비견' : '겁재';
  }

  // I produce (아생): my element produces other's element
  if (OHAENG_SANGSAENG[myOhaeng] === otherOhaeng) {
    return samePolarity ? '식신' : '상관';
  }

  // Produces me (생아): other's element produces my element
  if (OHAENG_SANGSAENG[otherOhaeng] === myOhaeng) {
    return samePolarity ? '편인' : '정인';
  }

  // I control (아극): my element controls other's element
  if (OHAENG_SANGGEUK[myOhaeng] === otherOhaeng) {
    return samePolarity ? '편재' : '정재';
  }

  // Controls me (극아): other's element controls my element
  if (OHAENG_SANGGEUK[otherOhaeng] === myOhaeng) {
    return samePolarity ? '편관' : '정관';
  }

  // Should never reach here with valid inputs
  return '비견';
}
