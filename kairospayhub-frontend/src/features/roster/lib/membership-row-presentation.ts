import { isPendingRosterStatus } from '@/lib/member-row-actions'

export const NEW_MEMBER_WITHIN_DAYS = 14

export type MembershipRowTone = 'pending' | 'you' | 'new' | 'default'

export function membershipRowTone(input: {
  rosterStatus?: string | null
  createdAt?: string | null
  now?: Date
  memberId?: string | null
  currentMemberId?: string | null
}): MembershipRowTone {
  if (isPendingRosterStatus(input.rosterStatus)) return 'pending'
  if (
    input.memberId &&
    input.currentMemberId &&
    input.memberId === input.currentMemberId
  ) {
    return 'you'
  }
  if (!input.createdAt) return 'default'
  const created = Date.parse(input.createdAt)
  if (Number.isNaN(created)) return 'default'
  const now = input.now ?? new Date()
  const ageMs = now.getTime() - created
  if (ageMs < 0) return 'default'
  const days = ageMs / 86_400_000
  return days <= NEW_MEMBER_WITHIN_DAYS ? 'new' : 'default'
}

export function membershipRowSortRank(tone: MembershipRowTone): number {
  if (tone === 'pending') return 0
  if (tone === 'new') return 1
  return 2
}

export function sortMembershipRows<T extends {
  member: string
  rosterStatus?: string | null
  createdAt?: string | null
}>(rows: T[], now?: Date): T[] {
  return [...rows].sort((a, b) => {
    const rankDelta =
      membershipRowSortRank(membershipRowTone({ ...a, now })) -
      membershipRowSortRank(membershipRowTone({ ...b, now }))
    if (rankDelta !== 0) return rankDelta
    return a.member.localeCompare(b.member)
  })
}

export function membershipRowToneClass(tone: MembershipRowTone): string {
  if (tone === 'pending') {
    return 'bg-amber-50/90 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:hover:bg-amber-950/60'
  }
  return ''
}

export function membershipNewBadgeClass(): string {
  return '!rounded-md border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
}

/** Dialable href, or null when the value is not a real number. */
export function membershipCallHref(phone: string): string | null {
  const trimmed = phone.trim()
  if (!trimmed) return null
  const compact = trimmed.replace(/[^\d+]/g, '')
  const digits = compact.replace(/\D/g, '')
  if (digits.length < 7) return null
  return `tel:${compact.startsWith('+') ? `+${digits}` : digits}`
}

export function membershipYouBadgeClass(): string {
  return '!rounded-md border-sky-200 bg-sky-100 text-sky-800 hover:bg-sky-100'
}

export function membershipStickyRowClass(tone: MembershipRowTone, odd: boolean): string {
  if (tone === 'pending') {
    return '!bg-amber-50 group-hover:!bg-amber-100 dark:!bg-amber-950/50 dark:group-hover:!bg-amber-950'
  }
  return odd
    ? '!bg-muted group-hover:!bg-muted/80'
    : '!bg-card group-hover:!bg-muted/10'
}
