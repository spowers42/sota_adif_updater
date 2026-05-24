import { input, confirm } from '@inquirer/prompts';
import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseAdif } from '../adif/parser.js';
import { serializeAdif, updateRecords } from '../adif/writer.js';
import type { AdifFile, AdifRecord } from '../adif/types.js';
import { formatSotaRef, validateSotaRef } from '../validation/sota.js';
import { formatPotaRef, validatePotaRef } from '../validation/pota.js';

function existingValues(records: AdifRecord[], ...fieldNames: string[]): string[] {
  const names = new Set(fieldNames.map((n) => n.toUpperCase()));
  return [
    ...new Set(
      records.flatMap((r) => r.fields.filter((f) => names.has(f.name)).map((f) => f.value)),
    ),
  ];
}

function expandPath(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return join(homedir(), filePath.slice(2));
  }
  return filePath;
}

async function askForFile(): Promise<{ filePath: string; parsed: AdifFile }> {
  while (true) {
    const raw = await input({ message: 'Path to ADIF file:' });
    const filePath = expandPath(raw.trim());

    try {
      const content = await readFile(filePath, 'utf-8');
      const parsed = parseAdif(content);
      const count = parsed.records.length;
      console.log(
        `\nValid ADIF file — ${count} QSO record${count === 1 ? '' : 's'} found.\n`,
      );
      if (count === 0) {
        console.log('Warning: file contains no QSO records. Changes will have no effect.\n');
      }
      return { filePath, parsed };
    } catch (err) {
      console.error(
        `\nError: ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }
  }
}

async function askForSotaRef(records: AdifRecord[]): Promise<string | undefined> {
  const existing = existingValues(records, 'SOTA_REF');

  let proceed: boolean;
  if (existing.length > 0) {
    console.log(`\nExisting SOTA_REF found: ${existing.join(', ')}`);
    proceed = await confirm({
      message: 'Replace existing SOTA references in all records?',
      default: false,
    });
  } else {
    proceed = await confirm({ message: 'Add a SOTA reference to all records?', default: false });
  }

  if (!proceed) return undefined;

  const ref = await input({
    message: 'SOTA reference (e.g. W2/WE-003):',
    validate: (value: string) => {
      if (!value.trim()) return 'SOTA reference is required';
      if (!validateSotaRef(value)) return 'Invalid format — expected e.g. W2/WE-003 or G/LD-003';
      return true;
    },
  });

  return formatSotaRef(ref);
}

async function askForPotaRefs(records: AdifRecord[]): Promise<string[]> {
  const existing = existingValues(records, 'POTA_REF', 'POTA_REF_LIST');

  let proceed: boolean;
  if (existing.length > 0) {
    console.log(`\nExisting POTA reference(s) found: ${existing.join(', ')}`);
    proceed = await confirm({
      message: 'Replace existing POTA references in all records?',
      default: false,
    });
  } else {
    proceed = await confirm({ message: 'Add a POTA reference to all records?', default: false });
  }

  if (!proceed) return [];

  const refs: string[] = [];

  const first = await input({
    message: 'POTA reference (e.g. US-1234):',
    validate: (value: string) => {
      if (!value.trim()) return 'POTA reference is required';
      if (!validatePotaRef(value)) return 'Invalid format — expected e.g. US-1234 or VE-5082@CA-AB';
      return true;
    },
  });
  refs.push(formatPotaRef(first));

  while (true) {
    const more = await confirm({ message: 'Add another POTA reference?', default: false });
    if (!more) break;

    const next = await input({
      message: 'POTA reference (e.g. US-1234):',
      validate: (value: string) => {
        if (!value.trim()) return 'POTA reference is required';
        if (!validatePotaRef(value)) return 'Invalid format — expected e.g. US-1234 or VE-5082@CA-AB';
        return true;
      },
    });
    refs.push(formatPotaRef(next));
  }

  return refs;
}

export async function runFlow(): Promise<void> {
  try {
    console.log('SOTA/POTA ADIF Updater\n');

    const { filePath, parsed } = await askForFile();
    const sotaRef = await askForSotaRef(parsed.records);
    const potaRefs = await askForPotaRefs(parsed.records);

    if (!sotaRef && potaRefs.length === 0) {
      console.log('\nNo changes selected. Exiting.');
      return;
    }

    console.log('\nChanges to apply to all records:');
    if (sotaRef) console.log(`  SOTA_REF: ${sotaRef}`);
    if (potaRefs.length === 1) console.log(`  POTA_REF: ${potaRefs[0]}`);
    if (potaRefs.length > 1) console.log(`  POTA_REF_LIST: ${potaRefs.join(',')}`);
    console.log(`  Records affected: ${parsed.records.length}\n`);

    const apply = await confirm({ message: 'Apply these changes?', default: true });
    if (!apply) {
      console.log('\nCancelled. No changes made.');
      return;
    }

    const updated = updateRecords(parsed, sotaRef, potaRefs);
    const serialized = serializeAdif(updated);
    await writeFile(filePath, serialized, 'utf-8');

    console.log(`\nDone. Updated ${parsed.records.length} record${parsed.records.length === 1 ? '' : 's'} in ${filePath}`);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'ExitPromptError') {
      console.log('\nCancelled.');
      return;
    }
    throw err;
  }
}
