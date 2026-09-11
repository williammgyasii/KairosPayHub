import { describe, expect, it } from 'vitest'
import { membershipPhoneCard, unitsPhoneCard } from '@/features/roster/lib/phone-cards'
import type { StructureMemberRow, StructureUnitNodeRow } from '@/lib/structure-table-rows'

const member: StructureMemberRow = {
  id: 'm1',
  member: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '+1 555',
  dateOfBirth: '1990-01-15',
  residence: 'Accra',
  state: 'GA',
  occupationStatus: 'Employed',
  schoolOrWorkplace: 'School A',
  workplace: 'Office B',
  age: '36',
  role: 'Member',
  path: 'Cell 1',
  parentNodeId: 'n1',
  position: 'Member',
  responsiveness: 3,
  rosterStatus: 'Active',
  structure: [
    { layerId: 'cell', layerName: 'Cell', standardType: 'Cell', nodeName: 'Cell 1' },
  ],
}

describe('membershipPhoneCard', () => {
  it('puts unit and phone on the card and keeps omitted profile columns in details', () => {
    const card = membershipPhoneCard(member, [{ id: 'cell', displayName: 'Cell' }])
    expect(card.title).toBe('Ada Lovelace')
    expect(card.lines).toEqual(['Cell 1 · Member', '+1 555'])
    expect(card.details).toEqual(
      expect.arrayContaining([
        { label: 'Date of birth', value: '1990-01-15' },
        { label: 'State', value: 'GA' },
        { label: 'Cell', value: 'Cell 1' },
      ]),
    )
  })
})

describe('unitsPhoneCard', () => {
  it('shows name, parent, and members', () => {
    const row: StructureUnitNodeRow = {
      id: 'u1',
      name: 'Titans Cell',
      unitNumber: '1',
      leaderMemberId: 'm1',
      leaderName: 'Ama Mensah',
      memberCount: 12,
      childUnitCount: 0,
      parentSegment: {
        layerId: 'f1',
        layerName: 'Fellowship',
        standardType: 'Fellowship',
        nodeName: 'Hope Fellowship',
      },
      pathSegments: [],
      layerId: 'cell',
    }
    const card = unitsPhoneCard(row)
    expect(card.title).toBe('Titans Cell')
    expect(card.lines).toEqual(['Hope Fellowship', '12 members'])
    expect(card.details).toEqual(
      expect.arrayContaining([
        { label: 'Leader', value: 'Ama Mensah' },
        { label: 'Members', value: '12' },
      ]),
    )
  })
})
