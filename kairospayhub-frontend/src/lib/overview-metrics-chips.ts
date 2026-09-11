export type OverviewMetricsChipId = 'present' | 'guests' | 'firstTimers' | 'pending'

export type OverviewMetricsChip = {
  id: OverviewMetricsChipId
  label: string
  count: number
}

export function overviewMetricsChips(input: {
  present: number
  guests: number
  firstTimers: number
  pending: number
}): OverviewMetricsChip[] {
  const chips: OverviewMetricsChip[] = [
    { id: 'present', label: 'Present', count: input.present },
    { id: 'guests', label: 'Guests', count: input.guests },
    { id: 'firstTimers', label: 'First timers', count: input.firstTimers },
  ]
  if (input.pending > 0) {
    chips.push({ id: 'pending', label: 'Pending', count: input.pending })
  }
  return chips
}
