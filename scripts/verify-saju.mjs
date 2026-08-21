import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const ROOT=process.cwd();
const ENRICHED=join(ROOT,'private-data','enriched-billionaires.json');
const BIO=join(ROOT,'private-data','deep-bios-v2');
const STEMS='갑을병정무기경신임계', BRANCHES='자축인묘진사오미신유술해';
const jdn=(y,m,d)=>{const a=Math.floor((14-m)/12),y2=y+4800-a,m2=m+12*a-3;
 return d+Math.floor((153*m2+2)/5)+365*y2+Math.floor(y2/4)-Math.floor(y2/100)+Math.floor(y2/400)-32045;};
const dayPillar=(y,m,d)=>{const i=(((jdn(y,m,d)+49)%60)+60)%60;return STEMS[i%10]+BRANCHES[i%12];};
if(dayPillar(2000,1,1)!=='무오'){console.error('FATAL calibration');process.exit(2);}
const raw=JSON.parse(readFileSync(ENRICHED,'utf8'));
const people=Array.isArray(raw)?raw:(raw.people??[]);
const byId=new Map(); for(const p of people) if(p&&p.id!=null) byId.set(String(p.id),p);
const failures=[]; let chartChecked=0,mirrorChecked=0,basisChecked=0;
for(const p of people){const b=p.birthday??'';const stored=p.saju?.ilju;
 if(!stored||b.length<10) continue; chartChecked++;
 const calc=dayPillar(+b.slice(0,4),+b.slice(5,7),+b.slice(8,10));
 if(calc!==stored) failures.push({check:'CHART',id:String(p.id),name:p.nameKo??p.name??'',detail:`${b.slice(0,10)} -> ${calc}, stored ${stored}`});}
if(existsSync(BIO)) for(const f of readdirSync(BIO).filter(n=>n.endsWith('.json')&&!n.startsWith('.'))){
 const bio=JSON.parse(readFileSync(join(BIO,f),'utf8')); const p=byId.get(String(bio.id)); if(!p) continue;
 const saju=p.saju??{}, name=bio.nameKo??bio.name??'';
 if(bio.ilju&&saju.ilju){mirrorChecked++; if(bio.ilju!==saju.ilju) failures.push({check:'MIRROR',id:String(bio.id),name,detail:`ilju ${bio.ilju} != ${saju.ilju}`});}
 if(bio.gyeokguk&&saju.gyeokguk&&bio.gyeokguk!==saju.gyeokguk) failures.push({check:'MIRROR',id:String(bio.id),name,detail:`gyeokguk ${bio.gyeokguk} != ${saju.gyeokguk}`});
 const sc=bio.sajuConnection; if(!sc||typeof sc!=='object') continue;
 const s=p.saju?.saju??{}; const chars=new Set();
 for(const k of ['year','month','day','hour']){const ju=s[k]; if(!ju) continue; if(ju.stem)chars.add(ju.stem); if(ju.branch)chars.add(ju.branch);}
 if(chars.size===0) continue;
 for(const key of ['johuKo','structureKo','wealthKo','riskKo']){const claim=sc[key]; if(!claim?.basis) continue;
  for(const entry of claim.basis){basisChecked++;
   const cited=[...entry].filter(ch=>STEMS.includes(ch)||BRANCHES.includes(ch));
   if(cited.length===0) continue;
   if(!cited.some(ch=>chars.has(ch))) failures.push({check:'BASIS',id:String(bio.id),name,detail:`${key} cites "${entry}" — not in chart (${[...chars].join('')})`});}}}
const by=c=>failures.filter(x=>x.check===c).length;
console.log(`CHART  : ${chartChecked} checked, ${by('CHART')} failed`);
console.log(`MIRROR : ${mirrorChecked} checked, ${by('MIRROR')} failed`);
console.log(`BASIS  : ${basisChecked} checked, ${by('BASIS')} failed`);
for(const f of failures.slice(0,20)) console.log(`  [${f.check}] ${f.id} ${f.name}: ${f.detail}`);
console.log(failures.length? `\nFAILED: ${failures.length}` : '\nOK — saju data is internally consistent.');
process.exit(failures.length?1:0);
