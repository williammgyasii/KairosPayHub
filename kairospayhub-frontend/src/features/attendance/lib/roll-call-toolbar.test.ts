import { describe, expect, it } from 'vitest'
import { rollCallToolbarChips } from '@/features/attendance/lib/roll-call-toolbar'

describe('rollCallToolbarChips', () => {
  it('always shows present and absent', () => {
    expect(
      rollCallToolbarChips({ present: 0, absent: 0, unmarked: 4, firstTimers: 0 }).map(
        (chip) => chip.id,
      ),
    ).toEqual(['present', 'absent', 'left'])
  })

  it('hides Left when every member is marked', () => {
    expect(
      rollCallToolbarChips({ present: 8, absent: 4, unmarked: 0, firstTimers: 0 }).map(
        (chip) => chip.id,
      ),
    ).toEqual(['present', 'absent'])
  })

  it('shows first timers only when the count is above zero', () => {
    expect(
      rollCallToolbarChips({ present: 8, absent: 2, unmarked: 1, firstTimers: 2 }).map(
        (chip) => [chip.id, chip.count],
      ),
    ).toEqual([
      ['present', 8],
      ['absent', 2],
      ['left', 1],
      ['firstTimers', 2],
    ])
  })
})
