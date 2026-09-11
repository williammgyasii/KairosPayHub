import { describe, expect, it } from 'vitest'
import { buildCreateStepPlan, buildEditStepPlan } from '@/features/roster/components/member-wizard-steps'

describe('buildCreateStepPlan', () => {
  it('puts personal details after name and never asks new-vs-returning', () => {
    expect(buildCreateStepPlan('cell', false)).toEqual({
      labels: ['Details', 'Personal', 'Work & study'],
      kinds: ['details', 'personal', 'education'],
    })
  })

  it('keeps attach-to-cell after personal for fellowship', () => {
    expect(buildCreateStepPlan('fellowship', true).kinds).toEqual([
      'details',
      'personal',
      'cell',
      'education',
    ])
  })

  it('does not add a responsiveness step', () => {
    expect(buildCreateStepPlan('cell', false).kinds).not.toContain('responsiveness')
    expect(buildCreateStepPlan('roster', false).kinds).not.toContain('responsiveness')
  })
})

describe('buildEditStepPlan', () => {
  it('keeps edit on one details step without placement or work-study', () => {
    expect(buildEditStepPlan('roster', false)).toEqual({
      labels: ['Details'],
      kinds: ['details'],
    })
    expect(buildEditStepPlan('fellowship', true).kinds).toEqual(['details'])
    expect(buildEditStepPlan('cell', false).kinds).toEqual(['details'])
  })
})
