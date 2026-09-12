import { useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, MoreHorizontal } from 'lucide-react'
import type { AttendanceMeetingType } from '@/features/attendance/api'
import { formatMeetingSchedule, formatSubmissionWindow } from '@/features/attendance/lib/attendance-ui'
import { meetingTypeRequiresReportLabel } from '@/features/attendance/lib/report-policy'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { PhoneList } from '@/shared/ui/phone-list'
import { labeledPhoneCard } from '@/shared/lib/phone-list'
import { usePhoneListViewport } from '@/shared/lib/use-phone-list-viewport'
import { Spinner } from '@/shared/ui/spinner'
import { cn } from '@/shared/lib/utils'

const columnHelper = createColumnHelper<AttendanceMeetingType>()

const DATA_CELL = 'w-[16%] px-4 py-3 align-top break-words'

function MeetingTypeRowMenu({
  type,
  onEdit,
  onDelete,
}: {
  type: AttendanceMeetingType
  onEdit: (type: AttendanceMeetingType) => void
  onDelete: (type: AttendanceMeetingType) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(type)}>Edit</DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(type)}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function MeetingTypesTable({
  types,
  loading,
  canManage,
  timeZoneId,
  emptyMessage,
  onEdit,
  onDelete,
}: {
  types: AttendanceMeetingType[]
  loading?: boolean
  canManage: boolean
  timeZoneId?: string | null
  emptyMessage: string
  onEdit: (type: AttendanceMeetingType) => void
  onDelete: (type: AttendanceMeetingType) => void
}) {
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = useMemo(
    () => [
      columnHelper.accessor('title', {
        header: 'Title',
        cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
      }),
      columnHelper.accessor((row) => formatMeetingSchedule(row), {
        id: 'schedule',
        header: 'Schedule',
      }),
      columnHelper.accessor('scopeKind', {
        header: 'Scope',
      }),
      columnHelper.accessor((row) => formatSubmissionWindow(row, timeZoneId), {
        id: 'window',
        header: 'Submission window',
      }),
      columnHelper.accessor((row) => meetingTypeRequiresReportLabel(row), {
        id: 'report',
        header: 'Report',
      }),
      columnHelper.accessor((row) => (row.isActive ? 'Active' : 'Inactive'), {
        id: 'status',
        header: 'Status',
      }),
      ...(canManage
        ? [
            columnHelper.display({
              id: 'actions',
              header: '',
              enableSorting: false,
              cell: ({ row }) => (
                <div className="flex justify-end">
                  <MeetingTypeRowMenu
                    type={row.original}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </div>
              ),
            }),
          ]
        : []),
    ],
    [canManage, onDelete, onEdit, timeZoneId],
  )

  const phone = usePhoneListViewport()
  const table = useReactTable({
    data: types,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  })

  if (loading) {
    return (
      <div className="rounded-lg border px-4 py-10">
        <Spinner label="Loading meeting types…" />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <PhoneList
        phone={phone}
        empty={emptyMessage}
        items={types.map((type) => ({
          id: type.id,
          ...labeledPhoneCard(
            type.title,
            [formatMeetingSchedule(type), meetingTypeRequiresReportLabel(type) === 'Yes' ? 'Report required' : null],
            [
              { label: 'Schedule', value: formatMeetingSchedule(type) },
              { label: 'Scope', value: type.scopeKind },
              { label: 'Window', value: formatSubmissionWindow(type, timeZoneId) },
              { label: 'Report', value: meetingTypeRequiresReportLabel(type) },
              { label: 'Status', value: type.isActive ? 'Active' : 'Inactive' },
            ],
          ),
          actions: canManage ? (
            <MeetingTypeRowMenu type={type} onEdit={onEdit} onDelete={onDelete} />
          ) : undefined,
        }))}
      >
        <div className="w-full overflow-x-auto overscroll-x-contain">
          <table className="w-full table-fixed text-sm">
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id} className="border-b border-border/60 bg-muted/20 text-left">
                  {group.headers.map((header) => (
                    <th
                      key={header.id}
                      className={cn(
                        'px-4 py-2.5 font-medium text-muted-foreground',
                        header.column.id === 'actions' ? 'w-14' : DATA_CELL,
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
                  <tr
                    key={row.id}
                    className="border-b border-border/40 last:border-0 hover:bg-muted/10"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn(
                          cell.column.id === 'actions'
                            ? 'w-14 px-2 py-3 text-right'
                            : cn(DATA_CELL, 'text-muted-foreground'),
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
      </PhoneList>
    </div>
  )
}
