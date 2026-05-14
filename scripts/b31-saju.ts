import { calculateSaju, parseBirthday } from '../src/lib/saju/index';
import * as fs from 'fs';

interface B { id: string; name: string; nameKo: string; birthday: string; nationality: string; industry: string; netWorth: number; gender: string; bio?: string; bioKo?: string; }

const sample: B[] = JSON.parse(fs.readFileSync('/tmp/b31-sample.json', 'utf8'));
const results: any[] = [];
for (const p of sample) {
  try {
    const d = parseBirthday(p.birthday);
    const r = calculateSaju(d);
    const yp = r.saju.year.stem + r.saju.year.branch;
    const mp = r.saju.month.stem + r.saju.month.branch;
    const dp = r.saju.day.stem + r.saju.day.branch;
    results.push({ id: p.id, nameKo: p.nameKo, birthday: p.birthday, year: yp, month: mp, day: dp, ilju: r.ilju, wolji: r.wolji, gyeokguk: r.gyeokguk });
    console.log(`${p.id.padEnd(5)} ${(p.nameKo||p.name).padEnd(14)} ${p.birthday}  ${yp} ${mp} ${dp}  일주=${r.ilju} 월지=${r.wolji} 격국=${r.gyeokguk}`);
  } catch (e: any) {
    console.error(`${p.id} ERROR:`, e.message);
  }
}
fs.writeFileSync('/tmp/b31-saju.json', JSON.stringify(results, null, 2));
console.log('\nSaved → /tmp/b31-saju.json (' + results.length + ' rows)');
