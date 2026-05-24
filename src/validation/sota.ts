// SOTA references: <ITU-prefix>/<area-code>-<3-digit-number>  e.g. W2/WE-003, G/LD-003, VK2/HU-071
const SOTA_REF_REGEX = /^[A-Z0-9]{1,8}\/[A-Z]{1,4}-\d{3}$/i;

export function validateSotaRef(ref: string): boolean {
  return SOTA_REF_REGEX.test(ref.trim());
}

export function formatSotaRef(ref: string): string {
  return ref.trim().toUpperCase();
}
