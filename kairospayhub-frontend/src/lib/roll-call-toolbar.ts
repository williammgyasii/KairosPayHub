export type RollCallToolbarChipId = 'present' | 'absent' | 'left' | 'firstTimers'

export type RollCallToolbarChip = {
  id: RollCallToolbarChipId
  label: string
  count: number
}

export function rollCallToolbarChips(input: {
  present: number
  absent: number
  unmarked: number
  firstTimers: number
}): RollCallToolbarChip[] {
  const chips: RollCallToolbarChip[] = [
    { id: 'present', label: 'Present', count: input.present },
    { id: 'absent', label: 'Absent', count: input.absent },
  ]
  if (input.unmarked > 0) {
    chips.push({ id: 'left', label: 'Left', count: input.unmarked })
  }
  if (input.firstTimers > 0) {
    chips.push({ id: 'firstTimers', label: 'First timers', count: input.firstTimers })
  }
  return chips
}
