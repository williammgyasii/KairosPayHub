import { describe, expect, it } from 'vitest'
import { shouldShowAccessNav } from '@/features/access/lib/access-nav'

describe('shouldShowAccessNav', () => {
  it('shows Access only for the pastor', () => {
    expect(shouldShowAccessNav('Pastor')).toBe(true)
    expect(shouldShowAccessNav('ChurchAdmin')).toBe(false)
    expect(shouldShowAccessNav('FellowshipLeader')).toBe(false)
  })
})
