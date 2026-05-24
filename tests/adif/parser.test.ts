import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseAdif } from '../../src/adif/parser.js';

const fixturesDir = join(import.meta.dirname, '../../fixtures');

function fixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf-8');
}

describe('parseAdif', () => {
  it('parses a valid ADIF file with header and two records', () => {
    const result = parseAdif(fixture('valid.adi'));
    expect(result.records).toHaveLength(2);
    expect(result.headerText).toContain('ADIF_VER');
  });

  it('extracts field names in uppercase', () => {
    const result = parseAdif(fixture('valid.adi'));
    const names = result.records[0].fields.map((f) => f.name);
    expect(names).toContain('CALL');
    expect(names).toContain('QSO_DATE');
    expect(names).toContain('MODE');
  });

  it('extracts field values correctly', () => {
    const result = parseAdif(fixture('valid.adi'));
    const call = result.records[0].fields.find((f) => f.name === 'CALL');
    expect(call?.value).toBe('W1AW');
  });

  it('parses a file without a header', () => {
    const result = parseAdif(fixture('no_header.adi'));
    expect(result.headerText).toBe('');
    expect(result.records).toHaveLength(1);
  });

  it('parses fields with type indicators (e.g. <FIELD:5:S>value)', () => {
    const content = '<ADIF_VER:5>3.1.4 <EOH>\n<CALL:4:S>W1AW <EOR>\n';
    const result = parseAdif(content);
    const call = result.records[0].fields.find((f) => f.name === 'CALL');
    expect(call?.value).toBe('W1AW');
  });

  it('handles case-insensitive EOH and EOR markers', () => {
    const content = '<adif_ver:5>3.1.4 <eoh>\n<call:4>W1AW <eor>\n';
    const result = parseAdif(content);
    expect(result.records).toHaveLength(1);
  });

  it('parses a file with existing SOTA and POTA refs', () => {
    const result = parseAdif(fixture('with_refs.adi'));
    const sota = result.records[0].fields.find((f) => f.name === 'SOTA_REF');
    const pota = result.records[0].fields.find((f) => f.name === 'POTA_REF');
    expect(sota?.value).toBe('W2/WE-003');
    expect(pota?.value).toBe('K-1234');
  });

  it('throws for a file with no EOR or EOH markers', () => {
    expect(() => parseAdif('this is not adif')).toThrow(
      'Not a valid ADIF file',
    );
  });

  it('returns empty records array for a header-only file', () => {
    const content = '<ADIF_VER:5>3.1.4 <EOH>\n';
    const result = parseAdif(content);
    expect(result.records).toHaveLength(0);
  });

  it('skips records with no fields', () => {
    const content = '<EOH>\n<EOR>\n<CALL:4>W1AW <EOR>\n';
    const result = parseAdif(content);
    expect(result.records).toHaveLength(1);
  });
});
