import { describe, expect, it } from 'vitest'
import { churchRegionLabel, churchRegionOptions } from '@/lib/church-region-options'

describe('churchRegionOptions', () => {
  it('returns US states for a US church', () => {
    expect(churchRegionOptions('US').length).toBeGreaterThan(50)
    expect(churchRegionLabel('US')).toBe('State')
  })

  it('returns Ghana regions for a Ghana church', () => {
    expect(churchRegionOptions('GH').some((region) => region.label === 'Greater Accra')).toBe(true)
    expect(churchRegionLabel('GH')).toBe('Region')
  })
})
