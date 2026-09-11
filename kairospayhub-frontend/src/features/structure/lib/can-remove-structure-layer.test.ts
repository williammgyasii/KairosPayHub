import { describe, expect, it } from 'vitest'
import {
  canRemoveStructureLayer,
  structureLayerRemoveIntent,
} from '@/features/structure/lib/can-remove-structure-layer'

const fellowshipCell = [
  { id: 'fel', sortOrder: 0, displayName: 'Fellowship' },
  { id: 'cell', sortOrder: 1, displayName: 'Cell' },
]

const churchCell = [{ id: 'cell', sortOrder: 0, displayName: 'Cell' }]

const pfccChain = [
  { id: 'pfcc', sortOrder: 0, displayName: 'PFCC' },
  { id: 'fel', sortOrder: 1, displayName: 'Home groups' },
  { id: 'cell', sortOrder: 2, displayName: 'Cell' },
]

describe('canRemoveStructureLayer', () => {
  it('allows minus only on Fellowship in Fellowship → Cell', () => {
    expect(canRemoveStructureLayer(fellowshipCell, 0)).toBe(true)
    expect(canRemoveStructureLayer(fellowshipCell, 1)).toBe(false)
  })

  it('allows no minus on Church → Cell', () => {
    expect(canRemoveStructureLayer(churchCell, 0)).toBe(false)
  })

  it('allows minus on mid layers from position, not display names', () => {
    expect(canRemoveStructureLayer(pfccChain, 0)).toBe(true)
    expect(canRemoveStructureLayer(pfccChain, 1)).toBe(true)
    expect(canRemoveStructureLayer(pfccChain, 2)).toBe(false)
  })
})

describe('structureLayerRemoveIntent', () => {
  it('saves without the layer when the roster is empty', () => {
    expect(structureLayerRemoveIntent(false)).toBe('saveWithoutLayer')
  })

  it('offers a full reset when units already exist', () => {
    expect(structureLayerRemoveIntent(true)).toBe('offerReset')
  })
})
