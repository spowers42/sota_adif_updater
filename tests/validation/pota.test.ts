import { describe, it, expect } from 'vitest';
import { validatePotaRef, formatPotaRef } from '../../src/validation/pota.js';

describe('validatePotaRef', () => {
  it.each([
    'K-5033',
    'K-50331',         // 5-digit park number
    'VE-5082',
    'G-0100',
    'DL-0001',
    'VE-5082@CA-AB',  // with ISO 3166-2 location
    'K-1234@US-CO',
  ])('accepts valid ref: %s', (ref) => {
    expect(validatePotaRef(ref)).toBe(true);
  });

  it.each([
    'K5033',           // missing hyphen
    'K-503',           // too few digits
    'K-503333',        // too many digits
    'TOOLONG-1234',    // program code too long
    '-1234',           // empty program
    '',                // empty string
    'K-1234@',         // trailing @ with no location
    'K-1234@X',        // incomplete location code
  ])('rejects invalid ref: %s', (ref) => {
    expect(validatePotaRef(ref)).toBe(false);
  });

  it('trims whitespace before validating', () => {
    expect(validatePotaRef('  K-5033  ')).toBe(true);
  });
});

describe('formatPotaRef', () => {
  it('uppercases the reference', () => {
    expect(formatPotaRef('k-5033')).toBe('K-5033');
  });

  it('uppercases a reference with location', () => {
    expect(formatPotaRef('ve-5082@ca-ab')).toBe('VE-5082@CA-AB');
  });

  it('trims surrounding whitespace', () => {
    expect(formatPotaRef('  K-5033  ')).toBe('K-5033');
  });
});
