// Quick verification of saju calculations against known references
import { calculateSaju, parseBirthday } from '../src/lib/saju/index';

const testCases = [
  // Format: [name, birthday, expected_ilju_or_notes]
  { name: 'Elon Musk', birthday: '1971-06-28' },
  { name: 'Warren Buffett', birthday: '1930-08-30' },
  { name: 'Bill Gates', birthday: '1955-10-28' },
  { name: 'Jeff Bezos', birthday: '1964-01-12' },
  { name: 'Mark Zuckerberg', birthday: '1984-05-14' },
];

for (const tc of testCases) {
  const date = parseBirthday(tc.birthday);
  const result = calculateSaju(date);
  console.log(`\n=== ${tc.name} (${tc.birthday}) ===`);
  console.log(`년주: ${result.saju.year.stem}${result.saju.year.branch}`);
  console.log(`월주: ${result.saju.month.stem}${result.saju.month.branch}`);
  console.log(`일주: ${result.ilju}`);
  console.log(`격국: ${result.gyeokguk}`);
  console.log(`월지: ${result.wolji}`);
}
