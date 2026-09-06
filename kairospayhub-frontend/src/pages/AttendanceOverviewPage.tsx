import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useOutletContext } from 'react-router-dom'
import { ArrowUpDown, CalendarDays, ChevronRight, Columns3 } from 'lucide-react'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { StructurePageTabs } from '@/components/structure/structure-page-tabs'
import {
  useGetOccurrenceQuery,
  useGetOccurrenceRollupQuery,
  useListMeetingTypesQuery,
  useListOccurrencesQuery,
} from '@/store/attendanceApi'
import type {
  AttendanceOccurrenceRollup,
  AttendanceOccurrenceRollupQuery,
  AttendanceScopeSubmission,
} from '@/api/attendance'
import { isScopedLeader } from '@/api/auth/me'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { TablePagination } from '@/components/ui/table-pagination'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  BY_UNIT_COLUMN_LABELS,
  DEFAULT_BY_UNIT_COLUMN_VISIBILITY,
  DEFAULT_WHO_SHOWED_UP_COLUMN_VISIBILITY,
  formatOccurrenceLabel,
  buildUnitMetricsGroups,
  pickNearestOccurrence,
  selectableOccurrences,
  WHO_SHOWED_UP_COLUMN_LABELS,
  yetToSubmitUnits,
  type ByUnitColumnId,
  type MetricsDetailTabId,
  type WhoShowedUpColumnId,
} from '@/lib/attendance-ui'
import { cn } from '@/lib/utils'

const selectClassName =
  'flex h-9 min-w-[10rem] rounded-md border border-input bg-background px-3 text-sm shadow-sm'

type SortColumn = NonNullable<AttendanceOccurrenceRollupQuery['sortBy']>

const SORT_COLUMNS: { id: SortColumn; columnId: WhoShowedUpColumnId; label: string }[] = [
  { id: 'name', columnId: 'name', label: 'Name' },
  { id: 'cell', columnId: 'unit', label: 'Unit' },
  { id: 'parent', columnId: 'parentUnit', label: 'Parent unit' },
  { id: 'type', columnId: 'type', label: 'Type' },
  { id: 'phone', columnId: 'phone', label: 'Phone' },
  { id: 'invitedBy', columnId: 'invitedBy', label: 'Invited by' },
]

function personKindLabel(kind: string) {
  switch (kind) {
    case 'FirstTimer':
      return 'First timer'
    case 'Invitee':
      return 'Invitee'
    default:
      return 'Member'
  }
}

function formatServiceDate(meetingDate: string) {
  const parsed = new Date(`${meetingDate}T12:00:00`)
  return Number.isNaN(parsed.getTime())
    ? meetingDate
    : parsed.toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
}

function approvalStatusLabel(status: string) {
  switch (status) {
    case 'PendingApproval':
      return 'Pending approval'
    case 'Approved':
      return 'Approved'
    case 'Rejected':
      return 'Rejected'
    case 'Draft':
      return 'Draft'
    default:
      return status
  }
}

function ColumnToggleSwitch({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        'relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors',
        on ? 'bg-emerald-500/80' : 'bg-muted',
      )}
      aria-hidden
    >
      <span
        className={cn(
          'absolute top-0.5 size-3 rounded-full bg-white shadow transition-transform',
          on ? 'translate-x-3.5' : 'translate-x-0.5',
        )}
      />
    </span>
  )
}

