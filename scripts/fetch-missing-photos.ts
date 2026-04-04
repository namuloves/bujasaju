// Fetch photos for people who still have ui-avatars placeholder
import * as fs from 'fs';
import { billionaires } from '../src/lib/data/billionaires';

const WIKI_REST = 'https://en.wikipedia.org/api/rest_v1';
const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const HEADERS = {
  'User-Agent': 'SajuBuja/1.0 (educational project)',
  'Accept': 'application/json',
};

// Find people with placeholder photos
const missing = billionaires.filter((p) => p.photoUrl.includes('ui-avatars.com'));
console.log(`${missing.length} people missing photos out of ${billionaires.length}`);

// Alternative name mappings for people who might have different Wikipedia titles
const NAME_ALIASES: Record<string, string[]> = {
  'Francoise Bettencourt Meyers': ['Françoise Bettencourt Meyers'],
  'Francois Pinault': ['François Pinault', 'François-Henri Pinault'],
  'Colin Zheng Huang': ['Huang Zheng', 'Colin Huang'],
  'Takemitsu Takizaki': ['Takizaki Takemitsu'],
  'Charlene de Carvalho-Heineken': ['Charlene de Carvalho'],
  'Gina Rinehart': ['Gina Rinehart'],
  'Andrew Forrest': ['Andrew Forrest (businessman)'],
  'Johann Rupert': ['Johann Rupert'],
  'German Larrea': ['Germán Larrea Mota-Velasco'],
  'Lee Jae-yong': ['Lee Jae-yong (businessman)'],
  'Kim Beom-su': ['Kim Beom-su (businessman)'],
  'Seo Jung-jin': ['Seo Jung-jin'],
  'Jay Y. Lee': ['Lee Jae-yong (businessman)'],
  'Kwon Hyuk-bin': ['Kwon Hyuk-bin'],
  'Kim Jung-ju': ['Kim Jung-ju'],
  'Chey Tae-won': ['Chey Tae-won'],
  'Shin Dong-bin': ['Shin Dong-bin'],
  'Patrick Drahi': ['Patrick Drahi'],
  'Peter Thiel': ['Peter Thiel'],
  'Reed Hastings': ['Reed Hastings'],
  'Marc Benioff': ['Marc Benioff'],
  'Travis Kalanick': ['Travis Kalanick'],
  'Evan Spiegel': ['Evan Spiegel'],
  'Bobby Murphy': ['Bobby Murphy (businessman)'],
  'Sam Altman': ['Sam Altman'],
  'Liu Qiangdong': ['Liu Qiangdong', 'Richard Liu'],
  'Wang Xing': ['Wang Xing (February 1979)'],
  'Dhanin Chearavanont': ['Dhanin Chearavanont'],
  'Chung Mong-koo': ['Chung Mong-koo'],
  'Lee Hae-jin': ['Lee Hae-jin'],
  'Lee Boo-jin': ['Lee Boo-jin'],
  'Iris Fontbona': ['Iris Fontbona'],
  'Chung Euisun': ['Chung Euisun'],
  'Bang Si-hyuk': ['Bang Si-hyuk'],
  'Lee Myung-hee': ['Lee Myung-hee'],
  'Lee Seo-hyun': ['Lee Seo-hyun'],
  'Koo Kwang-mo': ['Koo Kwang-mo'],
  'Son Masayoshi': ['Masayoshi Son'],
  'Cho Yang-ho': ['Cho Yang-ho'],
  'Shin Kyuk-ho': ['Shin Kyuk-ho'],
  'Park Hyeon-joo': ['Park Hyun-joo (businessman)'],
  'Nita Ambani': ['Nita Ambani'],
  'Anil Ambani': ['Anil Ambani'],
  'Kevin Systrom': ['Kevin Systrom'],
  'Eric Yuan': ['Eric Yuan'],
  'Dana White': ['Dana White'],
  'Vlad Tenev': ['Vlad Tenev'],
  'Sachin Bansal': ['Sachin Bansal'],
  'Binny Bansal': ['Binny Bansal'],
  'Dara Khosrowshahi': ['Dara Khosrowshahi'],
  'Mike Krieger': ['Mike Krieger'],
  'Pavel Durov': ['Pavel Durov'],
  'Bom Kim': ['Bom Kim'],
  'Nicolas Berggruen': ['Nicolas Berggruen'],
  'Lorenzo Fertitta': ['Lorenzo Fertitta'],
  'Frank Fertitta III': ['Frank Fertitta III'],
  'Saad Hariri': ['Saad Hariri'],
  'Dmitry Rybolovlev': ['Dmitry Rybolovlev'],
  'Arkady Rotenberg': ['Arkady Rotenberg'],
  'Boris Rotenberg': ['Boris Rotenberg'],
  'Petr Aven': ['Petr Aven'],
  'Mikhail Gutseriev': ['Mikhail Gutseriev'],
  'Shahid Balwa': ['Shahid Balwa'],
  'Ayman Hariri': ['Ayman Hariri'],
};

