// Add gender field and apply photo map to billionaires data
import * as fs from 'fs';

const photoMap: Record<string, string> = JSON.parse(
  fs.readFileSync('/Users/namu_1/sajubuja/src/lib/data/photo-map.json', 'utf8')
);

// Known female billionaires/celebrities from our dataset
const FEMALE_NAMES = new Set([
  'Francoise Bettencourt Meyers', 'Alice Walton', 'Julia Koch', 'Susanne Klatten',
  'MacKenzie Scott', 'Abigail Johnson', 'Jacqueline Mars', 'Miriam Adelson',
  'Oprah Winfrey', 'Charlene de Carvalho-Heineken', 'Gina Rinehart', 'Iris Fontbona',
  'Meg Whitman', 'Marissa Mayer', 'Rihanna', 'Kim Kardashian', 'Kylie Jenner',
  'Taylor Swift', 'Beyonce', 'Madonna', 'Sara Blakely', 'Whitney Wolfe Herd',
  'Judy Faulkner', 'Thai Lee', 'Diane Hendricks', 'Lynda Resnick',
  'Aerin Lauder', 'Lee Boo-jin', 'Yang Huiyan', 'Fan Hongwei',
  'Shari Arison', 'Savitri Jindal', 'Kiran Mazumdar-Shaw', 'Falguni Nayar',
  'Nita Ambani', 'Eva Gonda de Rivera', 'Luiza Trajano', 'Miuccia Prada',
  'Cher Wang', 'Denise Coates', 'Blair Parry-Okeden', 'Vicky Safra',
  'Hong Ra-hee', 'Lee Myung-hee', 'Lee Seo-hyun', 'Kwong Siu-hing',
  'Rafaela Aponte-Diamant', 'Park Geun-hee',
]);

// Read the current file
const filePath = '/Users/namu_1/sajubuja/src/lib/data/billionaires.ts';
let content = fs.readFileSync(filePath, 'utf8');

// For each person entry, add gender and update photoUrl if we have a wiki photo
// Strategy: modify the data file to add gender: 'M' or 'F' and photoUrl from map

const { billionaires } = require('../src/lib/data/billionaires');

// Build the new data
const lines: string[] = [];
for (const p of billionaires) {
  const gender = FEMALE_NAMES.has(p.name) ? 'F' : 'M';
  const photo = photoMap[p.id] || p.photoUrl;
  lines.push(`  { id: '${p.id}', name: '${p.name.replace(/'/g, "\\'")}', birthday: '${p.birthday}', netWorth: ${p.netWorth}, nationality: '${p.nationality}', industry: '${p.industry}', gender: '${gender}', photoUrl: '${photo.replace(/'/g, "\\'")}' },`);
}

const output = `import { Person } from '../saju/types';

export const billionaires: Person[] = [
${lines.join('\n')}
];
`;

fs.writeFileSync(filePath, output);
console.log(`Updated ${billionaires.length} entries with gender and photos.`);
console.log(`Photos applied: ${Object.keys(photoMap).length}`);
console.log(`Female identified: ${billionaires.filter((p: any) => FEMALE_NAMES.has(p.name)).length}`);
