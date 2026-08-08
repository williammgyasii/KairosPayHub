/** Age in whole years from an ISO date string (yyyy-MM-dd). */
export function ageFromDateOfBirth(
  dateOfBirth: string | null | undefined,
  today = new Date(),
): number | null {
  if (!dateOfBirth?.trim()) return null

  const [year, month, day] = dateOfBirth.split('-').map(Number)
  if (!year || !month || !day) return null

  let age = today.getFullYear() - year
  const hadBirthdayThisYear =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day)
  if (!hadBirthdayThisYear) age -= 1

  return age >= 0 ? age : null
}

export function formatMemberAge(
  dateOfBirth: string | null | undefined,
  storedAge: number | null | undefined,
): string {
  const fromDob = ageFromDateOfBirth(dateOfBirth)
  if (fromDob != null) return String(fromDob)
  if (storedAge != null) return String(storedAge)
  return ''
}
