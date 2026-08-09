import { describe, expect, it } from 'vitest'
import { applyMemberFilterRules, applyMemberSearch, createMemberFilterRule, leadersMemberFilterPreset } from '@/lib/member-filters'
import type { StructureMemberRow } from '@/lib/structure-table-rows'

const sampleRows: StructureMemberRow[] = [
  {
    id: '1',
    member: 'Kay Asante',
    email: 'kay@example.com',
    phone: '+233241234567',
    dateOfBirth: '2000-01-01',
    residence: 'East Legon',
    occupationStatus: 'Student',
    schoolOrWorkplace: 'UG',
    age: '25',
    role: 'Member',
    path: 'PFCC 1 / Titans / Cell 1',
    parentNodeId: 'cell-1',
    position: 'Member',
    structure: [
      {
        layerId: 'pfcc',
        layerName: 'PFCC',
        standardType: 'PFCC',
        nodeName: 'PFCC 1',
      },
      {
        layerId: 'cell',
        layerName: 'Cell',
        standardType: 'Cell',
        nodeName: 'Cell 1',
      },
    ],
  },
  {
    id: '2',
    member: 'Leader One',
    email: 'leader@example.com',
    phone: '',
    dateOfBirth: '',
    residence: '',
    occupationStatus: 'Working',
    schoolOrWorkplace: '',
    age: '30',
    role: 'Cell leader',
    path: 'PFCC 1 / Cell 1',
    parentNodeId: 'cell-1',
    position: 'CellLeader',
    structure: [
      {
        layerId: 'pfcc',
        layerName: 'PFCC',
        standardType: 'PFCC',
        nodeName: 'PFCC 1',
      },
      {
        layerId: 'cell',
        layerName: 'Cell',
        standardType: 'Cell',
        nodeName: 'Cell 1',
      },
    ],
  },
]

describe('applyMemberFilterRules', () => {
  it('filters with contains on name', () => {
    const rules = [{ ...createMemberFilterRule('name'), operator: 'contains' as const, value: 'kay' }]
    expect(applyMemberFilterRules(sampleRows, rules)).toHaveLength(1)
  })

  it('filters with is on residence', () => {
    const rules = [{ ...createMemberFilterRule('residence'), operator: 'is' as const, value: 'East Legon' }]
    expect(applyMemberFilterRules(sampleRows, rules)).toHaveLength(1)
  })

  it('ANDs multiple rules', () => {
    const rules = [
      { ...createMemberFilterRule('name'), operator: 'contains' as const, value: 'kay' },
      { ...createMemberFilterRule('residence'), operator: 'contains' as const, value: 'kumasi' },
    ]
    expect(applyMemberFilterRules(sampleRows, rules)).toHaveLength(0)
  })

  it('filters by layer field', () => {
    const rules = [
      {
        ...createMemberFilterRule('layer:cell'),
        operator: 'is' as const,
        value: 'Cell 1',
      },
    ]
    expect(applyMemberFilterRules(sampleRows, rules)).toHaveLength(2)
  })

  it('ignores rules without a selected field', () => {
    expect(applyMemberFilterRules(sampleRows, [createMemberFilterRule()])).toHaveLength(2)
  })
})

describe('leadersMemberFilterPreset', () => {
  it('excludes regular members', () => {
    const filtered = applyMemberFilterRules(sampleRows, leadersMemberFilterPreset())
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.position).toBe('CellLeader')
  })
})

describe('applyMemberSearch', () => {
  it('searches all fields', () => {
    expect(applyMemberSearch(sampleRows, 'east legon', 'all')).toHaveLength(1)
    expect(applyMemberSearch(sampleRows, 'missing', 'all')).toHaveLength(0)
  })

  it('searches a single field scope', () => {
    expect(applyMemberSearch(sampleRows, 'kay@', 'email')).toHaveLength(1)
    expect(applyMemberSearch(sampleRows, 'kay@', 'phone')).toHaveLength(0)
  })
})
