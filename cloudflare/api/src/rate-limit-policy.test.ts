import { describe, expect, it } from 'vitest'
import {
  classifyRateLimitTier,
  rateLimitKey,
  resolveRateLimit,
  shouldSkipRateLimit,
} from './rate-limit-policy'

describe('classifyRateLimitTier', () => {
  it('classifies auth paths', () => {
    expect(classifyRateLimitTier('/auth/login', 'POST')).toBe('auth')
  })

  it('classifies join submit', () => {
    expect(classifyRateLimitTier('/api/join/abc123', 'POST')).toBe('join')
  })

  it('does not classify join preview as join tier', () => {
    expect(classifyRateLimitTier('/api/join/abc123', 'GET')).toBe('api')
  })

  it('classifies general api paths', () => {
    expect(classifyRateLimitTier('/api/structure/tree', 'GET')).toBe('api')
  })

  it('classifies hubs paths', () => {
    expect(classifyRateLimitTier('/hubs/notifications/negotiate', 'POST')).toBe(
      'hubs',
    )
  })

  it('returns null for non-api paths', () => {
    expect(classifyRateLimitTier('/dashboard', 'GET')).toBeNull()
  })
})

describe('rateLimitKey', () => {
  it('uses ip for auth', () => {
    expect(rateLimitKey('auth', '/auth/login', '1.2.3.4')).toBe('1.2.3.4')
  })

  it('uses token and ip for join submit', () => {
    expect(rateLimitKey('join', '/api/join/tok-1', '1.2.3.4')).toBe(
      'tok-1:1.2.3.4',
    )
  })

  it('uses ip for general api', () => {
    expect(rateLimitKey('api', '/api/giving', '1.2.3.4')).toBe('1.2.3.4')
  })
})

describe('shouldSkipRateLimit', () => {
  it('skips health checks', () => {
    expect(
      shouldSkipRateLimit('/health', 'GET', new Headers()),
    ).toBe(true)
  })

  it('skips websocket upgrades on hubs', () => {
    const headers = new Headers({ Upgrade: 'websocket' })
    expect(
      shouldSkipRateLimit('/hubs/notifications', 'GET', headers),
    ).toBe(true)
  })

  it('does not skip hub negotiate posts', () => {
    expect(
      shouldSkipRateLimit('/hubs/notifications/negotiate', 'POST', new Headers()),
    ).toBe(false)
  })
})

describe('resolveRateLimit', () => {
  it('limits auth login by ip', () => {
    expect(
      resolveRateLimit('/auth/login', 'POST', new Headers(), '9.9.9.9'),
    ).toEqual({
      action: 'limit',
      tier: 'auth',
      key: '9.9.9.9',
    })
  })

  it('limits join submit by token and ip', () => {
    expect(
      resolveRateLimit(
        '/api/join/leaked-token',
        'POST',
        new Headers(),
        '9.9.9.9',
      ),
    ).toEqual({
      action: 'limit',
      tier: 'join',
      key: 'leaked-token:9.9.9.9',
    })
  })

  it('skips health', () => {
    expect(
      resolveRateLimit('/health', 'GET', new Headers(), '9.9.9.9'),
    ).toEqual({ action: 'skip' })
  })
})
