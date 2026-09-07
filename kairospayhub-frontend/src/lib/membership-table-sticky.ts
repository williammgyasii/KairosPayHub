/** Sticky Name column policy for membership roster tables. */
export const MEMBERSHIP_STICKY_MEMBER_WIDTH = 180
export const MEMBERSHIP_STICKY_MEMBER_WIDTH_NARROW = 148

export type MembershipStickyTier = 'member'

/** Name is always sticky; width tightens on narrow viewports. */
export function membershipStickyTierForWidth(_width: number): MembershipStickyTier {
  return 'member'
}

export function membershipStickyColumnIds(): string[] {
  return ['member']
}

export function membershipStickyColumnLeft(columnId: string): number | null {
  if (columnId !== 'member') return null
  return 0
}

export function membershipStickyColumnWidth(columnId: string, viewportWidth: number): number | null {
  if (columnId !== 'member') return null
  return viewportWidth < 768
    ? MEMBERSHIP_STICKY_MEMBER_WIDTH_NARROW
    : MEMBERSHIP_STICKY_MEMBER_WIDTH
}
