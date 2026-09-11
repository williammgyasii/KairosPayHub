import { describe, expect, it } from 'vitest'
import { attendancePersonPhoneCard, attendanceUnitPhoneCard } from '@/features/attendance/lib/phone-cards'

describe('attendance adapters', () => {
  it('shows name, unit, and type on a present-person card', () => {
    const card = attendancePersonPhoneCard(
      {
        name: 'Ama Boateng',
        personKind: 'Invitee',
        scopeNodeId: 'cell-1',
        cellName: 'Titans Cell',
        parentUnitName: 'Hope Fellowship',
        phone: '+23324',
        wasFirstTimer: true,
        invitedByMemberName: 'Kofi',
      },
      { unit: 'Cell', parent: 'Fellowship' },
    )
    expect(card.title).toBe('Ama Boateng')
    expect(card.lines).toEqual(['Titans Cell', 'Invitee'])
    expect(card.details).toEqual(
      expect.arrayContaining([
        { label: 'Fellowship', value: 'Hope Fellowship' },
        { label: 'Invited by', value: 'Kofi' },
      ]),
    )
  })

  it('shows unit present counts on a by-units card', () => {
    const card = attendanceUnitPhoneCard({
      id: 's1',
      scopeUnitName: 'Titans Cell',
      parentUnitName: 'Hope Fellowship',
      totalPresent: 8,
      membersPresent: 6,
      firstTimersPresent: 1,
      guestsPresent: 2,
      approvalStatus: 'Approved',
      submittedAt: null,
    })
    expect(card.title).toBe('Titans Cell')
    expect(card.lines[0]).toContain('8 present')
  })
})
