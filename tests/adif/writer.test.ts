import { describe, it, expect } from 'vitest';
import { serializeAdif, updateRecords } from '../../src/adif/writer.js';
import { parseAdif } from '../../src/adif/parser.js';
import type { AdifFile } from '../../src/adif/types.js';

const SIMPLE_FILE: AdifFile = {
  headerText: 'Test header\n<ADIF_VER:5>3.1.4 ',
  records: [
    { fields: [{ name: 'CALL', value: 'W1AW' }, { name: 'BAND', value: '40m' }] },
    { fields: [{ name: 'CALL', value: 'K1TTT' }, { name: 'BAND', value: '20m' }] },
  ],
};

describe('updateRecords', () => {
  it('adds SOTA_REF to all records when absent', () => {
    const result = updateRecords(SIMPLE_FILE, 'W2/WE-003');
    for (const rec of result.records) {
      const sota = rec.fields.find((f) => f.name === 'SOTA_REF');
      expect(sota?.value).toBe('W2/WE-003');
    }
  });

  it('replaces existing SOTA_REF in all records', () => {
    const file: AdifFile = {
      headerText: '',
      records: [
        { fields: [{ name: 'CALL', value: 'W1AW' }, { name: 'SOTA_REF', value: 'G/LD-003' }] },
      ],
    };
    const result = updateRecords(file, 'W2/WE-003');
    const sota = result.records[0].fields.find((f) => f.name === 'SOTA_REF');
    expect(sota?.value).toBe('W2/WE-003');
    expect(result.records[0].fields.filter((f) => f.name === 'SOTA_REF')).toHaveLength(1);
  });

  it('adds a single POTA_REF to all records', () => {
    const result = updateRecords(SIMPLE_FILE, undefined, ['K-5033']);
    for (const rec of result.records) {
      const pota = rec.fields.find((f) => f.name === 'POTA_REF');
      expect(pota?.value).toBe('K-5033');
    }
  });

  it('uses POTA_REF_LIST for multiple parks, comma-delimited', () => {
    const result = updateRecords(SIMPLE_FILE, undefined, ['K-5033', 'K-5034']);
    const potaList = result.records[0].fields.find((f) => f.name === 'POTA_REF_LIST');
    expect(potaList?.value).toBe('K-5033,K-5034');
    expect(result.records[0].fields.find((f) => f.name === 'POTA_REF')).toBeUndefined();
  });

  it('replaces existing POTA_REF with a new single ref', () => {
    const file: AdifFile = {
      headerText: '',
      records: [
        { fields: [{ name: 'CALL', value: 'W1AW' }, { name: 'POTA_REF', value: 'K-9999' }] },
      ],
    };
    const result = updateRecords(file, undefined, ['K-5033']);
    const pota = result.records[0].fields.find((f) => f.name === 'POTA_REF');
    expect(pota?.value).toBe('K-5033');
    expect(result.records[0].fields.filter((f) => f.name === 'POTA_REF')).toHaveLength(1);
  });

  it('removes existing POTA_REF_LIST when replacing with a single ref', () => {
    const file: AdifFile = {
      headerText: '',
      records: [
        { fields: [{ name: 'CALL', value: 'W1AW' }, { name: 'POTA_REF_LIST', value: 'K-9998,K-9999' }] },
      ],
    };
    const result = updateRecords(file, undefined, ['K-5033']);
    expect(result.records[0].fields.find((f) => f.name === 'POTA_REF')?.value).toBe('K-5033');
    expect(result.records[0].fields.find((f) => f.name === 'POTA_REF_LIST')).toBeUndefined();
  });

  it('does not add any fields when called with no refs', () => {
    const result = updateRecords(SIMPLE_FILE);
    expect(result.records[0].fields).toHaveLength(SIMPLE_FILE.records[0].fields.length);
    expect(result.records[0].fields.find((f) => f.name === 'SOTA_REF')).toBeUndefined();
    expect(result.records[0].fields.find((f) => f.name === 'POTA_REF')).toBeUndefined();
    expect(result.records[0].fields.find((f) => f.name === 'POTA_REF_LIST')).toBeUndefined();
  });

  it('does not mutate the original file', () => {
    updateRecords(SIMPLE_FILE, 'W2/WE-003', ['K-5033']);
    expect(SIMPLE_FILE.records[0].fields.find((f) => f.name === 'SOTA_REF')).toBeUndefined();
  });
});

describe('serializeAdif', () => {
  it('includes the header text and EOH marker', () => {
    const out = serializeAdif(SIMPLE_FILE);
    expect(out).toContain('ADIF_VER');
    expect(out).toContain('<EOH>');
  });

  it('includes EOR markers for each record', () => {
    const out = serializeAdif(SIMPLE_FILE);
    const eorCount = (out.match(/<EOR>/gi) ?? []).length;
    expect(eorCount).toBe(2);
  });

  it('serializes field values with correct length specifiers', () => {
    const out = serializeAdif(SIMPLE_FILE);
    expect(out).toContain('<CALL:4>W1AW');
    expect(out).toContain('<CALL:5>K1TTT');
  });

  it('omits header section when headerText is empty', () => {
    const file: AdifFile = { headerText: '', records: SIMPLE_FILE.records };
    const out = serializeAdif(file);
    expect(out).not.toContain('<EOH>');
    expect(out).toContain('<EOR>');
  });

  it('round-trips a parsed file correctly', () => {
    const original = '<ADIF_VER:5>3.1.4 <EOH>\n\n<CALL:4>W1AW <BAND:3>40m <EOR>\n';
    const parsed = parseAdif(original);
    const serialized = serializeAdif(parsed);
    const reparsed = parseAdif(serialized);

    expect(reparsed.records).toHaveLength(parsed.records.length);
    const origCall = parsed.records[0].fields.find((f) => f.name === 'CALL');
    const newCall = reparsed.records[0].fields.find((f) => f.name === 'CALL');
    expect(newCall?.value).toBe(origCall?.value);
  });
});
