import { describe, expect, it } from 'vitest'
import { subscriptionPayload, vapidPublicKeyToBuffer } from './browser-push'

describe('vapidPublicKeyToBuffer', () => {
  it('returns a standalone ArrayBuffer of the decoded bytes', () => {
    const buf = vapidPublicKeyToBuffer('AQID')
    expect(buf).toBeInstanceOf(ArrayBuffer)
    expect(buf.byteLength).toBe(3)
    expect([...new Uint8Array(buf)]).toEqual([1, 2, 3])
  })
})

describe('subscriptionPayload', () => {
  it('reuses a complete browser subscription', () => {
    expect(
      subscriptionPayload({
        endpoint: 'https://push.example/edge',
        keys: { p256dh: 'p', auth: 'a' },
      }),
    ).toEqual({ endpoint: 'https://push.example/edge', p256dh: 'p', auth: 'a' })
  })

  it('ignores an incomplete subscription', () => {
    expect(subscriptionPayload({ endpoint: 'https://push.example/edge' })).toBeNull()
  })
})
