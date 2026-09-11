import { describe, expect, it } from 'vitest'
import { profileAddressPolicy } from './profile-address-policy'

describe('profileAddressPolicy', () => {
  it('shows a US state dropdown and home address label', () => {
    const policy = profileAddressPolicy('US')
    expect(policy.showState).toBe(true)
    expect(policy.requireState).toBe(true)
    expect(policy.stateLabel).toBe('State')
    expect(policy.residenceLabel).toBe('Home address')
    expect(policy.stateOptions).toHaveLength(51)
    expect(policy.stateOptions.map((state) => state.code)).toEqual(
      expect.arrayContaining(['CA', 'DC', 'MD', 'NY']),
    )
  })

  it('shows a Ghana region dropdown', () => {
    const policy = profileAddressPolicy('GH')
    expect(policy.showState).toBe(true)
    expect(policy.requireState).toBe(true)
    expect(policy.stateLabel).toBe('Region')
    expect(policy.stateOptions.map((region) => region.label)).toEqual(
      expect.arrayContaining(['Greater Accra', 'Ashanti']),
    )
  })

  it('shows a Canadian province dropdown', () => {
    const policy = profileAddressPolicy('CA')
    expect(policy.stateLabel).toBe('Province')
    expect(policy.stateOptions.map((province) => province.code)).toEqual(
      expect.arrayContaining(['ON', 'BC', 'QC']),
    )
  })

  it('hides state when the church country has no region catalog yet', () => {
    expect(profileAddressPolicy('DE').showState).toBe(false)
  })

  it('treats USA the same as US and ignores case', () => {
    expect(profileAddressPolicy('usa').requireState).toBe(true)
    expect(profileAddressPolicy('Us').residenceLabel).toBe('Home address')
  })
})
