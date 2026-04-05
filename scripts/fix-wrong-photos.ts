import * as fs from 'fs';
import * as path from 'path';

const DATA_FILE = path.join(__dirname, '..', 'src', 'lib', 'data', 'billionaires.ts');

function makeAvatarUrl(name: string): string {
  // Remove apostrophes, special characters; replace spaces with +
  const cleaned = name
    .replace(/\\'/g, '') // escaped apostrophes in source
    .replace(/'/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '+');
  return `https://ui-avatars.com/api/?name=${cleaned}&size=200&background=random&bold=true`;
}

function getLastName(name: string): string {
  // Handle special cases
  const cleaned = name.replace(/\\'/g, "'");
  const parts = cleaned.split(/\s+/);
  return parts[parts.length - 1].toLowerCase();
}

function extractFilenameFromUrl(url: string): string {
  try {
    // Get the last path segment, decode it
    const decoded = decodeURIComponent(url);
    const parts = decoded.split('/');
    return parts[parts.length - 1];
  } catch {
    const parts = url.split('/');
    return parts[parts.length - 1];
  }
}

function isBadPhoto(filename: string, name: string): { bad: boolean; reason: string } {
  const fl = filename.toLowerCase();
  const lastNameLower = getLastName(name).toLowerCase();

  // Flag/emblem/coat of arms/seal patterns
  if (/flag_of_/i.test(filename)) return { bad: true, reason: 'Flag image' };
  if (/emblem_of_/i.test(filename)) return { bad: true, reason: 'Emblem image' };
  if (/coat_of_arms/i.test(fl)) return { bad: true, reason: 'Coat of Arms image' };
  if (/seal_of_/i.test(filename)) return { bad: true, reason: 'Seal image' };

  // Logo patterns (case insensitive)
  if (/_logo|logo_|_ci\b|wordmark/i.test(filename)) return { bad: true, reason: 'Logo image' };

  // Map patterns
  if (/map_of_/i.test(filename)) return { bad: true, reason: 'Map image' };

  // Placeholder patterns
  if (/replace_this_image/i.test(filename)) return { bad: true, reason: 'Placeholder image' };
  if (/no-pic/i.test(filename)) return { bad: true, reason: 'Forbes no-pic placeholder' };

  // SVG files (logos, flags, icons)
  if (/\.svg/i.test(fl)) return { bad: true, reason: 'SVG file (likely logo/flag/icon)' };

  // Building/headquarters patterns - but only if person's last name is NOT in the filename
  if (/headquarters|_hq\b|building|tower/i.test(fl)) {
    if (!fl.includes(lastNameLower)) {
      return { bad: true, reason: 'Building/headquarters image' };
    }
  }

  return { bad: false, reason: '' };
}

function extractPersonNameFromFilename(filename: string): string | null {
  // Look for patterns like "John_Smith" or "First_Middle_Last" in filename
  // Match sequences of capitalized words separated by underscores
  const match = filename.match(/([A-Z][a-z]+(?:_[A-Z][a-z]+)+)/);
  if (match) return match[1];
  return null;
}

function main() {
  const content = fs.readFileSync(DATA_FILE, 'utf-8');

  // Parse each entry - match the pattern for name and photoUrl
  const entryRegex = /\{\s*id:\s*'[^']*',\s*name:\s*'([^']*(?:\\'[^']*)*)',(?:\s*nameKo:\s*'[^']*',)?\s*birthday:\s*'[^']*',\s*netWorth:\s*[\d.]+,\s*nationality:\s*'[^']*',\s*industry:\s*'[^']*',\s*gender:\s*'[^']*',\s*source:\s*'[^']*(?:\\'[^']*)*',\s*photoUrl:\s*'([^']*)'\s*\}/g;

  let fixCount = 0;
  const warnings: string[] = [];
  let newContent = content;

  let match;
  while ((match = entryRegex.exec(content)) !== null) {
    const name = match[1].replace(/\\'/g, "'");
    const photoUrl = match[2];

    // Skip entries already using avatar placeholder
    if (photoUrl.includes('ui-avatars.com')) continue;

    const filename = extractFilenameFromUrl(photoUrl);
    const result = isBadPhoto(filename, name);

    if (result.bad) {
      const avatarUrl = makeAvatarUrl(name);
      // Replace this specific photoUrl in the content
      newContent = newContent.replace(photoUrl, avatarUrl);
      fixCount++;
      console.log(`FIXED [${result.reason}]: ${name}`);
      console.log(`  Old: ...${filename.slice(0, 80)}`);
      console.log(`  New: ${avatarUrl}`);
      console.log();
    }

    // Check for wrong-person photos (name mismatch in filename)
    const filenamePersonName = extractPersonNameFromFilename(filename);
    if (filenamePersonName && !result.bad) {
      const filenameParts = filenamePersonName.split('_').map(p => p.toLowerCase());
      const personLastName = getLastName(name);
      const personFirstName = name.split(/\s+/)[0].toLowerCase().replace(/'/g, '');
      const personNameParts = name.toLowerCase().replace(/'/g, '').split(/\s+/);

      // Check if any part of the person's name appears in the filename name
      const hasMatch = personNameParts.some(part =>
        filenameParts.some(fp => fp === part || part === fp)
      );

      if (!hasMatch) {
        // Double check: maybe last name matches partially
        const lastNameInFile = filenameParts[filenameParts.length - 1];
        if (lastNameInFile !== personLastName && !personLastName.includes(lastNameInFile)) {
          warnings.push(
            `WARNING: Possible wrong person photo for "${name}":\n` +
            `  Filename person: ${filenamePersonName}\n` +
            `  URL: ${photoUrl.slice(0, 120)}...`
          );
        }
      }
    }
  }

  if (fixCount > 0) {
    fs.writeFileSync(DATA_FILE, newContent, 'utf-8');
    console.log(`\n========================================`);
    console.log(`Total photos fixed: ${fixCount}`);
    console.log(`========================================\n`);
  } else {
    console.log('No bad photos found to fix.');
  }

  if (warnings.length > 0) {
    console.log(`\n========================================`);
    console.log(`WRONG-PERSON WARNINGS (${warnings.length}):`);
    console.log(`========================================`);
    warnings.forEach(w => {
      console.log(w);
      console.log();
    });
  }
}

main();
