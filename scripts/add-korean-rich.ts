import * as fs from 'fs';

// Additional Korean rich people not in the Forbes billionaire list
// These include chaebol family members, successful entrepreneurs, and notable wealthy Koreans
const additionalKoreans = [
  // Samsung family
  { name: 'Lee Seo-hyun', birthday: '1973-09-27', netWorth: 2.5, industry: 'Conglomerate', gender: 'F', source: 'Samsung (Cheil Industries)' },
  // Hyundai family
  { name: 'Chung Mong-joon', birthday: '1951-10-17', netWorth: 2.0, industry: 'Conglomerate', gender: 'M', source: 'Hyundai Heavy Industries' },
  { name: 'Chung Mong-gyu', birthday: '1952-02-01', netWorth: 1.3, industry: 'Conglomerate', gender: 'M', source: 'HDC Group (Hyundai)' },
  // Hanwha
  { name: 'Kim Seung-youn', birthday: '1952-11-28', netWorth: 2.4, industry: 'Conglomerate', gender: 'M', source: 'Hanwha Group' },
  { name: 'Kim Dong-kwan', birthday: '1983-09-07', netWorth: 1.8, industry: 'Conglomerate', gender: 'M', source: 'Hanwha Group' },
  // Doosan
  { name: 'Park Jeong-won', birthday: '1961-08-29', netWorth: 1.2, industry: 'Conglomerate', gender: 'M', source: 'Doosan Group' },
  // CJ Group
  { name: 'Lee Jae-hyun', birthday: '1960-05-08', netWorth: 2.7, industry: 'Food', gender: 'M', source: 'CJ Group' },
  { name: 'Lee Mie-kyung', birthday: '1958-11-03', netWorth: 2.2, industry: 'Media', gender: 'F', source: 'CJ Group (ENM)' },
  // Naver / Tech
  { name: 'Lee Hae-jin', birthday: '1967-06-22', netWorth: 3.8, industry: 'Technology', gender: 'M', source: 'Naver' },
  // Coupang
  { name: 'Bom Kim', birthday: '1978-08-06', netWorth: 3.1, industry: 'E-commerce', gender: 'M', source: 'Coupang' },
  // Pearl Abyss (gaming)
  { name: 'Jung Kyung-in', birthday: '1975-03-15', netWorth: 1.0, industry: 'Gaming', gender: 'M', source: 'Pearl Abyss' },
  // Krafton (PUBG)
  { name: 'Chang Byung-gyu', birthday: '1974-06-15', netWorth: 2.8, industry: 'Gaming', gender: 'M', source: 'Krafton (PUBG)' },
  // Netmarble
  { name: 'Bang Jun-hyuk', birthday: '1968-04-22', netWorth: 2.2, industry: 'Gaming', gender: 'M', source: 'Netmarble' },
  // Kakao Bank / Fintech
  { name: 'Yeo Min-soo', birthday: '1971-10-03', netWorth: 1.0, industry: 'Technology', gender: 'M', source: 'Kakao' },
  // Amorepacific
  { name: 'Suh Kyung-bae', birthday: '1963-01-20', netWorth: 4.5, industry: 'Cosmetics', gender: 'M', source: 'Amorepacific' },
  // Aekyung
  { name: 'Jang Young-shin', birthday: '1954-07-12', netWorth: 1.3, industry: 'Consumer Goods', gender: 'M', source: 'Aekyung Group' },
  // Nongshim
  { name: 'Shin Dong-won', birthday: '1968-03-29', netWorth: 1.1, industry: 'Food', gender: 'M', source: 'Nongshim' },
  // Kumho
  { name: 'Park Sam-koo', birthday: '1945-07-27', netWorth: 0.8, industry: 'Conglomerate', gender: 'M', source: 'Kumho Asiana Group' },
  // GS Group
  { name: 'Huh Chang-soo', birthday: '1948-08-21', netWorth: 2.3, industry: 'Energy', gender: 'M', source: 'GS Group' },
  { name: 'Huh Tae-soo', birthday: '1962-07-05', netWorth: 1.7, industry: 'Retail', gender: 'M', source: 'GS Retail' },
  // Posco / Steel
  { name: 'Choi Jeong-woo', birthday: '1958-01-22', netWorth: 0.9, industry: 'Steel', gender: 'M', source: 'POSCO' },
  // Hyosung
  { name: 'Cho Hyun-joon', birthday: '1965-07-30', netWorth: 1.5, industry: 'Manufacturing', gender: 'M', source: 'Hyosung Group' },
  // Kolon
  { name: 'Lee Woong-yeol', birthday: '1958-12-15', netWorth: 1.0, industry: 'Conglomerate', gender: 'M', source: 'Kolon Group' },
  // Daewoo E&C / Jungheung
  { name: 'Jung Chang-sun', birthday: '1946-03-10', netWorth: 1.3, industry: 'Construction', gender: 'M', source: 'Jungheung Group' },
  // OCI
  { name: 'Lee Woo-hyun', birthday: '1964-04-18', netWorth: 1.4, industry: 'Chemicals', gender: 'M', source: 'OCI' },
  // Entertainment / Music industry
  { name: 'Lee Soo-man', birthday: '1952-06-18', netWorth: 1.5, industry: 'Entertainment', gender: 'M', source: 'SM Entertainment' },
  { name: 'Yang Hyun-suk', birthday: '1970-01-09', netWorth: 0.5, industry: 'Entertainment', gender: 'M', source: 'YG Entertainment' },
  { name: 'Park Jin-young', birthday: '1971-12-13', netWorth: 0.7, industry: 'Entertainment', gender: 'M', source: 'JYP Entertainment' },
  // E-Mart / Shinsegae
  { name: 'Chung Yong-jin', birthday: '1968-09-25', netWorth: 3.5, industry: 'Retail', gender: 'M', source: 'Shinsegae (E-Mart)' },
  { name: 'Lee Myung-hee (Shinsegae)', birthday: '1943-09-07', netWorth: 3.5, industry: 'Retail', gender: 'F', source: 'Shinsegae Group' },
  // Hanjin / Korean Air
  { name: 'Cho Won-tae', birthday: '1976-03-15', netWorth: 1.8, industry: 'Aviation', gender: 'M', source: 'Korean Air (Hanjin Group)' },
  // KT&G
  { name: 'Baek Bok-in', birthday: '1961-05-15', netWorth: 0.6, industry: 'Tobacco', gender: 'M', source: 'KT&G' },
  // DB Group
  { name: 'Kim Jun-ki', birthday: '1962-03-11', netWorth: 1.2, industry: 'Insurance', gender: 'M', source: 'DB Group' },
  // Youngone
  { name: 'Sung Ki-hak', birthday: '1940-11-03', netWorth: 1.7, industry: 'Apparel', gender: 'M', source: 'Youngone Corporation' },
  // Mirae Asset
  { name: 'Park Hyeon-joo', birthday: '1958-04-14', netWorth: 2.0, industry: 'Finance', gender: 'M', source: 'Mirae Asset' },
  // Celltrion Healthcare
  { name: 'Kim Hyoung-ki', birthday: '1969-08-30', netWorth: 1.1, industry: 'Healthcare', gender: 'M', source: 'Celltrion Healthcare' },
  // Korea Investment Holdings
  { name: 'Kim Nam-goo', birthday: '1955-06-08', netWorth: 1.3, industry: 'Finance', gender: 'M', source: 'Korea Investment Holdings' },
  // Kakao games / entertainment
  { name: 'Cho Gye-hyun', birthday: '1970-11-20', netWorth: 0.9, industry: 'Gaming', gender: 'M', source: 'Kakao Games' },
  // Wemade (crypto gaming)
  { name: 'Jang Hyun-guk', birthday: '1972-05-08', netWorth: 1.0, industry: 'Gaming', gender: 'M', source: 'WeMade' },
  // Daelim / DL Group
  { name: 'Lee Hae-wook', birthday: '1961-09-12', netWorth: 1.5, industry: 'Construction', gender: 'M', source: 'DL Group (Daelim)' },
  // Samyang
  { name: 'Kim Yun', birthday: '1960-01-15', netWorth: 0.8, industry: 'Food', gender: 'M', source: 'Samyang Foods' },
  // Binggrae
  { name: 'Kim Ho-yeon', birthday: '1952-08-14', netWorth: 0.7, industry: 'Food', gender: 'M', source: 'Binggrae' },
  // Korean Celebrities/Athletes who are wealthy
  { name: 'Son Heung-min', birthday: '1992-07-08', netWorth: 0.2, industry: 'Sports', gender: 'M', source: 'Football' },
  { name: 'BTS (RM) Kim Nam-joon', birthday: '1994-09-12', netWorth: 0.15, industry: 'Entertainment', gender: 'M', source: 'BTS / HYBE' },
  { name: 'Lee Min-ho', birthday: '1987-06-22', netWorth: 0.05, industry: 'Entertainment', gender: 'M', source: 'Acting' },
  // Tongyang / Orion
  { name: 'Dam Chul-gon', birthday: '1944-02-15', netWorth: 2.3, industry: 'Food', gender: 'M', source: 'Orion Corporation' },
  // Kakao Pay
  { name: 'Ryu Young-joon', birthday: '1970-04-21', netWorth: 0.8, industry: 'Fintech', gender: 'M', source: 'Kakao Pay' },
  // Toss (Viva Republica)
  { name: 'Lee Seung-gun', birthday: '1983-06-02', netWorth: 0.5, industry: 'Fintech', gender: 'M', source: 'Toss (Viva Republica)' },
  // Market Kurly
  { name: 'Sophie Kim', birthday: '1983-12-14', netWorth: 0.3, industry: 'E-commerce', gender: 'F', source: 'Kurly' },
  // Woowa Brothers (Baedal Minjok)
  { name: 'Kim Bong-jin', birthday: '1976-05-25', netWorth: 1.5, industry: 'Technology', gender: 'M', source: 'Woowa Brothers (배달의민족)' },
];

