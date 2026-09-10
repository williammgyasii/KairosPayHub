import { describe, expect, it } from 'vitest'
import { occupationFieldsPolicy } from './occupation-fields-policy'

describe('occupationFieldsPolicy', () => {
  it('shows only school for a student', () => {
    const policy = occupationFieldsPolicy('Student')
    expect(policy.showSchool).toBe(true)
    expect(policy.showWorkplace).toBe(false)
  })

  it('shows only workplace when working', () => {
    const policy = occupationFieldsPolicy('Working')
    expect(policy.showSchool).toBe(false)
    expect(policy.showWorkplace).toBe(true)
  })

  it('shows school and workplace for student and working', () => {
    const policy = occupationFieldsPolicy('StudentAndWorking')
    expect(policy.showSchool).toBe(true)
    expect(policy.showWorkplace).toBe(true)
    expect(policy.schoolLabel).toBe('School / institution')
    expect(policy.workplaceLabel).toBe('Workplace')
  })

  it('hides both fields for unemployed / not working', () => {
    const policy = occupationFieldsPolicy('Unemployed')
    expect(policy.showSchool).toBe(false)
    expect(policy.showWorkplace).toBe(false)
    expect(policy.persistedStatus).toBe('Unemployed')
  })
})
