import { describe, expect, it } from 'vitest'
import {
  membershipStickyColumnIds,
  membershipStickyColumnLeft,
  membershipStickyColumnWidth,
  membershipStickyTierForWidth,
  MEMBERSHIP_STICKY_MEMBER_WIDTH,
  MEMBERSHIP_STICKY_MEMBER_WIDTH_NARROW,
} from './membership-table-sticky'

describe('membership-table-sticky', () => {
  it('keeps name sticky on every viewport width', () => {
    expect(membershipStickyTierForWidth(320)).toBe('member')
    expect(membershipStickyTierForWidth(1280)).toBe('member')
    expect(membershipStickyColumnIds()).toEqual(['member'])
    expect(membershipStickyColumnLeft('member')).toBe(0)
    expect(membershipStickyColumnLeft('email')).toBeNull()
  })

  it('uses a narrower sticky name width below 768px', () => {
    expect(membershipStickyColumnWidth('member', 375)).toBe(MEMBERSHIP_STICKY_MEMBER_WIDTH_NARROW)
    expect(membershipStickyColumnWidth('member', 1024)).toBe(MEMBERSHIP_STICKY_MEMBER_WIDTH)
  })
})
