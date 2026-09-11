import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AttendancePresentPerson } from '@/api/attendance'
import { AttendanceAllTable } from '@/components/attendance/attendance-all-table'
import { AttendanceAllToolbar } from '@/components/attendance/attendance-all-toolbar'

const people: AttendancePresentPerson[] = [
  {
    name: 'Ama Boateng',
    personKind: 'Member',
    scopeNodeId: 'cell-1',
    cellName: 'Titans Cell',
    parentUnitName: 'Titans Fellowship',
    phone: '+233241111111',
    wasFirstTimer: false,
    invitedByMemberName: null,
  },
]

describe('AttendanceAllTable', () => {
  it('renders a TanStack table in its own region with filters outside', () => {
    render(
      <div>
        <AttendanceAllToolbar
          search=""
          setSearch={vi.fn()}
          personKind=""
          setPersonKind={vi.fn()}
          cellFilter=""
          setCellFilter={vi.fn()}
          columnVisibility={{
            name: true,
            unit: true,
            type: true,
            phone: true,
            invitedBy: true,
            parentUnit: false,
          }}
          toggleColumn={vi.fn()}
          parentColumnLabel="Fellowship"
          unitLayerLabel="Cell"
          countLabel="1 person in attendance for this service"
        />
        <AttendanceAllTable
          rows={people}
          emptyMessage="No approved attendance"
          parentColumnLabel="Fellowship"
          unitLayerLabel="Cell"
          columnVisibility={{
            name: true,
            unit: true,
            type: true,
            phone: true,
            invitedBy: true,
            parentUnit: false,
          }}
          onColumnVisibilityChange={vi.fn()}
          sorting={[{ id: 'name', desc: false }]}
          onSortingChange={vi.fn()}
          page={1}
          pageSize={25}
          totalCount={1}
          onPageChange={vi.fn()}
          onPageSizeChange={vi.fn()}
        />
      </div>,
    )

    expect(screen.getByPlaceholderText(/search name/i)).toBeTruthy()
    expect(screen.getByRole('table')).toBeTruthy()
    expect(screen.getByText('Ama Boateng')).toBeTruthy()
    expect(screen.getByRole('button', { name: /name/i })).toBeTruthy()
  })
})