function OverviewMetrics({
  rollup,
  pendingCount,
  leading,
  action,
}: {
  rollup: AttendanceOccurrenceRollup | null | undefined
  pendingCount: number
  leading?: ReactNode
  action?: ReactNode
}) {
  const stats = [
    { id: 'present', label: 'Present', value: rollup?.totalPresent ?? '—' },
    {
      id: 'members',
      label: 'Members',
      value: rollup?.membersPresent ?? '—',
      hint: rollup ? `${rollup.membersAbsent} absent` : undefined,
    },
    { id: 'firstTimers', label: 'First-timers', value: rollup?.firstTimersPresent ?? '—' },
    {
      id: 'pending',
      label: 'Pending',
      value: pendingCount,
      tone: pendingCount > 0 ? ('amber' as const) : undefined,
    },
  ]

  return (
    <section className="flex flex-col gap-3 rounded-lg border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      {leading ? <div className="min-w-0 shrink-0 text-sm">{leading}</div> : null}
      <div className="flex flex-wrap items-start gap-x-5 gap-y-3 sm:gap-x-8">
        {stats.map((stat) => (
          <div key={stat.id} className="min-w-[5rem]">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </p>
            <p
              className={cn(
                'mt-0.5 text-lg font-semibold tabular-nums leading-none',
                stat.tone === 'amber' && 'text-amber-800 dark:text-amber-200',
              )}
            >
              {stat.value}
            </p>
            {stat.hint ? (
              <p className="mt-1 text-[11px] text-muted-foreground">{stat.hint}</p>
            ) : null}
          </div>
        ))}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-3">{action}</div> : null}
    </section>
  )
}

