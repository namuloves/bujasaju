import * as fs from 'fs';
import * as https from 'https';

// Use ko.wikipedia pageimages API which returns the main image of an article

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'SajubujaBot/1.0 (photo-fetcher)', 'Accept': 'application/json' }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303) {
        if (res.headers.location) {
          httpsGet(res.headers.location).then(resolve).catch(reject);
          return;
        }
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function findPortrait(nameKo: string, nameEn: string, source: string): Promise<string | null> {
  // Strategy 1: Korean Wikipedia pageimages API (search by Korean name)
  for (const lang of ['ko', 'en']) {
    const searchName = lang === 'ko' ? nameKo : nameEn;
    if (!searchName) continue;

    try {
      // Use pageimages prop to get the main image
      const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(searchName)}&prop=pageimages&pithumbsize=400&format=json&redirects=1`;
      const resp = await httpsGet(url);
      const data = JSON.parse(resp);
      const pages = data.query?.pages;
      if (pages) {
        for (const page of Object.values(pages) as any[]) {
          if (page.thumbnail?.source) {
            return page.thumbnail.source;
          }
        }
      }
    } catch {}

    // Strategy 2: Search and get pageimages
    try {
      const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchName + (lang === 'en' ? ' businessman' : ''))}&gsrlimit=5&prop=pageimages&pithumbsize=400&format=json`;
      const resp = await httpsGet(searchUrl);
      const data = JSON.parse(resp);
      const pages = data.query?.pages;
      if (pages) {
        for (const page of Object.values(pages) as any[]) {
          if (page.thumbnail?.source) {
            return page.thumbnail.source;
          }
        }
      }
    } catch {}
  }

  // Strategy 3: Wikidata by Korean name
  if (nameKo) {
    try {
      const sparql = `SELECT ?image WHERE {
        ?item rdfs:label "${nameKo}"@ko .
        ?item wdt:P31 wd:Q5 .
        ?item wdt:P18 ?image .
      } LIMIT 1`;
      const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
      const resp = await httpsGet(url);
      const data = JSON.parse(resp);
      if (data.results?.bindings?.[0]?.image?.value) {
        const imageUrl = data.results.bindings[0].image.value;
        const filename = decodeURIComponent(imageUrl.split('/').pop()!);
        const crypto = require('crypto');
        const md5 = crypto.createHash('md5').update(filename).digest('hex');
        const a = md5[0];
        const ab = md5[0] + md5[1];
        const encodedFilename = encodeURIComponent(filename).replace(/%20/g, '_');
        return `https://upload.wikimedia.org/wikipedia/commons/thumb/${a}/${ab}/${encodedFilename}/400px-${encodedFilename}`;
      }
    } catch {}
  }

  // Strategy 4: Wikidata by English name
  if (nameEn) {
    try {
      const sparql = `SELECT ?image WHERE {
        ?item rdfs:label "${nameEn}"@en .
        ?item wdt:P31 wd:Q5 .
        ?item wdt:P18 ?image .
      } LIMIT 1`;
      const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
      const resp = await httpsGet(url);
      const data = JSON.parse(resp);
      if (data.results?.bindings?.[0]?.image?.value) {
        const imageUrl = data.results.bindings[0].image.value;
        const filename = decodeURIComponent(imageUrl.split('/').pop()!);
        const crypto = require('crypto');
        const md5 = crypto.createHash('md5').update(filename).digest('hex');
        const a = md5[0];
        const ab = md5[0] + md5[1];
        const encodedFilename = encodeURIComponent(filename).replace(/%20/g, '_');
        return `https://upload.wikimedia.org/wikipedia/commons/thumb/${a}/${ab}/${encodedFilename}/400px-${encodedFilename}`;
      }
    } catch {}
  }

  return null;
}

