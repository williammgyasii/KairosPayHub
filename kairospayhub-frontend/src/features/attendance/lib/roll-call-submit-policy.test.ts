import { describe, expect, it } from 'vitest'
import { markableMeetingTypes, rollCallScopesForMeeting } from '@/features/attendance/lib/roll-call-submit-policy'

const fellowship = {
  scopeNodeId: 'fellow-1',
  scopeUnitName: 'Titans',
  layerId: 'layer-fellowship',
  layerName: 'Fellowship',
}
const cell = {
  scopeNodeId: 'cell-1',
  scopeUnitName: 'Titans Cell',
  layerId: 'layer-cell',
  layerName: 'Cell',
}
const sunday = {
  id: 'sunday',
  submissionLayerId: 'layer-cell',
  submissionLayerName: 'Cell',
}
const midweek = {
  id: 'midweek',
  submissionLayerId: 'layer-fellowship',
  submissionLayerName: 'Fellowship',
}

describe('markableMeetingTypes', () => {
  it('hides a cell-start meeting from a fellowship-only leader', () => {
    expect(markableMeetingTypes([sunday], [fellowship])).toEqual([])
  })

  it('shows a cell-start meeting to a cell leader', () => {
    expect(markableMeetingTypes([sunday], [cell]).map((type) => type.id)).toEqual(['sunday'])
  })

  it('lets a dual-hat leader see both layer meetings', () => {
    expect(markableMeetingTypes([sunday, midweek], [fellowship, cell]).map((type) => type.id)).toEqual(
      ['sunday', 'midweek'],
    )
  })
})

describe('rollCallScopesForMeeting', () => {
  it('keeps only the cell when Sunday Service starts at Cell', () => {
    expect(rollCallScopesForMeeting([fellowship, cell], sunday)).toEqual([cell])
  })
})
