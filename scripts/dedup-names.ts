import * as fs from 'fs';
import { billionaires } from '../src/lib/data/billionaires';

// Remove entries with duplicate names (keep the first occurrence)
const seen = new Set<string>();
const unique = billionaires.filter((p) => {
  if (seen.has(p.name)) return false;
  seen.add(p.name);
  return true;
});

console.log(`Before: ${billionaires.length}, After: ${unique.length}, Removed: ${billionaires.length - unique.length}`);

const lines = unique.map((p) =>
  `  { id: '${p.id}', name: '${p.name.replace(/'/g, "\\'")}', birthday: '${p.birthday}', netWorth: ${p.netWorth}, nationality: '${p.nationality}', industry: '${p.industry}', gender: '${p.gender}', photoUrl: '${p.photoUrl.replace(/'/g, "\\'")}' },`
);

const output = `import { Person } from '../saju/types';

export const billionaires: Person[] = [
${lines.join('\n')}
];
`;

fs.writeFileSync('/Users/namu_1/sajubuja/src/lib/data/billionaires.ts', output);
console.log('Done! Deduplicated.');
