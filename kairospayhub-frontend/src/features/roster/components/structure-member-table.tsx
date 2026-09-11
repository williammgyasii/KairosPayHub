import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type OnChangeFn,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import type { StructureLayer } from '@/api/structure'
import { formatOccupationStatus } from '@/lib/member-filters'
import { defaultMembershipColumnVisibility, membershipColumnMinWidthClass } from '@/features/roster/lib/membership-table-columns'
import {
  membershipStickyColumnLeft,
  membershipStickyColumnWidth,
} from '@/features/roster/lib/membership-table-sticky'
import type { StructureMemberRow } from '@/lib/structure-table-rows'
import { ResponsivenessBadge } from '@/features/roster/components/responsiveness-badge'
import { RoleBadge, StructureSegmentBadge } from '@/shared/ui/structure-badges'
import { Input } from '@/shared/ui/input'
import {
  membershipNewBadgeClass,
  membershipYouBadgeClass,
  membershipRowTone,
  membershipRowToneClass,
  membershipStickyRowClass,
} from '@/features/roster/lib/membership-row-presentation'
import { Badge } from '@/shared/ui/badge'
import { PhoneList } from '@/shared/ui/phone-list'
import { isPhoneListViewport } from '@/shared/lib/phone-list'
import { membershipPhoneCard } from '@/features/roster/lib/phone-cards'
import { cn } from '@/shared/lib/utils'
import {
  MemberRowMenu,
  type MemberViewDestination,
} from '@/features/roster/components/structure-member-row-menu'

export type { MemberViewDestination }