// Read existing file
const existingFile = fs.readFileSync('/Users/namu_1/sajubuja/src/lib/data/billionaires.ts', 'utf8');

// Check which names already exist (case-insensitive)
const existingNamesLower = new Set<string>();
const nameRegex = /name:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g;
let m;
while ((m = nameRegex.exec(existingFile)) !== null) {
  existingNamesLower.add(m[1].replace(/\\'/g, "'").toLowerCase().trim());
}

const newEntries: typeof additionalKoreans = [];
for (const person of additionalKoreans) {
  if (existingNamesLower.has(person.name.toLowerCase().trim())) {
    console.log(`  Skip (exists): ${person.name}`);
    continue;
  }
  newEntries.push(person);
}

console.log(`Adding ${newEntries.length} new Korean entries`);

const newTsLines = newEntries.map((e) => {
  const photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(e.name)}&size=200&background=random&bold=true`;
  return `  { id: '0', name: '${e.name.replace(/'/g, "\\'")}', birthday: '${e.birthday}', netWorth: ${e.netWorth}, nationality: 'KR', industry: '${e.industry.replace(/'/g, "\\'")}', gender: '${e.gender}', source: '${e.source.replace(/'/g, "\\'")}', photoUrl: '${photoUrl.replace(/'/g, "\\'")}' },`;
});

const closingIndex = existingFile.lastIndexOf('];');
const updatedFile = existingFile.substring(0, closingIndex) + newTsLines.join('\n') + '\n];\n';

fs.writeFileSync('/Users/namu_1/sajubuja/src/lib/data/billionaires.ts', updatedFile);
console.log(`Written to billionaires.ts`);
