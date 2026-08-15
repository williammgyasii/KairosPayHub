import { useMemo, useState, type ReactNode } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type OnChangeFn,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, Coins, Eye, FileText, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import type { StructureLayer } from '@/api/structure'
import { formatOccupationStatus } from '@/lib/member-filters'
import type { StructureMemberRow } from '@/lib/structure-table-rows'
import type { MemberDetailTab } from '@/components/structure/member-detail-sheet'
import { ResponsivenessBadge } from '@/components/structure/responsiveness-badge'
import { RoleBadge, StructureSegmentBadge } from '@/components/structure/structure-badges'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface StructureMemberTableProps {
  rows: StructureMemberRow[]
  structureLayers: Pick<StructureLayer, 'id' | 'displayName' | 'standardType'>[]
  title?: string
  description?: string
  emptyMessage?: string
  onEdit?: (member: StructureMemberRow) => void
  onView?: (member: StructureMemberRow, tab?: MemberDetailTab) => void
  onDelete?: (member: StructureMemberRow) => void
  showSearch?: boolean
  extendedColumns?: boolean
  compactLayout?: boolean
  hideHeader?: boolean
  toolbar?: ReactNode
  footer?: ReactNode
  totalCount?: number
  embedded?: boolean
  className?: string
  serverSorting?: boolean
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
  readOnly?: boolean
}

export function StructureMemberTable({
  rows,
  structureLayers,
  title = 'Members',
  description,
  emptyMessage = 'No members yet.',
  onEdit,
  onView,
  onDelete,
  showSearch = true,
  extendedColumns = false,
  compactLayout = false,
  hideHeader = false,
  toolbar,
  footer,
  totalCount,
  embedded = false,
  className,
  serverSorting = false,
  sorting: sortingProp,
  onSortingChange: onSortingChangeProp,
  readOnly = false,
}: StructureMemberTableProps) {
  const [localSorting, setLocalSorting] = useState<SortingState>([])
  const [filter, setFilter] = useState('')
  const sorting = sortingProp ?? localSorting
  const setSorting = onSortingChangeProp ?? setLocalSorting

  const columns = useMemo(
    () =>
      createMemberColumns(
        structureLayers,
        { onEdit, onView, onDelete, readOnly },
        { extendedColumns, compactLayout },
      ),
    [structureLayers, onEdit, onView, onDelete, extendedColumns, compactLayout, readOnly],
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    manualSorting: serverSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: serverSorting ? undefined : getSortedRowModel(),
    getFilteredRowModel: serverSorting ? undefined : getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).toLowerCase()
      if (!q) return true
      const member = row.original
      return (
        member.member.toLowerCase().includes(q) ||
        member.phone.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        member.residence.toLowerCase().includes(q) ||
        member.structure.some((s) => s.nodeName.toLowerCase().includes(q))
      )
    },
  })

  const countLabel =
    totalCount != null && totalCount !== rows.length
      ? `${rows.length} of ${totalCount}`
      : `${rows.length}`

  return (
    <section
      className={cn(
        'w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-border/60 bg-background',
        className,
      )}
    >
      {toolbar}

      {!hideHeader && (
        <div className="flex min-w-0 flex-col gap-3 border-b border-border/60 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
          {!embedded ? (
            <div className="min-w-0 shrink-0">
              <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description ?? `${countLabel} shown`}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{countLabel} shown</p>
          )}

          {showSearch && (
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search members…"
              className="h-9 w-full max-w-xs lg:ml-auto"
            />
          )}
        </div>
      )}

      <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
        <table
          className={cn(
            'w-full text-sm',
            !compactLayout && extendedColumns && 'min-w-[1200px]',
            !compactLayout && !extendedColumns && 'min-w-[760px]',
          )}
        >
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border/60 bg-muted/20 text-left">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      'px-5 py-2.5 font-medium text-muted-foreground',
                      header.column.id === 'member' && 'min-w-[9rem]',
                      header.column.id === 'email' && 'w-[9rem] max-w-[9rem]',
                    )}
                  >
                    {header.isPlaceholder ? null : header.column.id === 'actions' ? null : (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown className="size-3 opacity-50" />
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-10 text-center text-muted-foreground">
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
                        'px-5 py-3 align-middle',
                        cell.column.id === 'member' && 'min-w-[9rem]',
                        cell.column.id === 'email' && 'w-[9rem] max-w-[9rem]',
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

      {footer}
    </section>
  )
}

