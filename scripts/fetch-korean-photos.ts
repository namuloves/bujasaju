import * as fs from 'fs';
import * as https from 'https';

// Second pass: try Korean Wikipedia for Korean people still missing photos

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'BujasajuBot/1.0 (photo-fetcher)' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          https.get(redirectUrl, { headers: { 'User-Agent': 'BujasajuBot/1.0' } }, (res2) => {
            let data = '';
            res2.on('data', (chunk) => data += chunk);
            res2.on('end', () => resolve(data));
          }).on('error', reject);
          return;
        }
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function getKoWikiImage(nameKo: string): Promise<string | null> {
  try {
    // Try Korean Wikipedia
    const url = `https://ko.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(nameKo)}`;
    const response = await httpsGet(url);
    const data = JSON.parse(response);
    if (data.thumbnail?.source) {
      return data.thumbnail.source.replace(/\/\d+px-/, '/400px-');
    }

    // Try search
    const searchUrl = `https://ko.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(nameKo)}&format=json&srlimit=3`;
    const searchResponse = await httpsGet(searchUrl);
    const searchData = JSON.parse(searchResponse);

    if (searchData.query?.search?.length > 0) {
      for (const result of searchData.query.search) {
        const title = result.title;
        const summaryUrl = `https://ko.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
        const summaryResponse = await httpsGet(summaryUrl);
        const summaryData = JSON.parse(summaryResponse);
        if (summaryData.thumbnail?.source) {
          return summaryData.thumbnail.source.replace(/\/\d+px-/, '/400px-');
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function main() {
  let fileContent = fs.readFileSync('/Users/namu_1/sajubuja/src/lib/data/billionaires.ts', 'utf8');

  // Find Korean people still with avatar placeholders that have nameKo
  const entryRegex = /nameKo: '([^']+)'.*?photoUrl: '(https:\/\/ui-avatars\.com[^']*)'/g;
  const entries: { nameKo: string; oldUrl: string }[] = [];
  let match;
  while ((match = entryRegex.exec(fileContent)) !== null) {
    entries.push({ nameKo: match[1], oldUrl: match[2] });
  }

  console.log(`Found ${entries.length} Korean people still missing photos`);

  const BATCH_SIZE = 3;
  const DELAY_MS = 800;
  let found = 0;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(async (entry) => {
      const photoUrl = await getKoWikiImage(entry.nameKo);
      return { ...entry, photoUrl };
    }));

    for (const result of results) {
      if (result.photoUrl) {
        fileContent = fileContent.replace(result.oldUrl, result.photoUrl);
        found++;
        console.log(`  Found: ${result.nameKo} -> ${result.photoUrl.substring(0, 80)}...`);
      }
    }

    if (i % 20 === 0) {
      console.log(`Progress: ${i}/${entries.length}, found ${found}`);
    }

    if (i + BATCH_SIZE < entries.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  fs.writeFileSync('/Users/namu_1/sajubuja/src/lib/data/billionaires.ts', fileContent);
  console.log(`\nDone! Found ${found} additional photos from Korean Wikipedia`);
}

main().catch(console.error);