function MeetingTypesList({
  meetingTypes,
  loading,
  error,
}: {
  meetingTypes: { id: string; title: string; dayOfWeek: string; submissionLayerName?: string | null }[]
  loading: boolean
  error: string | null
}) {
  return (
    <div className="space-y-6">
      <DashboardPageHeader
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Attendance', to: '/attendance/overview' },
          { label: 'Metrics' },
        ]}
        title="Attendance metrics"
        description="Choose a meeting type to view occurrence totals and unit roll calls."
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <Spinner label="Loading meetings…" />
      ) : meetingTypes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No meeting types set up yet.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {meetingTypes.map((type) => (
            <li key={type.id}>
              <Link
                to={`/attendance/overview/${type.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="font-medium">{type.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {type.dayOfWeek}
                    {type.submissionLayerName
                      ? ` · Submissions at ${type.submissionLayerName}`
                      : null}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function filterUnitRows(
  rows: AttendanceScopeSubmission[],
  search: string,
  statusFilter: string,
) {
  const q = search.trim().toLowerCase()
  return rows.filter((row) => {
    if (statusFilter && row.approvalStatus !== statusFilter) return false
    if (!q) return true
    return (
      row.scopeUnitName.toLowerCase().includes(q) ||
      (row.parentUnitName?.toLowerCase().includes(q) ?? false) ||
      approvalStatusLabel(row.approvalStatus).toLowerCase().includes(q)
    )
  })
}

export function AttendanceOverviewPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const { meetingTypeId: routeTypeId } = useParams<{ meetingTypeId?: string }>()
  const navigate = useNavigate()
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [personKind, setPersonKind] = useState<'' | 'Member' | 'Invitee' | 'FirstTimer'>('')
  const [cellFilter, setCellFilter] = useState('')
  const [unitSearch, setUnitSearch] = useState('')
  const [unitStatusFilter, setUnitStatusFilter] = useState('')
  const [detailTab, setDetailTab] = useState<MetricsDetailTabId>('who')
  const [columnVisibility, setColumnVisibility] = useState(DEFAULT_WHO_SHOWED_UP_COLUMN_VISIBILITY)
  const [byUnitColumnVisibility, setByUnitColumnVisibility] = useState(
    DEFAULT_BY_UNIT_COLUMN_VISIBILITY,
  )
  const [sorting, setSorting] = useState<{ id: SortColumn; desc: boolean }>({
    id: 'name',
    desc: false,
  })

  const selectedTypeId = routeTypeId ?? ''
  const timeZoneId = me.onboarded ? me.timeZoneId : null

  const {
    data: meetingTypes = [],
    isLoading: loadingTypes,
    error: meetingTypesError,
  } = useListMeetingTypesQuery()
  const {
    data: occurrences = [],
    isFetching: loadingOccurrences,
    error: occurrencesError,
  } = useListOccurrencesQuery(selectedTypeId, { skip: !selectedTypeId })

  const rollupQuery = useMemo(
    () => ({
      page,
      pageSize,
      sortBy: sorting.id,
      sortDir: sorting.desc ? ('desc' as const) : ('asc' as const),
      search: debouncedSearch || undefined,
      personKind: personKind || undefined,
      cell: cellFilter || undefined,
    }),
    [page, pageSize, sorting.id, sorting.desc, debouncedSearch, personKind, cellFilter],
  )

  const {
    data: rollup,
    isFetching: loadingRollup,
    error: rollupError,
  } = useGetOccurrenceRollupQuery(
    { occurrenceId: selectedOccurrenceId, query: rollupQuery },
    { skip: !selectedOccurrenceId },
  )

  const {
    data: occurrenceDetail,
    isFetching: loadingDetail,
  } = useGetOccurrenceQuery(selectedOccurrenceId, { skip: !selectedOccurrenceId })

  const pendingCount = rollup?.pendingCellCount ?? 0
  const listError = meetingTypesError ? 'Could not load attendance data' : null
  const detailError =
    occurrencesError || rollupError ? 'Could not load attendance data' : null

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [selectedOccurrenceId, debouncedSearch, personKind, cellFilter, sorting.id, sorting.desc])

  useEffect(() => {
    setSelectedOccurrenceId('')
    setUnitSearch('')
    setUnitStatusFilter('')
  }, [selectedTypeId])

  useEffect(() => {
    if (!selectedTypeId) {
      setSelectedOccurrenceId('')
      return
    }
    const selectable = selectableOccurrences(occurrences, undefined, timeZoneId)
    setSelectedOccurrenceId((current) => {
      if (current && selectable.some((row) => row.id === current)) return current
      return pickNearestOccurrence(selectable, undefined, timeZoneId)?.id ?? ''
    })
  }, [occurrences, selectedTypeId, timeZoneId])

  const selectableOccurrenceRows = useMemo(
    () => selectableOccurrences(occurrences, undefined, timeZoneId),
    [occurrences, timeZoneId],
  )

  const selectedMeetingType = useMemo(
    () => meetingTypes.find((type) => type.id === selectedTypeId) ?? null,
    [meetingTypes, selectedTypeId],
  )

  const selectedOccurrence = useMemo(
    () => selectableOccurrenceRows.find((row) => row.id === selectedOccurrenceId) ?? null,
    [selectableOccurrenceRows, selectedOccurrenceId],
  )

  const unitNoun = selectedMeetingType?.submissionLayerName?.trim() || 'unit'

  const filteredUnits = useMemo(
    () => filterUnitRows(occurrenceDetail?.scopeSubmissions ?? [], unitSearch, unitStatusFilter),
    [occurrenceDetail?.scopeSubmissions, unitSearch, unitStatusFilter],
  )

  const metricsGroups = useMemo(() => buildUnitMetricsGroups(filteredUnits), [filteredUnits])

  const draftUnits = useMemo(
    () =>
      yetToSubmitUnits(
        filterUnitRows(occurrenceDetail?.scopeSubmissions ?? [], unitSearch, ''),
      ),
    [occurrenceDetail?.scopeSubmissions, unitSearch],
  )

  const parentColumnLabel = useMemo(() => {
    const layer = occurrenceDetail?.scopeSubmissions.find((row) => row.parentLayerName?.trim())
      ?.parentLayerName
    return layer?.trim() || WHO_SHOWED_UP_COLUMN_LABELS.parentUnit
  }, [occurrenceDetail?.scopeSubmissions])

  const unitLayerLabel = useMemo(() => {
    const layer = occurrenceDetail?.scopeSubmissions.find((row) => row.layerName?.trim())?.layerName
    return layer?.trim() || unitNoun
  }, [occurrenceDetail?.scopeSubmissions, unitNoun])

  const visibleSortColumns = useMemo(
    () => SORT_COLUMNS.filter((column) => columnVisibility[column.columnId]),
    [columnVisibility],
  )

  const detailTabs = useMemo(
    () => [
      {
        id: 'who',
        label: 'Who showed up',
        count: rollup?.totalCount ?? 0,
      },
      {
        id: 'by-unit',
        label: 'By unit',
        count: occurrenceDetail?.scopeSubmissions.length ?? 0,
      },
      {
        id: 'yet-to-submit',
        label: 'Yet to submit',
        count: yetToSubmitUnits(occurrenceDetail?.scopeSubmissions ?? []).length,
      },
    ],
    [rollup?.totalCount, occurrenceDetail?.scopeSubmissions],
  )

  const scopeLabel =
    me.scopeUnitName ??
    (me.role === 'FellowshipLeader'
      ? 'your fellowship'
      : me.role === 'PFCCManager'
        ? 'your PFCC'
        : 'your church')

  const provisionalTooltip =
    rollup && rollup.pendingCellCount > 0 && rollup.totalPresent > 0
      ? `${rollup.pendingCellCount} roll call(s) still awaiting approval. Totals include approved ${unitNoun.toLowerCase()}s only.`
      : null

  const emptyTableMessage =
    rollup && rollup.pendingCellCount > 0 && rollup.totalPresent === 0
      ? `${rollup.pendingCellCount} roll call(s) are still in the approval queue. Approve submitted roll calls or wait for units to submit.`
      : 'No approved attendance for this service yet. Totals appear after unit leaders mark attendance and parent leaders approve.'

  function toggleSort(column: SortColumn) {
    setSorting((current) =>
      current.id === column
        ? { id: column, desc: !current.desc }
        : { id: column, desc: false },
    )
  }

  function toggleColumn(columnId: WhoShowedUpColumnId) {
    if (columnId === 'name') return
    setColumnVisibility((current) => ({ ...current, [columnId]: !current[columnId] }))
  }

  function toggleByUnitColumn(columnId: ByUnitColumnId) {
    if (columnId === 'unit') return
    setByUnitColumnVisibility((current) => ({ ...current, [columnId]: !current[columnId] }))
  }

  if (!selectedTypeId) {
    return (
      <MeetingTypesList
        meetingTypes={meetingTypes}
        loading={loadingTypes}
        error={listError}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <DashboardPageHeader
          breadcrumbs={[
            { label: 'Dashboard', to: '/' },
            { label: 'Attendance', to: '/attendance/overview' },
            { label: 'Metrics', to: '/attendance/overview' },
            { label: selectedMeetingType?.title ?? 'Meeting' },
          ]}
          title={selectedMeetingType?.title ?? 'Attendance metrics'}
          description={`Attendance totals and who showed up in ${scopeLabel}.`}
          className="flex-1"
        />

        {!loadingTypes && (
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="overview-occurrence" className="text-xs text-muted-foreground">
                Service date
              </Label>
              <select
                id="overview-occurrence"
                value={selectedOccurrenceId}
                onChange={(e) => setSelectedOccurrenceId(e.target.value)}
                disabled={loadingOccurrences || selectableOccurrenceRows.length === 0}
                className={selectClassName}
              >
                {selectableOccurrenceRows.map((occurrence) => (
                  <option key={occurrence.id} value={occurrence.id}>
                    {formatOccurrenceLabel(occurrence)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {detailError && <p className="text-sm text-destructive">{detailError}</p>}

      {!selectedMeetingType && !loadingTypes ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Meeting type not found.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => navigate('/attendance/overview')}>
            Back to meeting types
          </Button>
        </div>
      ) : (
        <>
          <OverviewMetrics
            rollup={rollup}
            pendingCount={pendingCount}
            leading={
              selectedMeetingType && selectedOccurrence ? (
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="size-4 shrink-0 text-primary" />
                  <span>
                    <span className="font-medium">{selectedMeetingType.title}</span>
                    {' · '}
                    <span className="font-medium">
                      {formatServiceDate(selectedOccurrence.meetingDate)}
                    </span>
                  </span>
                </div>
              ) : undefined
            }
            action={
              pendingCount > 0 && isScopedLeader(me.role) ? (
                provisionalTooltip ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/attendance/approvals">Review {pendingCount} pending</Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      {provisionalTooltip}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/attendance/approvals">Review {pendingCount} pending</Link>
                  </Button>
                )
              ) : undefined
            }
          />

          <section className="space-y-4 rounded-lg border">
            <div className="px-4 pt-2">
              <StructurePageTabs
                tabs={detailTabs}
                activeId={detailTab}
                onChange={(id) => setDetailTab(id as MetricsDetailTabId)}
              />
            </div>

            {detailTab === 'who' ? (
              <>
                <div className="flex flex-col gap-3 px-4 pb-2 lg:flex-row lg:items-end lg:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {rollup
                      ? `${rollup.totalCount} people marked present for this service`
                      : 'Select a service date above'}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search name, phone, unit…"
                      className="h-9 w-full sm:w-56"
                    />
                    <select
                      value={personKind}
                      onChange={(e) =>
                        setPersonKind(e.target.value as '' | 'Member' | 'Invitee' | 'FirstTimer')
                      }
                      className={cn(selectClassName, 'sm:w-40')}
                    >
                      <option value="">All types</option>
                      <option value="Member">Members</option>
                      <option value="Invitee">Invitees / guests</option>
                      <option value="FirstTimer">First timers</option>
                    </select>
                    <Input
                      value={cellFilter}
                      onChange={(e) => setCellFilter(e.target.value)}
                      placeholder="Filter by unit"
                      className="h-9 w-full sm:w-40"
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" size="sm" variant="outline" className="h-9 gap-1.5">
                          <Columns3 className="size-3.5" />
                          Columns
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Show columns</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {(Object.keys(WHO_SHOWED_UP_COLUMN_LABELS) as WhoShowedUpColumnId[]).map(
                          (columnId) => (
                            <DropdownMenuItem
                              key={columnId}
                              disabled={columnId === 'name'}
                              className="justify-between gap-3"
                              onSelect={(event) => {
                                event.preventDefault()
                                toggleColumn(columnId)
                              }}
                            >
                              {columnId === 'parentUnit'
                                ? parentColumnLabel
                                : columnId === 'unit'
                                  ? unitLayerLabel
                                  : WHO_SHOWED_UP_COLUMN_LABELS[columnId]}
                              <ColumnToggleSwitch on={columnVisibility[columnId]} />
                            </DropdownMenuItem>
                          ),
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {loadingOccurrences || (loadingRollup && !rollup) ? (
                  <div className="px-4 py-10">
                    <Spinner label="Loading attendance…" />
                  </div>
                ) : rollup && rollup.totalPresent > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            {visibleSortColumns.map((column) => (
                              <th
                                key={column.id}
                                className={cn(
                                  'px-4 py-2 font-medium',
                                  column.id === 'name' && 'min-w-[9rem]',
                                )}
                              >
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 hover:text-foreground"
                                  onClick={() => toggleSort(column.id)}
                                >
                                  {column.columnId === 'parentUnit'
                                    ? parentColumnLabel
                                    : column.columnId === 'unit'
                                      ? unitLayerLabel
                                      : column.label}
                                  <ArrowUpDown
                                    className={cn(
                                      'size-3',
                                      sorting.id === column.id ? 'opacity-100' : 'opacity-40',
                                    )}
                                  />
                                </button>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {rollup.items.map((person) => (
                            <tr
                              key={`${person.scopeNodeId}:${person.name}:${person.personKind}:${person.phone ?? ''}`}
                            >
                              {columnVisibility.name ? (
                                <td className="max-w-[14rem] truncate px-4 py-3 font-medium whitespace-nowrap">
                                  {person.name}
                                </td>
                              ) : null}
                              {columnVisibility.unit ? (
                                <td className="px-4 py-3 text-muted-foreground">{person.cellName}</td>
                              ) : null}
                              {columnVisibility.parentUnit ? (
                                <td className="px-4 py-3 text-muted-foreground">
                                  {person.parentUnitName || '—'}
                                </td>
                              ) : null}
                              {columnVisibility.type ? (
                                <td className="px-4 py-3">{personKindLabel(person.personKind)}</td>
                              ) : null}
                              {columnVisibility.phone ? (
                                <td className="px-4 py-3 text-muted-foreground">
                                  {person.phone || '—'}
                                </td>
                              ) : null}
                              {columnVisibility.invitedBy ? (
                                <td className="px-4 py-3 text-muted-foreground">
                                  {person.invitedByMemberName || '—'}
                                </td>
                              ) : null}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <TablePagination
                      page={rollup.page}
                      pageSize={rollup.pageSize}
                      totalCount={rollup.totalCount}
                      onPageChange={setPage}
                      onPageSizeChange={(size) => {
                        setPageSize(size)
                        setPage(1)
                      }}
                      disabled={loadingRollup}
                    />
                  </>
                ) : (
                  <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {emptyTableMessage}
                  </p>
                )}
              </>
            ) : detailTab === 'by-unit' ? (
              <>
                <div className="flex flex-col gap-3 px-4 pb-2 lg:flex-row lg:items-end lg:justify-between">
                  <p className="text-sm text-muted-foreground">
                    How many each {unitLayerLabel.toLowerCase()} brought, nested under{' '}
                    {parentColumnLabel.toLowerCase()} when available.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <Input
                      value={unitSearch}
                      onChange={(e) => setUnitSearch(e.target.value)}
                      placeholder={`Search ${unitLayerLabel.toLowerCase()}…`}
                      className="h-9 w-full sm:w-56"
                    />
                    <select
                      value={unitStatusFilter}
                      onChange={(e) => setUnitStatusFilter(e.target.value)}
                      className={cn(selectClassName, 'sm:w-44')}
                    >
                      <option value="">All statuses</option>
                      <option value="Draft">Draft</option>
                      <option value="PendingApproval">Pending approval</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" size="sm" variant="outline" className="h-9 gap-1.5">
                          <Columns3 className="size-3.5" />
                          Columns
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Show columns</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {(Object.keys(BY_UNIT_COLUMN_LABELS) as ByUnitColumnId[]).map((columnId) => (
                          <DropdownMenuItem
                            key={columnId}
                            disabled={columnId === 'unit'}
                            className="justify-between gap-3"
                            onSelect={(event) => {
                              event.preventDefault()
                              toggleByUnitColumn(columnId)
                            }}
                          >
                            {columnId === 'unit' ? unitLayerLabel : BY_UNIT_COLUMN_LABELS[columnId]}
                            <ColumnToggleSwitch on={byUnitColumnVisibility[columnId]} />
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {loadingOccurrences || (loadingDetail && !occurrenceDetail) ? (
                  <div className="px-4 py-10">
                    <Spinner label="Loading units…" />
                  </div>
                ) : filteredUnits.length > 0 ? (
                  <div className="space-y-5 overflow-x-auto px-0 pb-4">
                    {metricsGroups.map((group) => (
                      <div key={group.groupLabel || 'flat'} className="space-y-0">
                        {group.groupLabel ? (
                          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b bg-muted/30 px-4 py-2.5">
                            <div>
                              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                {group.parentLayerName || parentColumnLabel}
                              </p>
                              <p className="text-sm font-semibold">{group.groupLabel}</p>
                            </div>
                            <p className="text-xs tabular-nums text-muted-foreground">
                              {group.present} present · {group.members} members ·{' '}
                              {group.firstTimers} first-timers · {group.guests} guests
                            </p>
                          </div>
                        ) : null}
                        <table className="w-full min-w-[720px] text-sm">
                          <thead>
                            <tr className="border-b text-left text-xs text-muted-foreground">
                              {byUnitColumnVisibility.unit ? (
                                <th className="px-4 py-2 font-medium">{unitLayerLabel}</th>
                              ) : null}
                              {byUnitColumnVisibility.present ? (
                                <th className="px-4 py-2 font-medium">Present</th>
                              ) : null}
                              {byUnitColumnVisibility.members ? (
                                <th className="px-4 py-2 font-medium">Members</th>
                              ) : null}
                              {byUnitColumnVisibility.firstTimers ? (
                                <th className="px-4 py-2 font-medium">First-timers</th>
                              ) : null}
                              {byUnitColumnVisibility.guests ? (
                                <th className="px-4 py-2 font-medium">Guests</th>
                              ) : null}
                              {byUnitColumnVisibility.status ? (
                                <th className="px-4 py-2 font-medium">Status</th>
                              ) : null}
                              {byUnitColumnVisibility.submitted ? (
                                <th className="px-4 py-2 font-medium">Submitted</th>
                              ) : null}
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {group.rows.map((unit) => (
                              <tr key={unit.id}>
                                {byUnitColumnVisibility.unit ? (
                                  <td className="px-4 py-3 font-medium">{unit.scopeUnitName}</td>
                                ) : null}
                                {byUnitColumnVisibility.present ? (
                                  <td className="px-4 py-3 tabular-nums">{unit.totalPresent ?? 0}</td>
                                ) : null}
                                {byUnitColumnVisibility.members ? (
                                  <td className="px-4 py-3 tabular-nums">
                                    {unit.membersPresent ?? 0}
                                  </td>
                                ) : null}
                                {byUnitColumnVisibility.firstTimers ? (
                                  <td className="px-4 py-3 tabular-nums">
                                    {unit.firstTimersPresent ?? 0}
                                  </td>
                                ) : null}
                                {byUnitColumnVisibility.guests ? (
                                  <td className="px-4 py-3 tabular-nums">
                                    {unit.guestsPresent ?? 0}
                                  </td>
                                ) : null}
                                {byUnitColumnVisibility.status ? (
                                  <td className="px-4 py-3">
                                    {approvalStatusLabel(unit.approvalStatus)}
                                  </td>
                                ) : null}
                                {byUnitColumnVisibility.submitted ? (
                                  <td className="px-4 py-3 text-muted-foreground">
                                    {unit.submittedAt
                                      ? new Date(unit.submittedAt).toLocaleString(undefined, {
                                          dateStyle: 'medium',
                                          timeStyle: 'short',
                                        })
                                      : '—'}
                                  </td>
                                ) : null}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {(occurrenceDetail?.scopeSubmissions.length ?? 0) === 0
                      ? 'No unit sheets for this service yet. Sheets appear when the meeting occurrence is generated.'
                      : unitSearch || unitStatusFilter
                        ? 'No unit roll calls match these filters.'
                        : 'No unit roll calls yet. Leaders mark attendance from Mark attendance, then parent leaders approve.'}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-col gap-3 px-4 pb-2 lg:flex-row lg:items-end lg:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {unitLayerLabel}s that have not submitted roll call yet.
                  </p>
                  <Input
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                    placeholder={`Search ${unitLayerLabel.toLowerCase()}…`}
                    className="h-9 w-full sm:w-56"
                  />
                </div>
                {loadingOccurrences || (loadingDetail && !occurrenceDetail) ? (
                  <div className="px-4 py-10">
                    <Spinner label="Loading units…" />
                  </div>
                ) : draftUnits.length > 0 ? (
                  <div className="overflow-x-auto pb-4">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-muted-foreground">
                          <th className="px-4 py-2 font-medium">{unitLayerLabel}</th>
                          <th className="px-4 py-2 font-medium">{parentColumnLabel}</th>
                          <th className="px-4 py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {draftUnits.map((unit) => (
                          <tr key={unit.id}>
                            <td className="px-4 py-3 font-medium">{unit.scopeUnitName}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {unit.parentUnitName || '—'}
                            </td>
                            <td className="px-4 py-3">{approvalStatusLabel(unit.approvalStatus)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {(occurrenceDetail?.scopeSubmissions.length ?? 0) === 0
                      ? 'No unit sheets for this service yet.'
                      : unitSearch
                        ? 'No matching units still waiting to submit.'
                        : 'Every unit has submitted roll call for this service.'}
                  </p>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}
