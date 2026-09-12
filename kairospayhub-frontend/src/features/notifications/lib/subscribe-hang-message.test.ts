import { describe, expect, it } from 'vitest'
import { isEdgeUserAgent, subscribeHangMessage } from './subscribe-hang-message'

describe('subscribeHangMessage', () => {
  it('tells Edge to click again or use another browser', () => {
    const message = subscribeHangMessage(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Edg/120.0.0.0',
    )
    expect(isEdgeUserAgent('Mozilla/5.0 Edg/120.0.0.0')).toBe(true)
    expect(message).toMatch(/edge/i)
    expect(message).toMatch(/chrome/i)
  })

  it('keeps a generic message for Chrome', () => {
    const message = subscribeHangMessage(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0 Safari/537.36',
    )
    expect(message).toMatch(/refresh/i)
    expect(message).not.toMatch(/edge/i)
  })
})
