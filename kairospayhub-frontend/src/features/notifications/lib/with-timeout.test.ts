import { describe, expect, it, vi } from 'vitest'
import { withTimeout } from './with-timeout'

describe('withTimeout', () => {
  it('rejects when the promise never settles', async () => {
    vi.useFakeTimers()
    const pending = withTimeout(new Promise<string>(() => {}), 20_000, 'Timed out')
    const assertion = expect(pending).rejects.toThrow('Timed out')
    await vi.advanceTimersByTimeAsync(20_000)
    await assertion
    vi.useRealTimers()
  })

  it('resolves when the promise finishes first', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 20_000, 'Timed out')).resolves.toBe('ok')
  })
})