interface StructureMemberTableProps {
  rows: StructureMemberRow[]
  structureLayers: Pick<StructureLayer, 'id' | 'displayName' | 'standardType'>[]
  title?: string
  description?: string
  emptyMessage?: string
  onEdit?: (member: StructureMemberRow) => void
  onView?: (member: StructureMemberRow, destination?: MemberViewDestination) => void
  onDelete?: (member: StructureMemberRow) => void
  onAccept?: (member: StructureMemberRow) => void
  onDecline?: (member: StructureMemberRow) => void
  currentMemberId?: string | null
  showSearch?: boolean
  /** @deprecated Prefer columnVisibility; true seeds full profile columns with defaults. */
  extendedColumns?: boolean
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>
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

function formatMemberDob(value: string) {
  if (!value.trim()) return '—'
  try {
    return format(parseISO(value), 'PP')
  } catch {
    return value
  }
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
  onAccept,
  onDecline,
  currentMemberId = null,
  showSearch = true,
  extendedColumns = false,
  columnVisibility: columnVisibilityProp,
  onColumnVisibilityChange,
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
  const [viewportWidth, setViewportWidth] = useState(
    typeof window === 'undefined' ? 1024 : window.innerWidth,
  )
  const sorting = sortingProp ?? localSorting
  const setSorting = onSortingChangeProp ?? setLocalSorting

  const defaultVisibility = useMemo(
    () => defaultMembershipColumnVisibility(structureLayers),
    [structureLayers],
  )
  const [localVisibility, setLocalVisibility] = useState<VisibilityState>(() => defaultVisibility)
  const useToggleableColumns = !compactLayout && (extendedColumns || columnVisibilityProp != null)
  const columnVisibility = useToggleableColumns
    ? (columnVisibilityProp ?? localVisibility)
    : undefined
  const setColumnVisibility = onColumnVisibilityChange ?? setLocalVisibility

  useEffect(() => {
    if (columnVisibilityProp != null) return
    setLocalVisibility(defaultVisibility)
  }, [defaultVisibility, columnVisibilityProp])

  useEffect(() => {
    function onResize() {
      setViewportWidth(window.innerWidth)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const columns = useMemo(
    () =>
      createMemberColumns(
        structureLayers,
        { onEdit, onView, onDelete, onAccept, onDecline, readOnly, currentMemberId },
        { toggleableProfile: useToggleableColumns, compactLayout },
      ),
    [structureLayers, onEdit, onView, onDelete, onAccept, onDecline, currentMemberId, useToggleableColumns, compactLayout, readOnly],
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      globalFilter: filter,
      ...(columnVisibility ? { columnVisibility } : {}),
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    onColumnVisibilityChange: columnVisibility ? setColumnVisibility : undefined,
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
  const showRowActions = Boolean(onView || onDelete || onEdit || onAccept || onDecline)
  const phoneItems = table.getRowModel().rows.map((row) => {
    const tone = membershipRowTone({
      ...row.original,
      memberId: row.original.id,
      currentMemberId,
    })
    const card = membershipPhoneCard(row.original, structureLayers)
    return {
      id: row.original.id,
      ...card,
      toneClassName: membershipRowToneClass(tone),
      badges: (
        <>
          {tone === 'pending' ? (
            <Badge className="shrink-0 border-amber-200 bg-amber-100 text-amber-950 hover:bg-amber-100">
              Pending
            </Badge>
          ) : null}
          {tone === 'you' ? (
            <Badge className={cn('shrink-0', membershipYouBadgeClass())}>You</Badge>
          ) : null}
          {tone === 'new' ? (
            <Badge className={cn('shrink-0', membershipNewBadgeClass())}>New</Badge>
          ) : null}
        </>
      ),
      actions: showRowActions ? (
        <MemberRowMenu
          member={row.original}
          onEdit={onEdit}
          onView={onView}
          onDelete={onDelete}
          onAccept={onAccept}
          onDecline={onDecline}
          currentMemberId={currentMemberId}
          readOnly={readOnly}
        />
      ) : undefined,
    }
  })

  function stickyClasses(
    columnId: string,
    kind: 'th' | 'td',
    rowTone?: ReturnType<typeof membershipRowTone>,
    odd = false,
  ) {
    const left = membershipStickyColumnLeft(columnId)
    if (left == null) return 'relative z-0'
    return cn(
      'sticky border-border bg-clip-padding border-r-2 border-r-border shadow-[6px_0_10px_-6px_rgba(15,23,42,0.35)] dark:shadow-[6px_0_10px_-6px_rgba(0,0,0,0.65)]',
      kind === 'th' && 'z-[45] !bg-muted',
      kind === 'td' && 'z-[35]',
      kind === 'td' && membershipStickyRowClass(rowTone ?? 'default', odd),
    )
  }

  function stickyStyle(columnId: string): CSSProperties | undefined {
    const left = membershipStickyColumnLeft(columnId)
    const width = membershipStickyColumnWidth(columnId, viewportWidth)
    if (left == null || width == null) return undefined
    return {
      left,
      minWidth: width,
      width,
      backgroundClip: 'padding-box',
    }
  }

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

      <PhoneList
        phone={isPhoneListViewport(viewportWidth)}
        items={phoneItems}
        empty={emptyMessage}
      >
      <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
        <table
          className={cn(
            'w-full text-sm',
            viewportWidth >= 1024 && !compactLayout && useToggleableColumns && 'min-w-[1400px]',
            viewportWidth >= 1024 && !compactLayout && !useToggleableColumns && 'min-w-[760px]',
          )}
        >
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border/60 bg-muted/20 text-left">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      'whitespace-nowrap px-5 py-2.5 font-medium text-muted-foreground',
                      stickyClasses(header.column.id, 'th'),
                      membershipColumnMinWidthClass(header.column.id),
                    )}
                    style={stickyStyle(header.column.id)}
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 whitespace-nowrap hover:text-foreground"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown className="size-3 shrink-0 opacity-50" />
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
                <td
                  colSpan={Math.max(table.getVisibleLeafColumns().length, 1)}
                  className="px-5 py-10 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, rowIndex) => {
                const tone = membershipRowTone({
                  ...row.original,
                  memberId: row.original.id,
                  currentMemberId,
                })
                return (
                <tr
                  key={row.id}
                  className={cn(
                    'group border-b border-border/40 last:border-0',
                    membershipRowToneClass(tone) || 'hover:bg-muted/10',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        'px-5 py-3 align-middle',
                        stickyClasses(cell.column.id, 'td', tone, rowIndex % 2 === 1),
                        membershipColumnMinWidthClass(cell.column.id),
                      )}
                      style={stickyStyle(cell.column.id)}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      </PhoneList>

      {footer}
    </section>
  )
}

function createMemberColumns(
  structureLayers: Pick<StructureLayer, 'id' | 'displayName' | 'standardType'>[],
  actions: {
    onEdit?: (member: StructureMemberRow) => void
    onView?: (member: StructureMemberRow, destination?: MemberViewDestination) => void
    onDelete?: (member: StructureMemberRow) => void
    onAccept?: (member: StructureMemberRow) => void
    onDecline?: (member: StructureMemberRow) => void
    currentMemberId?: string | null
    readOnly?: boolean
  },
  options: { toggleableProfile: boolean; compactLayout: boolean },
) {
  const helper = createColumnHelper<StructureMemberRow>()
  const showActions = Boolean(
    actions.onView || actions.onDelete || actions.onEdit || actions.onAccept || actions.onDecline,
  )

  const structureColumns = options.compactLayout
    ? []
    : structureLayers.map((layer) =>
        helper.display({
          id: `structure-${layer.id}`,
          header: layer.displayName,
          enableHiding: true,
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

  const profileColumns = options.toggleableProfile
    ? [
        helper.accessor('email', {
          header: 'Email',
          enableHiding: true,
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
        helper.accessor('phone', {
          header: 'Phone',
          enableHiding: true,
          cell: ({ getValue }) => (
            <span className="whitespace-nowrap text-muted-foreground">{getValue() || '—'}</span>
          ),
        }),
        helper.accessor('age', {
          header: 'Age',
          enableHiding: true,
          cell: ({ getValue }) => (
            <span className="tabular-nums text-muted-foreground">{getValue() || '—'}</span>
          ),
        }),
        helper.accessor('dateOfBirth', {
          header: 'Date of birth',
          enableHiding: true,
          cell: ({ getValue }) => (
            <span className="whitespace-nowrap text-muted-foreground">
              {formatMemberDob(getValue() || '')}
            </span>
          ),
        }),
        helper.accessor('residence', {
          header: 'Residence',
          enableHiding: true,
          cell: ({ getValue }) => (
            <span className="max-w-[10rem] truncate text-muted-foreground">{getValue() || '—'}</span>
          ),
        }),
        helper.accessor('state', {
          header: 'State',
          enableHiding: true,
          cell: ({ getValue }) => (
            <span className="max-w-[8rem] truncate text-muted-foreground">{getValue() || '—'}</span>
          ),
        }),
        helper.accessor('occupationStatus', {
          header: 'Occupation',
          enableHiding: true,
          cell: ({ getValue }) => (
            <span className="text-muted-foreground">{formatOccupationStatus(getValue())}</span>
          ),
        }),
        helper.accessor('schoolOrWorkplace', {
          header: 'School',
          enableHiding: true,
          cell: ({ getValue }) => (
            <span className="max-w-[10rem] truncate text-muted-foreground">{getValue() || '—'}</span>
          ),
        }),
        helper.accessor('workplace', {
          header: 'Workplace',
          enableHiding: true,
          cell: ({ getValue }) => (
            <span className="max-w-[10rem] truncate text-muted-foreground">{getValue() || '—'}</span>
          ),
        }),
        helper.accessor('responsiveness', {
          header: 'Responsiveness',
          enableHiding: true,
          cell: ({ getValue }) => <ResponsivenessBadge level={getValue()} />,
        }),
        helper.accessor('role', {
          header: 'Role',
          enableHiding: true,
          cell: ({ row }) => (
            <div className="whitespace-nowrap">
              <RoleBadge role={row.original.role} position={row.original.position} />
            </div>
          ),
        }),
      ]
    : [
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
      ]

  return [
    helper.accessor('member', {
      header: 'Name',
      enableHiding: false,
      cell: ({ row, getValue }) => {
        const tone = membershipRowTone({
          ...row.original,
          memberId: row.original.id,
          currentMemberId: actions.currentMemberId,
        })
        return (
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate font-medium">{getValue()}</span>
          {tone === 'pending' ? (
            <Badge className="ml-0.5 shrink-0 border-amber-200 bg-amber-100 text-amber-950 hover:bg-amber-100">
              Pending
            </Badge>
          ) : null}
          {tone === 'you' ? (
            <Badge className={cn('ml-0.5 shrink-0', membershipYouBadgeClass())}>You</Badge>
          ) : null}
          {tone === 'new' ? (
            <Badge className={cn('ml-0.5 shrink-0', membershipNewBadgeClass())}>New</Badge>
          ) : null}
          {showActions ? <MemberRowMenu member={row.original} {...actions} /> : null}
        </div>
        )
      },
    }),
    ...profileColumns,
    ...structureColumns,
  ]
}
