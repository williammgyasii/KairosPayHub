import { describe, expect, it } from 'vitest'
import { applySecurityHeaders } from './security-headers'

describe('applySecurityHeaders', () => {
  it('adds standard hardening headers', () => {
    const response = applySecurityHeaders(new Response('ok', { status: 200 }))

    expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=31536000')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(response.headers.get('Content-Security-Policy-Report-Only')).toContain(
      'challenges.cloudflare.com',
    )
  })
})
