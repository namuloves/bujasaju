import * as fs from 'fs';
import * as https from 'https';

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

async function searchKoWiki(nameKo: string, nameEn: string): Promise<string | null> {
  // Try Korean name on Korean Wikipedia
  for (const name of [nameKo, nameEn]) {
    if (!name) continue;
    try {
      // Direct page lookup
      const url = `https://ko.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`;
      const response = await httpsGet(url);
      const data = JSON.parse(response);
      if (data.thumbnail?.source) {
        return data.thumbnail.source.replace(/\/\d+px-/, '/400px-');
      }
    } catch {}

    try {
      // Search
      const searchUrl = `https://ko.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&srlimit=5`;
      const searchResp = await httpsGet(searchUrl);
      const searchData = JSON.parse(searchResp);
      if (searchData.query?.search) {
        for (const result of searchData.query.search) {
          try {
            const summUrl = `https://ko.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(result.title)}`;
            const summResp = await httpsGet(summUrl);
            const summData = JSON.parse(summResp);
            if (summData.thumbnail?.source && summData.description &&
                (summData.description.includes('기업') || summData.description.includes('사업') ||
                 summData.description.includes('회장') || summData.description.includes('대표') ||
                 summData.description.includes('CEO') || summData.description.includes('창업'))) {
              return summData.thumbnail.source.replace(/\/\d+px-/, '/400px-');
            }
          } catch {}
        }
      }
    } catch {}
  }

  // Try English Wikipedia with more search terms
  for (const suffix of ['', ' businessman', ' CEO', ' billionaire', ' 기업인']) {
    const name2 = nameEn || nameKo;
    if (!name2) continue;
    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name2 + suffix)}&format=json&srlimit=3`;
      const searchResp = await httpsGet(searchUrl);
      const searchData = JSON.parse(searchResp);
      if (searchData.query?.search) {
        for (const result of searchData.query.search) {
          try {
            const summUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(result.title)}`;
            const summResp = await httpsGet(summUrl);
            const summData = JSON.parse(summResp);
            if (summData.thumbnail?.source) {
              return summData.thumbnail.source.replace(/\/\d+px-/, '/400px-');
            }
          } catch {}
        }
      }
    } catch {}
  }

  // Try Wikidata SPARQL for Korean name
  if (nameKo) {
    try {
      const sparql = `SELECT ?item ?image WHERE {
        ?item rdfs:label "${nameKo}"@ko .
        ?item wdt:P31 wd:Q5 .
        ?item wdt:P18 ?image .
      } LIMIT 1`;
      const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
      const resp = await httpsGet(url);
      const data = JSON.parse(resp);
      if (data.results?.bindings?.[0]?.image?.value) {
        const imageUrl = data.results.bindings[0].image.value;
        const filename = imageUrl.split('/').pop()!;
        const crypto = require('crypto');
        const md5 = crypto.createHash('md5').update(decodeURIComponent(filename)).digest('hex');
        const a = md5[0];
        const ab = md5[0] + md5[1];
        return `https://upload.wikimedia.org/wikipedia/commons/thumb/${a}/${ab}/${filename}/400px-${filename}`;
      }
    } catch {}
  }

  return null;
}

async function main() {
  let fileContent = fs.readFileSync('/Users/namu_1/sajubuja/src/lib/data/billionaires.ts', 'utf8');

  // Find Korean entries with logo/building/avatar photos
  const entries: { nameKo: string; nameEn: string; oldUrl: string }[] = [];
  const regex = /name: '([^'\\]*(?:\\.[^'\\]*)*)'(?:, nameKo: '([^']+)')?.*?nationality: 'KR'.*?photoUrl: '([^']+)'/g;
  let match;
  while ((match = regex.exec(fileContent)) !== null) {
    const url = match[3];
    const isAvatar = url.includes('ui-avatars');
    const isLogo = /logo|Logo|_CI|wordmark/i.test(url);
    const isBuilding = /HQ|headquarters|Tower|Building/i.test(url);
    if (isAvatar || isLogo || isBuilding) {
      entries.push({
        nameEn: match[1].replace(/\\'/g, "'"),
        nameKo: match[2] || '',
        oldUrl: url,
      });
    }
  }

  // Also check entries with KR where nameKo is before name
  const regex2 = /nameKo: '([^']+)'.*?name: '([^'\\]*(?:\\.[^'\\]*)*)'.*?nationality: 'KR'.*?photoUrl: '([^']+)'/g;
  while ((match = regex2.exec(fileContent)) !== null) {
    const url = match[3];
    const isAvatar = url.includes('ui-avatars');
    const isLogo = /logo|Logo|_CI|wordmark/i.test(url);
    const isBuilding = /HQ|headquarters|Tower|Building/i.test(url);
    if (isAvatar || isLogo || isBuilding) {
      // Check if already added
      if (!entries.some(e => e.nameEn === match[2].replace(/\\'/g, "'"))) {
        entries.push({
          nameEn: match[2].replace(/\\'/g, "'"),
          nameKo: match[1],
          oldUrl: url,
        });
      }
    }
  }

  console.log(`Found ${entries.length} Korean entries needing portraits`);

  let found = 0;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    console.log(`[${i+1}/${entries.length}] Searching: ${entry.nameKo || entry.nameEn}...`);
    const photoUrl = await searchKoWiki(entry.nameKo, entry.nameEn);
    if (photoUrl) {
      // Escape for replacement
      const escapedOld = entry.oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const safeNew = photoUrl.replace(/'/g, '%27');
      fileContent = fileContent.replace(entry.oldUrl, safeNew);
      found++;
      console.log(`  FOUND: ${safeNew.substring(0, 80)}...`);
    } else {
      console.log(`  Not found`);
    }
    // Rate limit
    await new Promise(r => setTimeout(r, 1500));
  }

  fs.writeFileSync('/Users/namu_1/sajubuja/src/lib/data/billionaires.ts', fileContent);
  console.log(`\nDone! Found ${found} portraits out of ${entries.length}`);
}

main().catch(console.error);
