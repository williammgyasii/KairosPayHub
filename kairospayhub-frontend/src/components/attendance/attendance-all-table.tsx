import { useMemo } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type OnChangeFn,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import type { AttendancePresentPerson } from '@/api/attendance'
import { personKindLabel } from '@/components/attendance/attendance-overview-parts'
import { Spinner } from '@/components/ui/spinner'
import { TablePagination } from '@/components/ui/table-pagination'
import { cn } from '@/lib/utils'

const columnHelper = createColumnHelper<AttendancePresentPerson>()

export function AttendanceAllTable({
  rows,
  loading,
  emptyMessage,
  parentColumnLabel,
  unitLayerLabel,
  columnVisibility,
  onColumnVisibilityChange,
  sorting,
  onSortingChange,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pagingDisabled,
}: {
  rows: AttendancePresentPerson[]
  loading?: boolean
  emptyMessage: string
  parentColumnLabel: string
  unitLayerLabel: string
  columnVisibility: VisibilityState
  onColumnVisibilityChange: OnChangeFn<VisibilityState>
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  pagingDisabled?: boolean
}) {
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Name',
        enableHiding: false,
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('cellName', {
        id: 'unit',
        header: unitLayerLabel,
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('parentUnitName', {
        id: 'parentUnit',
        header: parentColumnLabel,
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('personKind', {
        id: 'type',
        header: 'Type',
        cell: (info) => personKindLabel(info.getValue()),
      }),
      columnHelper.accessor('phone', {
        header: 'Phone',
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('invitedByMemberName', {
        id: 'invitedBy',
        header: 'Invited by',
        cell: (info) => info.getValue() || '—',
      }),
    ],
    [parentColumnLabel, unitLayerLabel],
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange,
    onColumnVisibilityChange,
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(totalCount / Math.max(pageSize, 1))),
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) =>
      `${row.scopeNodeId}:${row.name}:${row.personKind}:${row.phone ?? ''}`,
  })

  if (loading) {
    return (
      <div className="rounded-lg border px-4 py-10">
        <Spinner label="Loading attendance…" />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="w-full overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b border-border/60 bg-muted/20 text-left">
                {group.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      'whitespace-nowrap px-4 py-2.5 font-medium text-muted-foreground',
                      header.column.id === 'name' && 'min-w-[9rem]',
                    )}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown
                          className={cn(
                            'size-3 shrink-0',
                            header.column.getIsSorted() ? 'opacity-100' : 'opacity-40',
                          )}
                        />
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={Math.max(table.getVisibleLeafColumns().length, 1)}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-border/40 last:border-0 hover:bg-muted/10">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        'px-4 py-3',
                        cell.column.id === 'name' &&
                          'max-w-[14rem] truncate font-medium whitespace-nowrap',
                        cell.column.id !== 'name' &&
                          cell.column.id !== 'type' &&
                          'text-muted-foreground',
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalCount > 0 ? (
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          disabled={pagingDisabled}
        />
      ) : null}
    </div>
  )
}
