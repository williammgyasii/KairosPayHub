import { describe, expect, it } from 'vitest'
import { memberRolePolicy } from '@/lib/member-role-policy'

describe('memberRolePolicy', () => {
  it('does not let a fellowship leader change their own role', () => {
    const policy = memberRolePolicy({
      actorMemberId: 'fl-1',
      actorRole: 'FellowshipLeader',
      subjectMemberId: 'fl-1',
      subjectPosition: 'FellowshipLeader',
    })
    expect(policy.canEditPosition).toBe(false)
  })

  it('lets a fellowship leader change a cell member to cell leader', () => {
    const policy = memberRolePolicy({
      actorMemberId: 'fl-1',
      actorRole: 'FellowshipLeader',
      subjectMemberId: 'm-1',
      subjectPosition: 'Member',
    })
    expect(policy.canEditPosition).toBe(true)
    expect(policy.assignablePositions).toEqual(['Member', 'CellLeader'])
  })

  it('does not let a fellowship leader assign fellowship leader to a cell member', () => {
    const policy = memberRolePolicy({
      actorMemberId: 'fl-1',
      actorRole: 'FellowshipLeader',
      subjectMemberId: 'm-1',
      subjectPosition: 'Member',
    })
    expect(policy.assignablePositions).not.toContain('FellowshipLeader')
  })

  it('lets a pastor change another member’s role across the template', () => {
    const policy = memberRolePolicy({
      actorMemberId: 'pastor-1',
      actorRole: 'Pastor',
      subjectMemberId: 'm-1',
      subjectPosition: 'Member',
    })
    expect(policy.canEditPosition).toBe(true)
    expect(policy.assignablePositions).toContain('FellowshipLeader')
  })
})
