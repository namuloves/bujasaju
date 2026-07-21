import fs from 'fs';
import type { EnrichedPerson } from '@/lib/saju/types';
import { enrichedBillionairesPath } from './paths';

let _people: EnrichedPerson[] | null = null;
let _byId: Map<string, EnrichedPerson> | null = null;

// Mirrors the client filter in enriched.ts: hide entries with netWorth=0
// (deceased founders, celebrities) everywhere — including direct profile
// links — so the visible roster is consistent.
function isVisible(p: EnrichedPerson): boolean {
  const nw = p.netWorth;
  return typeof nw === 'number' && nw > 0;
}

function load() {
  if (_people) return;
  const raw = fs.readFileSync(enrichedBillionairesPath(), 'utf-8');
  const all = JSON.parse(raw) as EnrichedPerson[];
  _people = all.filter(isVisible);
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
