import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import type { VisibilityState } from '@tanstack/react-table'
import { StructureMemberTable } from '@/components/structure/structure-member-table'
import { MemberTableToolbar } from '@/components/structure/member-table-toolbar'
import { defaultMembershipColumnVisibility } from '@/lib/membership-table-columns'
import type { StructureMemberRow } from '@/lib/structure-table-rows'
import type { MemberFilterRule } from '@/lib/member-filters'

const layers = [
  { id: 'cell', displayName: 'Cell', standardType: 'Cell' as const },
]

const row: StructureMemberRow = {
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

function Harness() {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() =>
    defaultMembershipColumnVisibility(layers),
  )
  const [rules] = useState<MemberFilterRule[]>([])

  return (
    <StructureMemberTable
      rows={[row]}
      structureLayers={layers}
      extendedColumns
      columnVisibility={columnVisibility}
      onColumnVisibilityChange={setColumnVisibility}
      showSearch={false}
      hideHeader
      toolbar={
        <MemberTableToolbar
          rows={[row]}
          structureLayers={layers}
          rules={rules}
          onChangeRules={() => {}}
          searchQuery=""
          onSearchQueryChange={() => {}}
          hideSearchField
          filteredCount={1}
          totalCount={1}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
        />
      }
    />
  )
}

describe('membership row marks', () => {
  it('shows a New mark next to a recently added member', () => {
    render(
      <StructureMemberTable
        rows={[
          {
            ...row,
            createdAt: new Date().toISOString(),
          },
        ]}
        structureLayers={layers}
        showSearch={false}
        hideHeader
      />,
    )

    expect(screen.getByText('New')).toBeTruthy()
  })

  it('shows You instead of New on the current member row', () => {
    render(
      <StructureMemberTable
        rows={[
          {
            ...row,
            createdAt: new Date().toISOString(),
          },
        ]}
        structureLayers={layers}
        currentMemberId={row.id}
        showSearch={false}
        hideHeader
      />,
    )

    expect(screen.getByText('You')).toBeTruthy()
    expect(screen.queryByText('New')).toBeNull()
  })

  it('shows a Pending mark for join requests', () => {
    render(
      <StructureMemberTable
        rows={[{ ...row, rosterStatus: 'Pending' }]}
        structureLayers={layers}
        showSearch={false}
        hideHeader
      />,
    )

    expect(screen.getByText('Pending')).toBeTruthy()
  })
})

describe('membership column toggles', () => {
  it('hides State by default and shows it after Columns toggle', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(screen.queryByText('GA')).toBeNull()
    expect(screen.getByText('ada@example.com')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /columns/i }))
    await user.click(screen.getByRole('menuitem', { name: /^state$/i }))

    expect(await screen.findByText('GA')).toBeTruthy()
  })
})