async function main() {
  let fileContent = fs.readFileSync('/Users/namu_1/sajubuja/src/lib/data/billionaires.ts', 'utf8');

  // People needing real portraits — Korean entries with logos, buildings, or avatars
  const people: { nameEn: string; nameKo: string; source: string; oldUrl: string }[] = [
    { nameEn: 'Lee Hae-jin', nameKo: '이해진', source: 'Naver', oldUrl: '' },
    { nameEn: 'Suh Kyung-bae', nameKo: '서경배', source: 'Amorepacific', oldUrl: '' },
    { nameEn: 'Park Hyeon-joo', nameKo: '박현주', source: 'Mirae Asset', oldUrl: '' },
    { nameEn: 'Kim Seung-youn', nameKo: '김승연', source: 'Hanwha', oldUrl: '' },
    { nameEn: 'Lee Woo-hyun', nameKo: '이우현', source: 'OCI', oldUrl: '' },
    { nameEn: 'Chang Byung-gyu', nameKo: '장병규', source: 'Krafton', oldUrl: '' },
    { nameEn: 'Lee Jae-hyun', nameKo: '이재현', source: 'CJ', oldUrl: '' },
    { nameEn: 'Lee Mie-kyung', nameKo: '이미경', source: 'CJ ENM', oldUrl: '' },
    { nameEn: 'Cho Jung-ho', nameKo: '조정호', source: 'Meritz', oldUrl: '' },
    { nameEn: 'Yoo Jung-hyun', nameKo: '유정현', source: 'Nexon', oldUrl: '' },
    { nameEn: 'Dam Chul-gon', nameKo: '담철곤', source: 'Orion', oldUrl: '' },
    { nameEn: 'Kim Dong-kwan', nameKo: '김동관', source: 'Hanwha', oldUrl: '' },
    { nameEn: 'Park Jeong-won', nameKo: '박정원', source: 'Doosan', oldUrl: '' },
    { nameEn: 'Huh Tae-soo', nameKo: '허태수', source: 'GS', oldUrl: '' },
    { nameEn: 'Cho Hyun-joon', nameKo: '조현준', source: 'Hyosung', oldUrl: '' },
    { nameEn: 'Bang Jun-hyuk', nameKo: '방준혁', source: 'Netmarble', oldUrl: '' },
    { nameEn: 'Shin Dong-won', nameKo: '신동원', source: 'Nongshim', oldUrl: '' },
    { nameEn: 'Lee Hae-wook', nameKo: '이해욱', source: 'DL Group', oldUrl: '' },
    { nameEn: 'Kim Nam-goo', nameKo: '김남구', source: 'Korea Investment', oldUrl: '' },
    { nameEn: 'Kim Jun-ki', nameKo: '김준기', source: 'DB Group', oldUrl: '' },
    { nameEn: 'Kim Hyoung-ki', nameKo: '김형기', source: 'Celltrion Healthcare', oldUrl: '' },
    { nameEn: 'Sung Ki-hak', nameKo: '성기학', source: 'Youngone', oldUrl: '' },
    { nameEn: 'Jang Young-shin', nameKo: '장영신', source: 'Aekyung', oldUrl: '' },
    { nameEn: 'Lee Woong-yeol', nameKo: '이웅열', source: 'Kolon', oldUrl: '' },
    { nameEn: 'Jung Chang-sun', nameKo: '정창선', source: 'Jungheung', oldUrl: '' },
    { nameEn: 'Baek Bok-in', nameKo: '백복인', source: 'KT&G', oldUrl: '' },
    { nameEn: 'Choi Jeong-woo', nameKo: '최정우', source: 'POSCO', oldUrl: '' },
    { nameEn: 'Yeo Min-soo', nameKo: '여민수', source: 'Kakao', oldUrl: '' },
    { nameEn: 'Cho Gye-hyun', nameKo: '조계현', source: 'Kakao Games', oldUrl: '' },
    { nameEn: 'Jang Hyun-guk', nameKo: '장현국', source: 'WeMade', oldUrl: '' },
    { nameEn: 'Jung Kyung-in', nameKo: '정경인', source: 'Pearl Abyss', oldUrl: '' },
    { nameEn: 'Kim Yun', nameKo: '김윤', source: 'Samyang', oldUrl: '' },
    { nameEn: 'Kim Ho-yeon', nameKo: '김호연', source: 'Binggrae', oldUrl: '' },
    { nameEn: 'Ryu Young-joon', nameKo: '류영준', source: 'Kakao Pay', oldUrl: '' },
    { nameEn: 'Lee Seung-gun', nameKo: '이승건', source: 'Toss', oldUrl: '' },
    { nameEn: 'Sophie Kim', nameKo: '김슬아', source: 'Kurly', oldUrl: '' },
  ];

  // Find current URLs for each person
  for (const person of people) {
    const escapedName = person.nameEn.replace(/'/g, "\\'");
    const regex = new RegExp(`name: '${escapedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'[^}]*photoUrl: '([^']+)'`);
    const match = fileContent.match(regex);
    if (match) {
      person.oldUrl = match[1];
    }
  }

  let found = 0;
  for (let i = 0; i < people.length; i++) {
    const person = people[i];
    if (!person.oldUrl) {
      console.log(`[${i+1}] ${person.nameKo} - SKIPPED (not found in data)`);
      continue;
    }
    console.log(`[${i+1}/${people.length}] Searching: ${person.nameKo} (${person.nameEn})...`);
    const photoUrl = await findPortrait(person.nameKo, person.nameEn, person.source);
    if (photoUrl) {
      fileContent = fileContent.replace(person.oldUrl, photoUrl);
      found++;
      console.log(`  FOUND!`);
    } else {
      console.log(`  Not found`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  fs.writeFileSync('/Users/namu_1/sajubuja/src/lib/data/billionaires.ts', fileContent);
  console.log(`\nDone! Found ${found} portraits out of ${people.length}`);
}

main().catch(console.error);
