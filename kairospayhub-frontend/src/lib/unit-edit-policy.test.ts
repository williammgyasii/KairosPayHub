import { describe, expect, it } from 'vitest'
import { unitEditPolicy } from '@/lib/unit-edit-policy'

describe('unitEditPolicy', () => {
  it('gives managers full edit on any unit', () => {
    const policy = unitEditPolicy({
      canManageChurch: true,
      actorScopeNodeId: null,
      unitId: 'cell-a',
    })
    expect(policy.canRename).toBe(true)
    expect(policy.canChangeLeader).toBe(true)
    expect(policy.renameOnly).toBe(false)
  })

  it('allows a scoped leader to rename only their own unit', () => {
    const own = unitEditPolicy({
      canManageChurch: false,
      actorScopeNodeId: 'cell-a',
      unitId: 'cell-a',
    })
    expect(own.canRename).toBe(true)
    expect(own.canChangeLeader).toBe(false)
    expect(own.renameOnly).toBe(true)

    const other = unitEditPolicy({
      canManageChurch: false,
      actorScopeNodeId: 'cell-a',
      unitId: 'cell-b',
    })
    expect(other.canRename).toBe(false)
    expect(other.canChangeLeader).toBe(false)
  })
})