function createMemberColumns(
  structureLayers: Pick<StructureLayer, 'id' | 'displayName' | 'standardType'>[],
  actions: {
    onEdit?: (member: StructureMemberRow) => void
    onView?: (member: StructureMemberRow, tab?: MemberDetailTab) => void
    onDelete?: (member: StructureMemberRow) => void
    readOnly?: boolean
  },
  options: { extendedColumns: boolean; compactLayout: boolean },
) {
  const helper = createColumnHelper<StructureMemberRow>()
  const showActions = Boolean(actions.onView || actions.onDelete || actions.onEdit)

  const structureColumns = options.compactLayout
    ? []
    : structureLayers.map((layer) =>
        helper.display({
          id: `structure-${layer.id}`,
          header: layer.displayName,
          cell: ({ row }) => {
            const segment = row.original.structure.find(
              (s) => s.layerId === layer.id || s.standardType === layer.standardType,
            )
            return segment ? (
              <StructureSegmentBadge segment={segment} />
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          },
        }),
      )

  const profileColumns = options.extendedColumns
    ? [
        helper.accessor('email', {
          header: 'Email',
          cell: ({ getValue }) => {
            const email = getValue()?.trim()
            if (!email) {
              return <span className="text-muted-foreground">—</span>
            }
            return (
              <a
                href={`mailto:${email}`}
                className="block truncate text-muted-foreground hover:text-primary hover:underline"
                title={email}
                onClick={(e) => e.stopPropagation()}
              >
                {email}
              </a>
            )
          },
        }),
        helper.accessor('residence', {
          header: 'Residence',
          cell: ({ getValue }) => (
            <span className="max-w-[10rem] truncate text-muted-foreground">{getValue() || '—'}</span>
          ),
        }),
        helper.accessor('occupationStatus', {
          header: 'Occupation',
          cell: ({ getValue }) => (
            <span className="text-muted-foreground">{formatOccupationStatus(getValue())}</span>
          ),
        }),
        helper.accessor('schoolOrWorkplace', {
          header: 'School / work',
          cell: ({ getValue }) => (
            <span className="max-w-[10rem] truncate text-muted-foreground">{getValue() || '—'}</span>
          ),
        }),
      ]
    : []

  return [
    helper.accessor('member', {
      header: 'Name',
      cell: ({ getValue }) => (
        <span className="block max-w-[14rem] truncate font-medium">{getValue()}</span>
      ),
    }),
    ...profileColumns,
    ...structureColumns,
    helper.accessor('responsiveness', {
      header: 'Responsiveness',
      cell: ({ getValue }) => <ResponsivenessBadge level={getValue()} />,
    }),
    helper.accessor('role', {
      header: 'Role',
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          <RoleBadge role={row.original.role} position={row.original.position} />
        </div>
      ),
    }),
    helper.accessor('phone', {
      header: 'Phone',
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap text-muted-foreground">{getValue() || '—'}</span>
      ),
    }),
    helper.accessor('age', {
      header: 'Age',
      cell: ({ getValue }) => (
        <span className="tabular-nums text-muted-foreground">{getValue() || '—'}</span>
      ),
    }),
    ...(showActions
      ? [
          helper.display({
            id: 'actions',
            header: '',
            cell: ({ row }) => <MemberRowMenu member={row.original} {...actions} />,
          }),
        ]
      : []),
  ]
}

function MemberRowMenu({
  member,
  onEdit,
  onView,
  onDelete,
  readOnly = false,
}: {
  member: StructureMemberRow
  onEdit?: (member: StructureMemberRow) => void
  onView?: (member: StructureMemberRow, tab?: MemberDetailTab) => void
  onDelete?: (member: StructureMemberRow) => void
  readOnly?: boolean
}) {
  const canEdit = !readOnly && Boolean(onEdit)
  const canDelete = !readOnly && Boolean(onDelete)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground"
          aria-label={`Actions for ${member.member}`}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {onView && (
          <>
            <DropdownMenuItem className="gap-2" onClick={() => onView(member, 'overview')}>
              <Eye className="size-4" />
              View profile
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={() => onView(member, 'records')}>
              <FileText className="size-4" />
              View records
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={() => onView(member, 'giving')}>
              <Coins className="size-4" />
              View giving
            </DropdownMenuItem>
          </>
        )}
        {canEdit && (
          <DropdownMenuItem className="gap-2" onClick={() => onEdit?.(member)}>
            <Pencil className="size-4" />
            Edit profile
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            {(onView || canEdit) && <DropdownMenuSeparator />}
            <DropdownMenuItem
              className="gap-2 text-destructive focus:text-destructive"
              onClick={() => onDelete?.(member)}
            >
              <Trash2 className="size-4" />
              Remove member
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
