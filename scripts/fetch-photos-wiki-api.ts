import * as fs from 'fs';
import * as https from 'https';

// Fetch photos from Wikipedia API for people missing photos
// Uses the Wikipedia REST API to find page images

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'BujasajuBot/1.0 (photo-fetcher)' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function getWikiImage(name: string): Promise<string | null> {
  try {
    // Search for the person on Wikipedia
    const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/ /g, '_'))}`;
    const response = await httpsGet(searchUrl);
    const data = JSON.parse(response);

    if (data.thumbnail?.source) {
      // Get a larger version
      const largeUrl = data.thumbnail.source.replace(/\/\d+px-/, '/400px-');
      return largeUrl;
    }

    // Try with different name formats
    // E.g., "Kim Beom-su" -> "Kim_Beom-su_(businessman)"
    const searchApiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name + ' billionaire')}&format=json&srlimit=3`;
    const searchResponse = await httpsGet(searchApiUrl);
    const searchData = JSON.parse(searchResponse);

    if (searchData.query?.search?.length > 0) {
      for (const result of searchData.query.search) {
        const title = result.title;
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
        const summaryResponse = await httpsGet(summaryUrl);
        const summaryData = JSON.parse(summaryResponse);

        if (summaryData.thumbnail?.source) {
          const largeUrl = summaryData.thumbnail.source.replace(/\/\d+px-/, '/400px-');
          return largeUrl;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function main() {
  const fileContent = fs.readFileSync('/Users/namu_1/sajubuja/src/lib/data/billionaires.ts', 'utf8');

  // Find all people with avatar placeholders
  const entryRegex = /name: '([^'\\]*(?:\\.[^'\\]*)*)'.*?photoUrl: '(https:\/\/ui-avatars\.com[^']*)'/g;
  const entries: { name: string; oldUrl: string }[] = [];
  let match;
  while ((match = entryRegex.exec(fileContent)) !== null) {
    entries.push({ name: match[1].replace(/\\'/g, "'"), oldUrl: match[2] });
  }

  console.log(`Found ${entries.length} people missing photos`);

  // Process in batches to avoid rate limiting
  const BATCH_SIZE = 5;
  const DELAY_MS = 500;
  let found = 0;
  let updatedContent = fileContent;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(async (entry) => {
      const photoUrl = await getWikiImage(entry.name);
      return { ...entry, photoUrl };
    }));

    for (const result of results) {
      if (result.photoUrl) {
        // Escape for use in string replacement
        const escapedOldUrl = result.oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const safeNewUrl = result.photoUrl.replace(/'/g, "\\'");
        updatedContent = updatedContent.replace(result.oldUrl, safeNewUrl);
        found++;
      }
    }

    if (i % 50 === 0) {
      console.log(`Progress: ${i}/${entries.length} checked, ${found} photos found`);
    }

    // Small delay between batches
    if (i + BATCH_SIZE < entries.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  fs.writeFileSync('/Users/namu_1/sajubuja/src/lib/data/billionaires.ts', updatedContent);
  console.log(`\nDone! Found ${found} photos out of ${entries.length} missing`);
}

main().catch(console.error);
