import { describe, expect, it, vi } from 'vitest'
import { disableWebPush, enableWebPush } from './web-push'
import type { ApiClient } from '@/shared/api/client'

function apiStub(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  }
}

describe('enableWebPush', () => {
  it('returns unavailable without requesting permission', async () => {
    const requestPermission = vi.fn()
    const result = await enableWebPush({
      api: apiStub(),
      supported: () => false,
      requestPermission,
      subscribe: async () => {
        throw new Error('should not subscribe')
      },
    })
    expect(result).toBe('unavailable')
    expect(requestPermission).not.toHaveBeenCalled()
  })

  it('calls onSubscribing after grant and skips the prompt when already granted', async () => {
    const onRequestingPermission = vi.fn()
    const onSubscribing = vi.fn()
    const requestPermission = vi.fn()
    const put = vi.fn().mockResolvedValue({ ok: true })
    const result = await enableWebPush({
      api: apiStub({
        get: vi.fn().mockResolvedValue({ publicKey: 'vapid' }),
        put,
      }),
      currentPermission: () => 'granted',
      requestPermission,
      onRequestingPermission,
      onSubscribing,
      subscribe: async () => ({
        endpoint: 'https://push.example/laptop',
        p256dh: 'p',
        auth: 'a',
      }),
    })
    expect(result).toBe('enabled')
    expect(requestPermission).not.toHaveBeenCalled()
    expect(onRequestingPermission).not.toHaveBeenCalled()
    expect(onSubscribing).toHaveBeenCalled()
    expect(put).toHaveBeenCalled()
  })

  it('stops after grant when stopAfterGrant is set', async () => {
    const subscribe = vi.fn()
    const result = await enableWebPush({
      api: apiStub(),
      requestPermission: async () => 'granted',
      stopAfterGrant: () => true,
      subscribe,
    })
    expect(result).toBe('needsSecondClick')
    expect(subscribe).not.toHaveBeenCalled()
  })

  it('uses a prefetched public key instead of GET', async () => {
    const get = vi.fn()
    const put = vi.fn().mockResolvedValue({ ok: true })
    const result = await enableWebPush({
      api: apiStub({ get, put }),
      currentPermission: () => 'granted',
      requestPermission: async () => 'granted',
      publicKey: 'prefetched',
      subscribe: async (key) => {
        expect(key).toBe('prefetched')
        return { endpoint: 'https://push.example/laptop', p256dh: 'p', auth: 'a' }
      },
    })
    expect(result).toBe('enabled')
    expect(get).not.toHaveBeenCalled()
  })

  it('does not PUT when permission is denied', async () => {
    const put = vi.fn()
    const result = await enableWebPush({
      api: apiStub({ put }),
      requestPermission: async () => 'denied',
      subscribe: async () => {
        throw new Error('should not subscribe')
      },
    })
    expect(result).toBe('denied')
    expect(put).not.toHaveBeenCalled()
  })
})

describe('disableWebPush', () => {
  it('DELETEs the current endpoint', async () => {
    const del = vi.fn().mockResolvedValue({ ok: true })
    await disableWebPush({
      api: apiStub({ delete: del }),
      currentEndpoint: async () => 'https://push.example/phone',
      unsubscribe: async () => {},
    })
    expect(del).toHaveBeenCalledWith(
      '/api/notifications/push/subscriptions?endpoint=' +
        encodeURIComponent('https://push.example/phone'),
    )
  })
})
