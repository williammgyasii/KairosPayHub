/** Normalize church country codes from API / legacy values. */
export function normalizeCountryCode(countryCode?: string | null): string {
  const normalized = countryCode?.trim().toUpperCase() ?? ''
  if (normalized === 'USA') return 'US'
  return normalized
}
