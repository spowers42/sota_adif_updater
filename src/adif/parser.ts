import type { AdifField, AdifFile, AdifRecord } from './types.js';

function parseFields(text: string): AdifField[] {
  const fields: AdifField[] = [];
  const tagRegex = /<([^>]+)>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(text)) !== null) {
    const tagContent = match[1];
    const colonIdx = tagContent.indexOf(':');
    if (colonIdx === -1) continue; // no length specifier — skip markers like EOR/EOH

    const name = tagContent.slice(0, colonIdx).toUpperCase();
    const rest = tagContent.slice(colonIdx + 1);
    const length = parseInt(rest.split(':')[0], 10);

    if (isNaN(length)) continue;

    const valueStart = match.index + match[0].length;
    const value = text.slice(valueStart, valueStart + length);
    fields.push({ name, value });
    tagRegex.lastIndex = valueStart + length;
  }

  return fields;
}

function parseRecords(body: string): AdifRecord[] {
  const records: AdifRecord[] = [];
  const eorRegex = /<EOR>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = eorRegex.exec(body)) !== null) {
    const recordText = body.slice(lastIndex, match.index);
    const fields = parseFields(recordText);
    if (fields.length > 0) {
      records.push({ fields });
    }
    lastIndex = match.index + match[0].length;
  }

  return records;
}

export function parseAdif(content: string): AdifFile {
  const eohMatch = /<EOH>/i.exec(content);

  if (!eohMatch) {
    const hasRecords = /<EOR>/i.test(content);
    if (!hasRecords) {
      throw new Error('Not a valid ADIF file: no <EOR> or <EOH> markers found');
    }
    return {
      headerText: '',
      records: parseRecords(content),
    };
  }

  const eohIndex = eohMatch.index;
  const headerText = content.slice(0, eohIndex);
  const body = content.slice(eohIndex + eohMatch[0].length);

  return {
    headerText,
    records: parseRecords(body),
  };
}
