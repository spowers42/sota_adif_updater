import type { AdifField, AdifFile } from './types.js';

function serializeField(field: AdifField): string {
  return `<${field.name.toUpperCase()}:${field.value.length}>${field.value}`;
}

export function serializeAdif(file: AdifFile): string {
  let output = '';

  if (file.headerText !== '') {
    output += file.headerText + '<EOH>\n\n';
  }

  for (const record of file.records) {
    const fieldStrs = record.fields.map(serializeField);
    output += fieldStrs.join(' ') + ' <EOR>\n';
  }

  return output;
}

export function updateRecords(
  file: AdifFile,
  sotaRef?: string,
  potaRefs: string[] = [],
): AdifFile {
  const updatedRecords = file.records.map((record) => {
    const fields = record.fields.filter(
      (f) => f.name !== 'SOTA_REF' && f.name !== 'POTA_REF',
    );

    if (sotaRef) {
      fields.push({ name: 'SOTA_REF', value: sotaRef });
    }

    if (potaRefs.length > 0) {
      fields.push({ name: 'POTA_REF', value: potaRefs.join(',') });
    }

    return { fields };
  });

  return { ...file, records: updatedRecords };
}
