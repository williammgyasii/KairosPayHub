import { describe, expect, it } from 'vitest'
import { canRemoveMember, pendingMemberActions } from '@/lib/member-row-actions'

describe('canRemoveMember', () => {
  it('hides remove on the current member’s own row', () => {
    expect(canRemoveMember('me', 'me')).toBe(false)
  })

  it('allows removing someone else', () => {
    expect(canRemoveMember('me', 'other')).toBe(true)
  })

  it('allows remove when the actor has no member id', () => {
    expect(canRemoveMember(null, 'other')).toBe(true)
  })
})

describe('pendingMemberActions', () => {
  it('shows Accept and Decline on a pending row', () => {
    expect(pendingMemberActions('Pending')).toEqual({ accept: true, decline: true })
  })

  it('hides Accept and Decline on an active row', () => {
    expect(pendingMemberActions('Active')).toEqual({ accept: false, decline: false })
    expect(pendingMemberActions(undefined)).toEqual({ accept: false, decline: false })
  })
})
