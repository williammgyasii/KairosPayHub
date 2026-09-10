import { describe, expect, it } from 'vitest'
import {
  isRequiredLeaderProfileComplete,
  memberProfileInitialValues,
  memberProfilePayload,
  type MemberProfileFormValues,
} from './member-profile-fields'

function completeUsLeader(
  patch: Partial<MemberProfileFormValues> = {},
): MemberProfileFormValues {
  return {
    phoneDialCode: '1',
    phoneLocal: '2025550100',
    dateOfBirth: '1994-01-15',
    residence: '12 Oak St',
    state: '',
    occupationStatus: 'Unemployed',
    schoolOrWorkplace: '',
    workplace: '',
    ...patch,
  }
}

describe('isRequiredLeaderProfileComplete', () => {
  it('requires state when the church country shows a state field', () => {
    const profile = completeUsLeader()
    expect(isRequiredLeaderProfileComplete('lead@example.com', profile, 'US')).toBe(false)
    expect(
      isRequiredLeaderProfileComplete('lead@example.com', { ...profile, state: 'MD' }, 'US'),
    ).toBe(true)
  })

  it('does not require state for Ghana', () => {
    expect(isRequiredLeaderProfileComplete('lead@example.com', completeUsLeader(), 'GH')).toBe(
      true,
    )
  })
})

describe('memberProfilePayload', () => {
  it('sends state and workplace as their own fields', () => {
    expect(
      memberProfilePayload(
        completeUsLeader({
          state: 'MD',
          occupationStatus: 'StudentAndWorking',
          schoolOrWorkplace: 'Howard University',
          workplace: 'Kairos',
        }),
      ),
    ).toEqual({
      phone: '+12025550100',
      dateOfBirth: '1994-01-15',
      residence: '12 Oak St',
      state: 'MD',
      occupationStatus: 'StudentAndWorking',
      schoolOrWorkplace: 'Howard University',
      workplace: 'Kairos',
    })
  })

  it('persists unemployed with empty school and workplace', () => {
    expect(memberProfilePayload(completeUsLeader({ state: 'MD' }))).toMatchObject({
      occupationStatus: 'Unemployed',
      schoolOrWorkplace: null,
      workplace: null,
    })
  })
})

describe('memberProfileInitialValues', () => {
  it('hydrates state and workplace', () => {
    const values = memberProfileInitialValues({
      countryCode: 'US',
      state: 'MD',
      workplace: 'Kairos',
    })
    expect(values.state).toBe('MD')
    expect(values.workplace).toBe('Kairos')
  })
})
