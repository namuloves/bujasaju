import fs from 'fs';
import path from 'path';
import type { EnrichedPerson } from '@/lib/saju/types';

let _people: EnrichedPerson[] | null = null;
let _byId: Map<string, EnrichedPerson> | null = null;

function load() {
  if (_people) return;
  const filePath = path.join(process.cwd(), 'public', 'enriched-billionaires.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  _people = JSON.parse(raw) as EnrichedPerson[];
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
