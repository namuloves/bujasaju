/**
 * Compare bio generation across GPT-4o, GPT-4o-mini, and Claude Haiku.
 *
 * Usage:
 *   npx tsx scripts/test-bio-models.ts
 *
 * Requires OPENAI_API_KEY and ANTHROPIC_API_KEY in .env.local
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Load .env.local manually (no dotenv dependency)
const envPath = resolve(import.meta.dirname || __dirname, '..', '.env.local');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m) {
    let val = m[2].trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[m[1]] = val;
  }
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface Person {
  name: string;
  nameKo?: string;
  industry: string;
  netWorth: number;
  nationality: string;
  source?: string;
  bio?: string;
  wealthOrigin?: string;
}

const SYSTEM_PROMPT = `You are a concise biographical writer for a billionaire database.
Given a person's name, industry, net worth, company/source, and any existing bio text,
write a 2-3 sentence bio in Korean that covers:
1. Who they are and what they're known for (company founded, role, etc.)
2. How they built their wealth (self-made, inherited, key business moves)
3. One interesting or distinguishing detail

Rules:
- Write in Korean, formal but approachable tone
- Be factual — only include claims grounded in the provided data
- If the existing bio is just a Forbes placeholder ("is #X on Forbes' list..."), ignore it
- Net worth is in billions USD
- Keep it under 150 characters if possible, max 200
- Do NOT start with the person's name — the UI already shows it`;

function buildUserPrompt(p: Person): string {
  return `Name: ${p.name}${p.nameKo ? ` (${p.nameKo})` : ''}
Industry: ${p.industry}
Net worth: $${p.netWorth}B
Nationality: ${p.nationality}
Source of wealth: ${p.source || 'Unknown'}
Wealth origin: ${p.wealthOrigin || 'Unknown'}
Existing bio: ${p.bio || 'None'}`;
}

// Test subjects
const people: Person[] = [
  {
    name: 'Cai Dongchen',
    nameKo: '차이둥천',
    industry: 'Pharmaceuticals',
    netWorth: 5.6,
    nationality: 'CN',
    source: 'Pharmaceuticals',
    bio: "Cai Dongchen is #1108 on Forbes' 2026 Billionaires list.",
    wealthOrigin: 'self-made',
  },
];

async function testOpenAI(model: string, person: Person): Promise<{ text: string; ms: number }> {
  const start = Date.now();
  const res = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(person) },
    ],
    max_tokens: 300,
    temperature: 0.3,
  });
  return {
    text: res.choices[0]?.message?.content?.trim() || '(empty)',
    ms: Date.now() - start,
  };
}

async function testClaude(person: Person): Promise<{ text: string; ms: number }> {
  const start = Date.now();
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(person) }],
  });
  const block = res.content[0];
  return {
    text: block.type === 'text' ? block.text.trim() : '(empty)',
    ms: Date.now() - start,
  };
}

async function main() {
  for (const person of people) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📌 ${person.name} (${person.nameKo})`);
    console.log(`   ${person.industry} | $${person.netWorth}B | ${person.source}`);
    console.log(`   Existing bio: ${person.bio?.slice(0, 80)}...`);
    console.log('='.repeat(60));

    const results = await Promise.allSettled([
      testOpenAI('gpt-4o', person),
      testOpenAI('gpt-4o-mini', person),
      testClaude(person),
    ]);

    const labels = ['🟢 GPT-4o', '🔵 GPT-4o-mini', '🟣 Claude Haiku'];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled') {
        console.log(`\n${labels[i]} (${r.value.ms}ms):`);
        console.log(`   ${r.value.text}`);
      } else {
        console.log(`\n${labels[i]}: ❌ ${(r.reason as Error).message?.slice(0, 80)}`);
      }
    }
  }
}

main().catch(console.error);
