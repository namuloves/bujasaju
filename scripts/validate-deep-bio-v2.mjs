import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const bioDir = path.join(root, 'public', 'deep-bios-v2');
const people = JSON.parse(
  fs.readFileSync(path.join(root, 'public', 'billionaires.json'), 'utf8'),
);
const peopleById = new Map(people.map((person) => [String(person.id), person]));
const requestedIds = process.argv.slice(2);
const files = requestedIds.length
  ? requestedIds.map((id) => `${id}.json`)
  : fs.readdirSync(bioDir).filter((file) => /^\d+\.json$/.test(file));

const requiredText = (value) => typeof value === 'string' && value.trim().length > 0;
const hasSource = (value) =>
  requiredText(value) &&
  (value.includes('http://') ||
    value.includes('https://') ||
    /\b(Wikipedia|Forbes|Bloomberg|Reuters|BBC|FT|WSJ|NYT)\b/i.test(value));

function validate(file) {
  const errors = [];
  const warnings = [];
  const fileId = file.replace(/\.json$/, '');
  const filePath = path.join(bioDir, file);
  let bio;

  try {
    bio = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return { file, errors: [`Invalid JSON: ${error.message}`], warnings };
  }

  const person = peopleById.get(fileId);
  if (!person) errors.push('ID does not exist in public/billionaires.json');
  if (String(bio.id) !== fileId) errors.push(`bio.id (${bio.id}) does not match filename`);
  if (person && bio.name !== person.name) {
    warnings.push(`Name differs from database: "${bio.name}" vs "${person.name}"`);
  }

  for (const field of ['name', 'nameKo', 'nationality', 'industry']) {
    if (!requiredText(bio[field])) errors.push(`Missing ${field}`);
  }

  const childhood = bio.childhood ?? {};
  for (const field of ['birthPlaceKo', 'familyBackgroundKo', 'earlyLifeKo', 'capitalTypeKo']) {
    if (!requiredText(childhood[field])) errors.push(`Missing childhood.${field}`);
  }
  if (!hasSource(childhood.source)) warnings.push('childhood.source is missing or not source-like');

  if (!['self-made', 'inherited', 'mixed', 'political'].includes(bio.capitalOrigin?.typeKo)) {
    errors.push('Invalid capitalOrigin.typeKo');
  }
  if (!requiredText(bio.capitalOrigin?.explanationKo)) {
    errors.push('Missing capitalOrigin.explanationKo');
  }

  if (!Array.isArray(bio.careerTimeline) || bio.careerTimeline.length < 5) {
    errors.push('careerTimeline must contain at least 5 entries');
  } else {
    for (const [index, event] of bio.careerTimeline.entries()) {
      if (!Number.isInteger(event.year)) errors.push(`careerTimeline[${index}].year is invalid`);
      if (!Number.isFinite(event.age)) errors.push(`careerTimeline[${index}].age is invalid`);
      if (!requiredText(event.eventKo)) errors.push(`Missing careerTimeline[${index}].eventKo`);
      if (!requiredText(event.whyItMatteredKo)) {
        errors.push(`Missing careerTimeline[${index}].whyItMatteredKo`);
      }
      if (!hasSource(event.source)) warnings.push(`careerTimeline[${index}].source is weak`);
    }
    const years = bio.careerTimeline
      .map((event) => event.year)
      .filter(Number.isInteger)
      .sort((a, b) => a - b);
    for (let index = 1; index < years.length; index += 1) {
      const gap = years[index] - years[index - 1];
      if (gap > 10) {
        errors.push(
          `careerTimeline has a ${gap}-year gap between ${years[index - 1]} and ${years[index]}`,
        );
      }
    }
  }

  if (!Array.isArray(bio.turningPoints) || bio.turningPoints.length < 2) {
    errors.push('turningPoints must contain at least 2 entries');
  }

  for (const field of [
    'coreBusinessKo',
    'moatKo',
    'luckVsSkillKo',
    'politicalCapitalKo',
    'capitalHistoryKo',
  ]) {
    if (!requiredText(bio.moneyMechanics?.[field])) errors.push(`Missing moneyMechanics.${field}`);
  }

  if (!Array.isArray(bio.failures) || bio.failures.length < 3) {
    errors.push('failures must contain at least 3 entries');
  } else {
    for (const [index, failure] of bio.failures.entries()) {
      if (!requiredText(failure.descriptionKo ?? failure.failureKo)) {
        errors.push(`Missing failures[${index}] Korean description`);
      }
      if (!requiredText(failure.howTheyOvercameKo)) {
        errors.push(`Missing failures[${index}].howTheyOvercameKo`);
      }
      if (!requiredText(failure.lessonKo)) errors.push(`Missing failures[${index}].lessonKo`);
      if (!hasSource(failure.source)) warnings.push(`failures[${index}].source is weak`);
    }
  }

  for (const field of [
    'observedTraitsKo',
    'leadershipStyleKo',
    'conflictBehaviorKo',
    'knownQuirksKo',
  ]) {
    if (!requiredText(bio.characterKo?.[field])) errors.push(`Missing characterKo.${field}`);
  }

  if (person?.birthday && Array.isArray(bio.careerTimeline)) {
    const birthYear = Number(person.birthday.slice(0, 4));
    for (const [index, event] of bio.careerTimeline.entries()) {
      if (
        Number.isInteger(event.year) &&
        Number.isFinite(event.age) &&
        Math.abs(event.age - (event.year - birthYear)) > 1
      ) {
        errors.push(
          `careerTimeline[${index}] age ${event.age} conflicts with birth year ${birthYear}`,
        );
      }
    }
  }

  return { file, errors, warnings };
}

let failed = 0;
for (const file of files) {
  const result = validate(file);
  if (result.errors.length) failed += 1;
  const status = result.errors.length ? 'FAIL' : 'PASS';
  console.log(`${status} ${file}`);
  for (const error of result.errors) console.log(`  error: ${error}`);
  for (const warning of result.warnings) console.log(`  warning: ${warning}`);
}

console.log(`\nValidated ${files.length} file(s); ${failed} failed.`);
process.exitCode = failed ? 1 : 0;
