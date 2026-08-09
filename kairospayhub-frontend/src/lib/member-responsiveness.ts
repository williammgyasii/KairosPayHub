export type MemberResponsivenessLevel = 1 | 2 | 3 | 4 | 5

export const MEMBER_RESPONSIVENESS_OPTIONS: {
  value: MemberResponsivenessLevel
  label: string
}[] = [
  { value: 1, label: 'Cold' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Medium' },
  { value: 4, label: 'High' },
  { value: 5, label: 'Burning hot' },
]

export function normalizeMemberResponsiveness(value: number | null | undefined): MemberResponsivenessLevel {
  if (value == null || Number.isNaN(value)) return 3
  const clamped = Math.min(5, Math.max(1, Math.round(value)))
  return clamped as MemberResponsivenessLevel
}

export function memberResponsivenessLabel(level: MemberResponsivenessLevel): string {
  return MEMBER_RESPONSIVENESS_OPTIONS.find((option) => option.value === level)?.label ?? 'Medium'
}
