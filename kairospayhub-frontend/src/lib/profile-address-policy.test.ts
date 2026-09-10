import { describe, expect, it } from 'vitest'
import { profileAddressPolicy } from './profile-address-policy'

describe('profileAddressPolicy', () => {
  it('shows a US state list and home address label', () => {
    const policy = profileAddressPolicy('US')
    expect(policy.showState).toBe(true)
    expect(policy.residenceLabel).toBe('Home address')
    expect(policy.residencePlaceholder).toBe('Street, city, or apartment')
    expect(policy.stateOptions).toHaveLength(51)
    expect(policy.stateOptions.map((state) => state.code)).toEqual(
      expect.arrayContaining(['CA', 'DC', 'MD', 'NY']),
    )
  })

  it('hides state for Ghana and keeps the residence label', () => {
    const policy = profileAddressPolicy('GH')
    expect(policy.showState).toBe(false)
    expect(policy.residenceLabel).toBe('Residence / location')
    expect(policy.residencePlaceholder).toBe('City, area, or address')
    expect(policy.stateOptions).toEqual([])
  })

  it('treats USA the same as US and ignores case', () => {
    expect(profileAddressPolicy('usa').showState).toBe(true)
    expect(profileAddressPolicy('Us').residenceLabel).toBe('Home address')
  })
})
