import * as fs from 'fs';
import * as https from 'https';

// Third pass: Use Wikidata SPARQL to find images via person names
// Also try Namu Wiki for Korean people

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'BujasajuBot/1.0', 'Accept': 'application/json' } }, (res) => {
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
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function getWikidataImage(name: string): Promise<string | null> {
  try {
    // Search Wikidata for the person
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&format=json&limit=5&type=item`;
    const searchResponse = await httpsGet(searchUrl);
    const searchData = JSON.parse(searchResponse);

    if (!searchData.search?.length) return null;

    // Try each result
    for (const result of searchData.search) {
      const qid = result.id;
      // Get P18 (image) claim
      const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${qid}&property=P18&format=json`;
      const entityResponse = await httpsGet(entityUrl);
      const entityData = JSON.parse(entityResponse);

      const claims = entityData.claims?.P18;
      if (claims && claims.length > 0) {
        const filename = claims[0].mainsnak?.datavalue?.value;
        if (filename) {
          // Convert filename to Commons URL
          const encodedFilename = encodeURIComponent(filename.replace(/ /g, '_'));
          // Use MD5 hash to construct direct URL
          const crypto = require('crypto');
          const md5 = crypto.createHash('md5').update(filename.replace(/ /g, '_')).digest('hex');
          const a = md5[0];
          const ab = md5[0] + md5[1];
          const url = `https://upload.wikimedia.org/wikipedia/commons/thumb/${a}/${ab}/${encodedFilename}/400px-${encodedFilename}`;
          return url;
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

  // Find all people with avatar placeholders
  const entryRegex = /name: '([^'\\]*(?:\\.[^'\\]*)*)'.*?photoUrl: '(https:\/\/ui-avatars\.com[^']*)'/g;
  const entries: { name: string; oldUrl: string }[] = [];
  let match;
  while ((match = entryRegex.exec(fileContent)) !== null) {
    entries.push({ name: match[1].replace(/\\'/g, "'"), oldUrl: match[2] });
  }

  console.log(`Found ${entries.length} people still missing photos`);

  const BATCH_SIZE = 3;
  const DELAY_MS = 1000;
  let found = 0;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(async (entry) => {
      const photoUrl = await getWikidataImage(entry.name);
      return { ...entry, photoUrl };
    }));

    for (const result of results) {
      if (result.photoUrl) {
        fileContent = fileContent.replace(result.oldUrl, result.photoUrl);
        found++;
      }
    }

    if (i % 50 === 0) {
      console.log(`Progress: ${i}/${entries.length}, found ${found}`);
    }

    if (i + BATCH_SIZE < entries.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  fs.writeFileSync('/Users/namu_1/sajubuja/src/lib/data/billionaires.ts', fileContent);
  console.log(`\nDone! Found ${found} photos via Wikidata out of ${entries.length} missing`);
}

main().catch(console.error);
