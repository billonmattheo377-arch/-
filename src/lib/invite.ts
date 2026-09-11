export function normalizeInviteCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function isPlausibleInviteCode(value: string): boolean {
  return /^[A-Z0-9]{6,12}$/.test(normalizeInviteCode(value));
}
