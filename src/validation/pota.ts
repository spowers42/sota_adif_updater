// POTA references: <program>-<park-number>[@<ISO-3166-2-location>]  e.g. K-5033, VE-5082@CA-AB
const POTA_REF_REGEX = /^[A-Z]{1,4}-\d{4,5}(@[A-Z]{2}-[A-Z0-9]+)?$/i;

export function validatePotaRef(ref: string): boolean {
  return POTA_REF_REGEX.test(ref.trim());
}

export function formatPotaRef(ref: string): string {
  return ref.trim().toUpperCase();
}
