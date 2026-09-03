import { describe, expect, it } from 'vitest'
import type { StructureTree } from '@/api/structure'
import {
  dashboardSetupActions,
  dashboardWelcomeSubtitle,
  isEarlyChurchSetup,
  setupProgress,
  unitsNeedingLeaders,
} from '@/lib/dashboard-setup-actions'

function tree(partial: Partial<StructureTree>): StructureTree {
  return {
    churchId: 'church-1',
    churchName: 'Test Church',
    template: null,
    nodes: [],
    members: [],
    ...partial,
  }
}

const template = {
  id: 'tpl-1',
  name: 'Standard',
  layers: [
    { id: 'pfcc', sortOrder: 0, standardType: 'PFCC' as const, displayName: 'PFCC' },
    { id: 'fellowship', sortOrder: 1, standardType: 'Fellowship' as const, displayName: 'Fellowship' },
    { id: 'cell', sortOrder: 2, standardType: 'Cell' as const, displayName: 'Cell' },
  ],
}

describe('dashboardSetupActions', () => {
  it('starts with structure when there is no template', () => {
    const actions = dashboardSetupActions(tree({}))
    expect(actions[0].id).toBe('structure')
    expect(actions[0].status).toBe('current')
    expect(actions[1].status).toBe('pending')
  })

  it('prioritizes units after structure exists', () => {
    const actions = dashboardSetupActions(tree({ template, nodes: [] }))
    expect(actions.find((a) => a.id === 'structure')?.status).toBe('done')
    expect(actions.find((a) => a.id === 'units')?.status).toBe('current')
  })

  it('prioritizes leaders when units exist without leaders', () => {
    const sample = tree({
      template,
      nodes: [
        {
          id: 'f1',
          layerId: 'fellowship',
          parentNodeId: null,
          name: 'Titans',
          unitNumber: '1',
          leaderMemberId: null,
          leaderName: null,
        },
      ],
    })

    expect(unitsNeedingLeaders(sample)).toHaveLength(1)
    const actions = dashboardSetupActions(sample)
    expect(actions.find((a) => a.id === 'units')?.status).toBe('done')
    expect(actions.find((a) => a.id === 'leaders')?.status).toBe('current')
  })

  it('marks leaders done when every unit has a leader', () => {
    const sample = tree({
      template,
      nodes: [
        {
          id: 'f1',
          layerId: 'fellowship',
          parentNodeId: null,
          name: 'Titans',
          unitNumber: '1',
          leaderMemberId: null,
          leaderName: 'Pastor Ada',
        },
      ],
    })

    expect(unitsNeedingLeaders(sample)).toHaveLength(0)
    const actions = dashboardSetupActions(sample)
    expect(actions.find((a) => a.id === 'leaders')?.status).toBe('done')
    expect(actions.find((a) => a.id === 'members')?.status).toBe('current')
  })
})

describe('isEarlyChurchSetup', () => {
  it('is true until members exist and leaders are assigned', () => {
    expect(isEarlyChurchSetup(tree({}))).toBe(true)
    expect(
      isEarlyChurchSetup(
        tree({
          template,
          nodes: [
            {
              id: 'f1',
              layerId: 'fellowship',
              parentNodeId: null,
              name: 'Titans',
              unitNumber: '1',
              leaderMemberId: null,
              leaderName: 'Ada',
            },
          ],
          members: [
            {
              id: 'm1',
              parentNodeId: 'f1',
              name: 'Member',
              email: null,
              phone: null,
              age: null,
              dateOfBirth: null,
              residence: null,
              occupationStatus: null,
              schoolOrWorkplace: null,
              position: 'Member',
              responsiveness: 0,
            },
          ],
        }),
      ),
    ).toBe(false)
  })
})

describe('setupProgress', () => {
  it('tracks completed setup steps', () => {
    expect(setupProgress(tree({ template, nodes: [] }))).toEqual({ completed: 1, total: 4 })
  })
})

describe('dashboardWelcomeSubtitle', () => {
  it('mentions leaders when units lack them', () => {
    const subtitle = dashboardWelcomeSubtitle(
      tree({
        template,
        nodes: [
          {
            id: 'c1',
            layerId: 'cell',
            parentNodeId: null,
            name: 'Cell 1',
            unitNumber: '1',
            leaderMemberId: null,
            leaderName: null,
          },
        ],
      }),
    )
    expect(subtitle).toMatch(/leader/i)
  })
})
