import { describe, expect, it } from 'vitest'
import { resolveTurnstileRoute } from './turnstile-policy'

describe('resolveTurnstileRoute', () => {
  it('requires turnstile on login post', () => {
    expect(resolveTurnstileRoute('/auth/login', 'POST')).toEqual({
      action: 'login',
      rebuildBody: true,
    })
  })

  it('skips login get', () => {
    expect(resolveTurnstileRoute('/auth/login', 'GET')).toEqual({ action: 'skip' })
  })

  it('requires turnstile on join submit', () => {
    expect(resolveTurnstileRoute('/api/join/abc', 'POST')).toEqual({
      action: 'join',
      rebuildBody: true,
    })
  })
})
