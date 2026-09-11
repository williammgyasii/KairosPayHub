export type GuestRiskLevel = 'clear' | 'watch' | 'flagged'

export type GuestRiskWarning = {
  tone: 'watch' | 'flagged'
  title: string
  reasons: string[]
}

export function guestRiskWarning(
  level?: string | null,
  reasons?: string[] | null,
): GuestRiskWarning | null {
  if (!level || level === 'clear') return null
  return {
    tone: level === 'flagged' ? 'flagged' : 'watch',
    title: level === 'flagged' ? 'Guest list looks padded' : 'Guest numbers look unusual',
    reasons: (reasons ?? []).filter((reason) => reason.trim().length > 0),
  }
}

export function guestRiskQueueHint(
  level?: string | null,
  reasons?: string[] | null,
): string | null {
  const warning = guestRiskWarning(level, reasons)
  if (!warning) return null
  return warning.reasons[0] ?? warning.title
}
