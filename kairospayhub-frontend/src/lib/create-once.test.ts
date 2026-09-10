import { describe, expect, it } from 'vitest'
import { createOnceLock } from '@/lib/create-once'

describe('createOnceLock', () => {
  it('allows the first start and rejects the rest', () => {
    const lock = createOnceLock()
    expect(lock.tryStart()).toBe(true)
    expect(lock.tryStart()).toBe(false)
    expect(lock.tryStart()).toBe(false)
  })

  it('can unlock after a failed attempt', () => {
    const lock = createOnceLock()
    expect(lock.tryStart()).toBe(true)
    lock.reset()
    expect(lock.tryStart()).toBe(true)
  })
})
