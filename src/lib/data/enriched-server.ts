import fs from 'fs';
import type { EnrichedPerson } from '@/lib/saju/types';
import { enrichedBillionairesPath } from './paths';
// Imported (not read with fs) so it is bundled into every route that loads
// people — no outputFileTracingIncludes entry to forget.
import commonNamesKo from '../../../private-data/common-names-ko.json';

let _people: EnrichedPerson[] | null = null;
let _byId: Map<string, EnrichedPerson> | null = null;

// Mirrors the client filter in enriched.ts: hide entries with netWorth=0
// (deceased founders, celebrities) everywhere — including direct profile
// links — so the visible roster is consistent.
function isVisible(p: EnrichedPerson): boolean {
  const nw = p.netWorth;
  return typeof nw === 'number' && nw > 0;
}

// Attach the common Korean name (see Person.commonNameKo) and list it as an
// alias, so site search and JSON-LD pick it up too.
function withCommonName(p: EnrichedPerson): EnrichedPerson {
  const common = (commonNamesKo as Record<string, string>)[p.id];
  if (!common || common === p.nameKo) return p;
  const aliases = p.aliasesKo ?? [];
  return {
    ...p,
    commonNameKo: common,
    aliasesKo: aliases.includes(common) ? aliases : [common, ...aliases],
  };
}

function load() {
  if (_people) return;
  const raw = fs.readFileSync(enrichedBillionairesPath(), 'utf-8');
  const all = JSON.parse(raw) as EnrichedPerson[];
  _people = all.filter(isVisible).map(withCommonName);
  _byId = new Map(_people.map((p) => [p.id, p]));
}

export function getAllEnrichedPeople(): EnrichedPerson[] {
  load();
  return _people!;
}

export function getEnrichedPersonById(id: string): EnrichedPerson | undefined {
  load();
  return _byId!.get(id);
}
