import { describe, expect, it } from 'vitest'
import { memberProfileOverviewSections } from '@/lib/member-profile-overview'

const base = {
  phone: '+12405550100',
  email: 'ada@example.com',
  dateOfBirth: '1994-01-15',
  age: '32',
  residence: '12 Oak St',
  state: 'MD',
  occupationStatus: 'StudentAndWorking',
  schoolOrWorkplace: 'UMD',
  workplace: 'Kairos',
}

describe('memberProfileOverviewSections', () => {
  it('shows state and home address for a US church', () => {
    const sections = memberProfileOverviewSections(base, 'US')
    const personal = sections.find((section) => section.id === 'personal')
    expect(personal?.fields.map((field) => field.label)).toEqual([
      'Date of birth',
      'Age',
      'State',
      'Home address',
    ])
    expect(personal?.fields.find((field) => field.id === 'state')?.value).toBe('Maryland')
  })

  it('hides state and uses residence for a Ghana church', () => {
    const sections = memberProfileOverviewSections(base, 'GH')
    const personal = sections.find((section) => section.id === 'personal')
    expect(personal?.fields.map((field) => field.id)).toEqual(['dob', 'age', 'residence'])
    expect(personal?.fields.find((field) => field.id === 'residence')?.label).toBe(
      'Residence / location',
    )
  })

  it('shows school and workplace separately for student and working', () => {
    const work = memberProfileOverviewSections(base, 'GH').find((section) => section.id === 'work')
    expect(work?.fields.map((field) => field.id)).toEqual(['occupation', 'school', 'workplace'])
    expect(work?.fields.find((field) => field.id === 'school')?.value).toBe('UMD')
    expect(work?.fields.find((field) => field.id === 'workplace')?.value).toBe('Kairos')
  })
})
