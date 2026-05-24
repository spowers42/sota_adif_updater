import { describe, it, expect } from 'vitest';
import { validateSotaRef, formatSotaRef } from '../../src/validation/sota.js';

describe('validateSotaRef', () => {
  it.each([
    'W2/WE-003',
    'G/LD-003',
    'VK2/HU-071',
    'HS0/CB-001',
    'W7/AZ-123',
    'ZL/WL-042',
  ])('accepts valid ref: %s', (ref) => {
    expect(validateSotaRef(ref)).toBe(true);
  });

  it.each([
    'W2WE-003',       // missing slash
    'W2/WE003',       // missing hyphen
    'W2/WE-03',       // too few digits
    'W2/WE-1234',     // too many digits
    '/WE-003',        // empty prefix
    'W2/TOOLONG-003', // area code too long
    '',               // empty string
    'W2/WE-',         // missing number
  ])('rejects invalid ref: %s', (ref) => {
    expect(validateSotaRef(ref)).toBe(false);
  });

  it('trims whitespace before validating', () => {
    expect(validateSotaRef('  W2/WE-003  ')).toBe(true);
  });
});

describe('formatSotaRef', () => {
  it('uppercases the reference', () => {
    expect(formatSotaRef('w2/we-003')).toBe('W2/WE-003');
  });

  it('trims surrounding whitespace', () => {
    expect(formatSotaRef('  W2/WE-003  ')).toBe('W2/WE-003');
  });
});
