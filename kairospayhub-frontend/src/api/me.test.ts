import { describe, expect, it } from 'vitest'
import { displayName, needsOnboarding, type Me } from './me'

const notOnboarded: Me = { onboarded: false, email: 'p@example.com', name: null }

const onboarded: Me = {
  onboarded: true,
  id: 'u1',
  organizationId: 'o1',
  role: 'Pastor',
  churchId: null,
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
