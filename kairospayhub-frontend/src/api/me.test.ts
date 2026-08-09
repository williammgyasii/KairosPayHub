import { describe, expect, it } from 'vitest'
import { displayName, canCreateGivingProgram, canCreateSubGiving, isPastor, isScopedLeader, needsOnboarding, type Me } from './me'

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

describe('isScopedLeader', () => {
  it('is true for PFCC and fellowship leaders', () => {
    expect(isScopedLeader('PFCCManager')).toBe(true)
    expect(isScopedLeader('FellowshipLeader')).toBe(true)
    expect(isScopedLeader('Pastor')).toBe(false)
  })
})

describe('canCreateSubGiving', () => {
  it('allows pastors and PFCC managers only', () => {
    expect(canCreateSubGiving('Pastor')).toBe(true)
    expect(canCreateSubGiving('PFCCManager')).toBe(true)
    expect(canCreateSubGiving('FellowshipLeader')).toBe(false)
    expect(canCreateSubGiving('CellLeader')).toBe(false)
  })
})

describe('canCreateGivingProgram', () => {
  it('matches campaign and sub-giving create permissions', () => {
    expect(canCreateGivingProgram('Pastor')).toBe(true)
    expect(canCreateGivingProgram('PFCCManager')).toBe(true)
    expect(canCreateGivingProgram('FellowshipLeader')).toBe(false)
  })
})
