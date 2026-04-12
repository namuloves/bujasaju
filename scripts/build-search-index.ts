/**
 * Build a full-text search index from deep bio JSON files.
 *
 * Run: npx tsx scripts/build-search-index.ts
 *
 * Reads all public/deep-bios/*.json files and extracts searchable text
 * into a lightweight map: { [personId]: "concatenated searchable text" }.
 * The output is written to public/deep-bio-search.json for client-side use.
 */

import fs from 'fs';
import path from 'path';

const BIOS_DIR = path.join(process.cwd(), 'public', 'deep-bios');
const OUTPUT = path.join(process.cwd(), 'public', 'deep-bio-search.json');

function extractText(bio: Record<string, unknown>): string {
  const parts: string[] = [];

  // Childhood
  const ch = bio.childhood as Record<string, string> | null;
  if (ch) {
    for (const key of ['birthPlace', 'birthPlaceKo', 'familyBackground', 'familyBackgroundKo',
      'education', 'educationKo', 'earlyLife', 'earlyLifeKo']) {
      if (ch[key]) parts.push(ch[key]);
    }
  }

  // Career timeline
  const timeline = bio.careerTimeline as { event?: string; eventKo?: string }[] | undefined;
  if (timeline) {
    for (const entry of timeline) {
      if (entry.event) parts.push(entry.event);
      if (entry.eventKo) parts.push(entry.eventKo);
    }
  }

  // Failures
  const failures = bio.failures as { description?: string; descriptionKo?: string; lesson?: string; lessonKo?: string }[] | undefined;
  if (failures) {
    for (const f of failures) {
      if (f.description) parts.push(f.description);
      if (f.descriptionKo) parts.push(f.descriptionKo);
      if (f.lesson) parts.push(f.lesson);
      if (f.lessonKo) parts.push(f.lessonKo);
    }
  }

  // Quotes
  const quotes = bio.quotes as { text?: string; textKo?: string; context?: string; contextKo?: string }[] | undefined;
  if (quotes) {
    for (const q of quotes) {
      if (q.text) parts.push(q.text);
      if (q.textKo) parts.push(q.textKo);
      if (q.context) parts.push(q.context);
      if (q.contextKo) parts.push(q.contextKo);
    }
  }

  // Books
  const books = bio.books as { authored?: { title?: string; author?: string }[]; recommended?: { title?: string; author?: string }[] } | undefined;
  if (books) {
    for (const list of [books.authored, books.recommended]) {
      if (list) {
        for (const b of list) {
          if (b.title) parts.push(b.title);
          if (b.author) parts.push(b.author);
        }
      }
    }
  }

  // Personal traits
  const traits = bio.personalTraits as Record<string, string> | null;
  if (traits) {
    for (const key of ['knownFor', 'knownForKo', 'philanthropy', 'philanthropyKo',
      'controversies', 'controversiesKo']) {
      if (traits[key]) parts.push(traits[key]);
    }
  }

  // Name
  if (bio.name) parts.push(bio.name as string);

  return parts.join(' ').toLowerCase();
}

function main() {
  const files = fs.readdirSync(BIOS_DIR).filter(f => f.endsWith('.json'));
  const index: Record<string, string> = {};

  for (const file of files) {
    const id = file.replace('.json', '');
    const data = JSON.parse(fs.readFileSync(path.join(BIOS_DIR, file), 'utf-8'));
    index[id] = extractText(data);
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(index));

  const sizeMB = (Buffer.byteLength(JSON.stringify(index)) / 1024 / 1024).toFixed(2);
  console.log(`✓ Search index built: ${files.length} bios, ${sizeMB} MB → ${OUTPUT}`);
}

main();
