import { describe, expect, it } from 'vitest'
import {
  canCreateGivingProgram,
  canCreateSubGiving,
  canManageChurch,
  canManageMembers,
  displayName,
  isCellLeader,
  isPastor,
  isScopedLeader,
  needsOnboarding,
  rosterScopeRootNodeId,
  roleScopeBadgeLabel,
  type Me,
} from './me'

const notOnboarded: Me = { onboarded: false, email: 'p@example.com', name: null }

const onboarded: Me = {
  onboarded: true,
  id: 'u1',
  churchId: 'c1',
  churchName: 'Grace Assembly',
  churchLogoUrl: null,
  organizationId: 'o1',
  role: 'Pastor',
  legacyChurchId: null,
  email: 'p@example.com',
  name: 'Pastor Paul',
}

describe('needsOnboarding', () => {
  it('is true when the user is not onboarded', () => {
    expect(needsOnboarding(notOnboarded)).toBe(true)
  })

  it('is true when the pastor saved church details but not structure', () => {
    expect(
      needsOnboarding({
        onboarded: false,
        email: 'p@example.com',
        name: 'Pastor Paul',
        churchId: 'church-1',
        churchName: 'Grace',
        onboardingStep: 'structure',
        role: 'Pastor',
      }),
    ).toBe(true)
  })

  it('is false when the user is onboarded', () => {
    expect(needsOnboarding(onboarded)).toBe(false)
  })
})

describe('displayName', () => {
  it('prefers the name from /api/me', () => {
    expect(displayName(onboarded)).toBe('Pastor Paul')
  })

  it('falls back to the email when there is no name', () => {
    expect(displayName(notOnboarded, 'session@example.com')).toBe('p@example.com')
  })

  it('falls back to the session email when name and email are missing', () => {
    expect(
      displayName({ onboarded: false, email: null, name: null }, 'session@example.com'),
    ).toBe('session@example.com')
  })
})

describe('isPastor', () => {
  it('is true only for Pastor role', () => {
    expect(isPastor('Pastor')).toBe(true)
    expect(isPastor('PFCCManager')).toBe(false)
    expect(isPastor('CellLeader')).toBe(false)
  })
})

describe('canManageChurch', () => {
  it('is true for pastor and church admin', () => {
    expect(canManageChurch('Pastor')).toBe(true)
    expect(canManageChurch('ChurchAdmin')).toBe(true)
    expect(canManageChurch('PFCCManager')).toBe(false)
  })
})

describe('isCellLeader', () => {
  it('is true only for cell leaders', () => {
    expect(isCellLeader('CellLeader')).toBe(true)
    expect(isCellLeader('FellowshipLeader')).toBe(false)
    expect(isCellLeader('PFCCManager')).toBe(false)
  })
})

describe('isScopedLeader', () => {
  it('is true for PFCC and fellowship leaders', () => {
    expect(isScopedLeader('PFCCManager')).toBe(true)
    expect(isScopedLeader('FellowshipLeader')).toBe(true)
    expect(isScopedLeader('Pastor')).toBe(false)
  })
})

describe('canCreateSubGiving', () => {
  it('allows pastors, church admins, and PFCC managers', () => {
    expect(canCreateSubGiving('Pastor')).toBe(true)
    expect(canCreateSubGiving('ChurchAdmin')).toBe(true)
    expect(canCreateSubGiving('PFCCManager')).toBe(true)
    expect(canCreateSubGiving('FellowshipLeader')).toBe(false)
    expect(canCreateSubGiving('CellLeader')).toBe(false)
  })
})

describe('canCreateGivingProgram', () => {
  it('matches campaign and sub-giving create permissions', () => {
    expect(canCreateGivingProgram('Pastor')).toBe(true)
    expect(canCreateGivingProgram('ChurchAdmin')).toBe(true)
    expect(canCreateGivingProgram('PFCCManager')).toBe(true)
    expect(canCreateGivingProgram('FellowshipLeader')).toBe(false)
  })
})

describe('rosterScopeRootNodeId', () => {
  it('returns null for church managers', () => {
    expect(rosterScopeRootNodeId(onboarded)).toBeNull()
  })

  it('returns scope node for PFCC and fellowship leaders', () => {
    const pfcc: Me = {
      ...onboarded,
      role: 'PFCCManager',
      scopeNodeId: 'pfcc-1',
    }
    expect(rosterScopeRootNodeId(pfcc)).toBe('pfcc-1')
  })

  it('prefers roll-call scope for cell leaders', () => {
    const cellLeader: Me = {
      ...onboarded,
      role: 'CellLeader',
      scopeNodeId: 'other-cell',
      rollCallScopes: [{ scopeNodeId: 'cell-1', scopeUnitName: 'Cell 1' }],
    }
    expect(rosterScopeRootNodeId(cellLeader)).toBe('cell-1')
  })
})

describe('roleScopeBadgeLabel', () => {
  it('shows cell unit name for cell leaders', () => {
    const cellLeader: Me = {
      ...onboarded,
      role: 'CellLeader',
      scopeNodeId: 'cell-1',
      scopeUnitName: 'Zion Cell 1',
      rollCallScopes: [{ scopeNodeId: 'cell-1', scopeUnitName: 'Zion Cell 1' }],
    }
    expect(roleScopeBadgeLabel(cellLeader)).toBe('Zion Cell 1 leader')
  })

  it('shows fellowship unit name for fellowship leaders', () => {
    const fellowshipLeader: Me = {
      ...onboarded,
      role: 'FellowshipLeader',
      scopeNodeId: 'fellowship-1',
      scopeUnitName: 'Zion Fellowship',
    }
    expect(roleScopeBadgeLabel(fellowshipLeader)).toBe('Zion Fellowship leader')
  })

  it('falls back to readable role when scope name is missing', () => {
    expect(roleScopeBadgeLabel({ ...onboarded, role: 'CellLeader' })).toBe('Cell leader')
    expect(roleScopeBadgeLabel(onboarded)).toBe('Pastor')
  })
})

describe('canManageMembers', () => {
  it('allows pastors, church admins, and scoped roster leaders', () => {
    expect(canManageMembers('Pastor')).toBe(true)
    expect(canManageMembers('ChurchAdmin')).toBe(true)
    expect(canManageMembers('PFCCManager')).toBe(true)
    expect(canManageMembers('FellowshipLeader')).toBe(true)
    expect(canManageMembers('CellLeader')).toBe(false)
    expect(canManageMembers('Member')).toBe(false)
  })
})