async function fetchPhoto(name: string): Promise<string | null> {
  const names = [name, ...(NAME_ALIASES[name] || [])];

  for (const n of names) {
    const encoded = encodeURIComponent(n.replace(/ /g, '_'));
    try {
      const res = await fetch(`${WIKI_REST}/page/summary/${encoded}`, { headers: HEADERS });
      if (res.ok) {
        const data = await res.json();
        if (data.thumbnail?.source) {
          return data.thumbnail.source.replace(/\/\d+px-/, '/400px-');
        }
      }
    } catch {}
  }

  // Try search with broader terms
  for (const n of names) {
    try {
      const params = new URLSearchParams({
        action: 'query',
        list: 'search',
        srsearch: n,
        srnamespace: '0',
        srlimit: '5',
        format: 'json',
        origin: '*',
      });
      const searchRes = await fetch(`${WIKI_API}?${params}`, { headers: HEADERS });
      if (!searchRes.ok) continue;
      const searchData = await searchRes.json();
      const results = searchData.query?.search;
      if (!results) continue;

      for (const result of results) {
        const title = encodeURIComponent(result.title.replace(/ /g, '_'));
        try {
          const summRes = await fetch(`${WIKI_REST}/page/summary/${title}`, { headers: HEADERS });
          if (summRes.ok) {
            const summData = await summRes.json();
            if (summData.thumbnail?.source) {
              return summData.thumbnail.source.replace(/\/\d+px-/, '/400px-');
            }
          }
        } catch {}
      }
    } catch {}
  }

  return null;
}

async function main() {
  let found = 0;
  const updates: Record<string, string> = {};

  const BATCH_SIZE = 5;
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (p) => {
        const photo = await fetchPhoto(p.name);
        return { id: p.id, name: p.name, photo };
      })
    );

    for (const r of results) {
      if (r.photo) {
        updates[r.id] = r.photo;
        found++;
        console.log(`  Found: ${r.name}`);
      }
    }

    if ((i + BATCH_SIZE) % 50 === 0 || i + BATCH_SIZE >= missing.length) {
      console.log(`Progress: ${Math.min(i + BATCH_SIZE, missing.length)}/${missing.length} (found: ${found})`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  // Apply updates to the billionaire data
  if (found > 0) {
    const updatedBillionaires = billionaires.map((p) => {
      if (updates[p.id]) {
        return { ...p, photoUrl: updates[p.id] };
      }
      return p;
    });

    const lines = updatedBillionaires.map((p) =>
      `  { id: '${p.id}', name: '${p.name.replace(/'/g, "\\'")}', birthday: '${p.birthday}', netWorth: ${p.netWorth}, nationality: '${p.nationality}', industry: '${p.industry}', gender: '${p.gender}', photoUrl: '${p.photoUrl.replace(/'/g, "\\'")}' },`
    );

    const output = `import { Person } from '../saju/types';

export const billionaires: Person[] = [
${lines.join('\n')}
];
`;
    fs.writeFileSync('/Users/namu_1/sajubuja/src/lib/data/billionaires.ts', output);
    console.log(`\nUpdated ${found} more photos in billionaires.ts`);
  } else {
    console.log('\nNo new photos found.');
  }

  console.log(`Total missing after update: ${missing.length - found}`);
}

main().catch(console.error);
