import { describe, expect, it } from 'vitest'
import type { StructureLayer, StructureTree } from '@/api/structure'
import { templateToFlow } from '@/lib/structure-flow'

function tree(layers: StructureLayer[]): StructureTree {
  return {
    churchId: 'church-1',
    churchName: 'TPH USA',
    template: { id: 'tpl-1', name: 'Main', layers },
    nodes: [],
    members: [],
  }
}

describe('templateToFlow', () => {
  it('marks Fellowship removable and leaves Church, Cell, and Member without minus', () => {
    const { nodes } = templateToFlow(
      tree([
        { id: 'fel', sortOrder: 0, standardType: 'Fellowship', displayName: 'Fellowship' },
        { id: 'cell', sortOrder: 1, standardType: 'Cell', displayName: 'Cell' },
      ]),
    )

    expect(nodes.find((node) => node.data.kind === 'church')?.data.canRemove).toBeFalsy()
    expect(nodes.find((node) => node.data.label === 'Fellowship')?.data.canRemove).toBe(true)
    expect(nodes.find((node) => node.data.label === 'Cell')?.data.canRemove).toBe(false)
    expect(nodes.find((node) => node.data.kind === 'member')?.data.canRemove).toBeFalsy()
  })

  it('marks no layer removable on Church → Cell', () => {
    const { nodes } = templateToFlow(
      tree([{ id: 'cell', sortOrder: 0, standardType: 'Cell', displayName: 'Cell' }]),
    )

    expect(nodes.filter((node) => node.data.canRemove).length).toBe(0)
  })
})
