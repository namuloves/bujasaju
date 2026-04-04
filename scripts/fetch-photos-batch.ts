import * as fs from 'fs';
import * as https from 'https';

// Batch approach: Use Wikidata SPARQL to get images for multiple people at once

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'SajubujaBot/1.0 (https://sajubuja.com; contact@sajubuja.com)',
        'Accept': 'application/sparql-results+json'
      }
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
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function fetchImagesBatch(names: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Build SPARQL query to find images for people by name
  // Process in batches of 20 names
  const BATCH = 20;

  for (let i = 0; i < names.length; i += BATCH) {
    const batch = names.slice(i, i + BATCH);
    const nameFilters = batch.map(n => `"${n.replace(/"/g, '\\"')}"@en`).join(' ');

    const sparql = `
      SELECT ?item ?itemLabel ?image WHERE {
        VALUES ?name { ${nameFilters} }
        ?item rdfs:label ?name .
        ?item wdt:P31 wd:Q5 .
        ?item wdt:P18 ?image .
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
    `;

    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;

    try {
      const response = await httpsGet(url);
      const data = JSON.parse(response);

      if (data.results?.bindings) {
        for (const binding of data.results.bindings) {
          const label = binding.itemLabel?.value;
          const imageUrl = binding.image?.value;
          if (label && imageUrl) {
            // Convert Commons URL to thumbnail
            const filename = imageUrl.split('/').pop()!;
            const crypto = require('crypto');
            const md5 = crypto.createHash('md5').update(decodeURIComponent(filename)).digest('hex');
            const a = md5[0];
            const ab = md5[0] + md5[1];
            const thumbUrl = `https://upload.wikimedia.org/wikipedia/commons/thumb/${a}/${ab}/${filename}/400px-${filename}`;
            results.set(label.toLowerCase(), thumbUrl);
          }
        }
      }
    } catch (e) {
      // Rate limited or error, wait and retry
      console.log(`  Batch ${i}/${names.length} failed, waiting...`);
      await new Promise(r => setTimeout(r, 5000));
    }

    if (i % 100 === 0) {
      console.log(`SPARQL batch: ${i}/${names.length}, found ${results.size}`);
    }

    // Delay between batches
    await new Promise(r => setTimeout(r, 2000));
  }

  return results;
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

  console.log(`Found ${entries.length} people missing photos`);

  const names = entries.map(e => e.name);
  const imageMap = await fetchImagesBatch(names);

  console.log(`\nTotal images found via SPARQL: ${imageMap.size}`);

  let updated = 0;
  for (const entry of entries) {
    const imageUrl = imageMap.get(entry.name.toLowerCase());
    if (imageUrl) {
      fileContent = fileContent.replace(entry.oldUrl, imageUrl);
      updated++;
    }
  }

  fs.writeFileSync('/Users/namu_1/sajubuja/src/lib/data/billionaires.ts', fileContent);
  console.log(`Updated ${updated} photo URLs`);
}

main().catch(console.error);
