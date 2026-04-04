// Fetch Wikipedia profile photos for billionaires
// Uses Wikipedia REST API for more reliable results

const WIKI_REST = 'https://en.wikipedia.org/api/rest_v1';
const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const HEADERS = {
  'User-Agent': 'SajuBuja/1.0 (educational project)',
  'Accept': 'application/json',
};

async function fetchPhotoRest(name: string): Promise<string | null> {
  // Try REST API summary endpoint (most reliable for getting main image)
  const encodedName = encodeURIComponent(name.replace(/ /g, '_'));

  try {
    const res = await fetch(`${WIKI_REST}/page/summary/${encodedName}`, { headers: HEADERS });
    if (res.ok) {
      const data = await res.json();
      if (data.thumbnail?.source) {
        // Get a larger version by modifying the URL
        return data.thumbnail.source.replace(/\/\d+px-/, '/400px-');
      }
    }
  } catch (e) {
    // Ignore, try search fallback
  }

  // Fallback: search for the person
  try {
    const searchUrl = `${WIKI_REST}/page/related/${encodedName}`;
    // Actually let's use the action API with origin parameter for search
    const params = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: name + ' billionaire',
      srnamespace: '0',
      srlimit: '3',
      format: 'json',
      origin: '*',
    });

    const searchRes = await fetch(`${WIKI_API}?${params}`, { headers: HEADERS });
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    const results = searchData.query?.search;
    if (!results || results.length === 0) return null;

    // Try each search result
    for (const result of results) {
      const title = encodeURIComponent(result.title.replace(/ /g, '_'));
      const summaryRes = await fetch(`${WIKI_REST}/page/summary/${title}`, { headers: HEADERS });
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        if (summaryData.thumbnail?.source) {
          return summaryData.thumbnail.source.replace(/\/\d+px-/, '/400px-');
        }
      }
    }
  } catch (e) {
    // Ignore
  }

  return null;
}

async function main() {
  const { billionaires } = await import('../src/lib/data/billionaires');

  // De-duplicate by id
  const unique = billionaires.filter(
    (p, i, arr) => i === arr.findIndex((x) => x.id === p.id)
  );

  console.log(`Fetching photos for ${unique.length} people...`);

  const photoMap: Record<string, string> = {};
  let found = 0;
  let notFound = 0;

  // Process in batches of 5
  const BATCH_SIZE = 5;
  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (person) => {
        const photo = await fetchPhotoRest(person.name);
        return { id: person.id, name: person.name, photo };
      })
    );

    for (const r of results) {
      if (r.photo) {
        photoMap[r.id] = r.photo;
        found++;
      } else {
        notFound++;
        // Log missing ones for debugging
        if (i < 100) console.log(`  Missing: ${r.name}`);
      }
    }

    if ((i + BATCH_SIZE) % 50 === 0 || i + BATCH_SIZE >= unique.length) {
      console.log(`Progress: ${Math.min(i + BATCH_SIZE, unique.length)}/${unique.length} (found: ${found}, missing: ${notFound})`);
    }

    // Rate limit
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Save the photo map
  const fs = await import('fs');
  fs.writeFileSync(
    '/Users/namu_1/sajubuja/src/lib/data/photo-map.json',
    JSON.stringify(photoMap, null, 2)
  );
  console.log(`\nDone! Found ${found}/${unique.length} photos.`);
}

main().catch(console.error);
