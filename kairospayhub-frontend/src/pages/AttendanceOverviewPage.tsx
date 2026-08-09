import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpDown, CalendarDays } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import {
  useGetOccurrenceRollupQuery,
  useListApprovalQueueQuery,
  useListMeetingTypesQuery,
  useListOccurrencesQuery,
} from '@/store/attendanceApi'
import type {
  AttendanceOccurrenceRollup,
  AttendanceOccurrenceRollupQuery,
} from '@/api/attendance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { TablePagination } from '@/components/ui/table-pagination'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  formatOccurrenceLabel,
  pickNearestOccurrence,
  selectableOccurrences,
} from '@/lib/attendance-ui'
import { cn } from '@/lib/utils'

const selectClassName =
  'flex h-9 min-w-[10rem] rounded-md border border-input bg-background px-3 text-sm shadow-sm'

type SortColumn = NonNullable<AttendanceOccurrenceRollupQuery['sortBy']>

const SORT_COLUMNS: { id: SortColumn; label: string }[] = [
  { id: 'name', label: 'Name' },
  { id: 'cell', label: 'Cell' },
  { id: 'type', label: 'Type' },
  { id: 'phone', label: 'Phone' },
  { id: 'invitedBy', label: 'Invited by' },
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

function OverviewMetrics({
  rollup,
  pendingCount,
  action,
}: {
  rollup: AttendanceOccurrenceRollup | null | undefined
  pendingCount: number
  action?: ReactNode
}) {
  const stats = [
    { label: 'Total present', value: rollup?.totalPresent ?? '—' },
    {
      label: 'Members',
      value: rollup?.membersPresent ?? '—',
      hint: rollup ? `${rollup.membersAbsent} absent` : undefined,
    },
    { label: 'First timers', value: rollup?.firstTimersPresent ?? '—' },
    { label: 'Guests', value: rollup?.guestsPresent ?? '—' },
    {
      label: 'Pending approval',
      value: pendingCount,
      tone: pendingCount > 0 ? ('amber' as const) : undefined,
    },
    {
      label: 'Approved cells',
      value: rollup?.approvedCellCount ?? '—',
      hint: rollup?.pendingCellCount ? `${rollup.pendingCellCount} awaiting final approval` : undefined,
    },
  ]

  return (
    <section className="flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-start gap-x-5 gap-y-3 sm:gap-x-8">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-[5.5rem]">
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

export function AttendanceOverviewPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [personKind, setPersonKind] = useState<'' | 'Member' | 'Invitee' | 'FirstTimer'>('')
  const [cellFilter, setCellFilter] = useState('')
  const [sorting, setSorting] = useState<{ id: SortColumn; desc: boolean }>({
    id: 'name',
    desc: false,
  })

  const {
    data: meetingTypes = [],
    isLoading: loadingTypes,
    error: meetingTypesError,
  } = useListMeetingTypesQuery()
  const {
    data: approvalQueue = [],
  } = useListApprovalQueueQuery()
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

  const pendingCount = approvalQueue.length
  const error =
    meetingTypesError || occurrencesError || rollupError
      ? 'Could not load attendance data'
      : null

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [selectedOccurrenceId, debouncedSearch, personKind, cellFilter, sorting.id, sorting.desc])

  useEffect(() => {
    if (!selectedTypeId && meetingTypes[0]?.id) {
      setSelectedTypeId(meetingTypes[0].id)
    }
  }, [meetingTypes, selectedTypeId])

  useEffect(() => {
    if (!selectedTypeId) {
      setSelectedOccurrenceId('')
      return
    }
    const selectable = selectableOccurrences(occurrences)
    setSelectedOccurrenceId((current) => {
      if (current && selectable.some((row) => row.id === current)) return current
      return pickNearestOccurrence(selectable)?.id ?? ''
    })
  }, [occurrences, selectedTypeId])

  const selectableOccurrenceRows = useMemo(
    () => selectableOccurrences(occurrences),
    [occurrences],
  )

  const selectedMeetingType = useMemo(
    () => meetingTypes.find((type) => type.id === selectedTypeId) ?? null,
    [meetingTypes, selectedTypeId],
  )

  const selectedOccurrence = useMemo(
    () => selectableOccurrenceRows.find((row) => row.id === selectedOccurrenceId) ?? null,
    [selectableOccurrenceRows, selectedOccurrenceId],
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
      ? `${rollup.pendingCellCount} roll call(s) still need final approval. Totals include roll calls you have already approved.`
      : null

  const emptyTableMessage =
    rollup && rollup.pendingCellCount > 0 && rollup.totalPresent === 0
      ? `${rollup.pendingCellCount} roll call(s) are still in the approval queue. Approve submitted roll calls or wait for cells to submit.`
      : 'No attendance recorded for this service yet.'

  function toggleSort(column: SortColumn) {
    setSorting((current) =>
      current.id === column
        ? { id: column, desc: !current.desc }
        : { id: column, desc: false },
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <DashboardPageHeader
          breadcrumbs={[
            { label: 'Overview', to: '/' },
            { label: 'Attendance', to: '/attendance/overview' },
            { label: 'Overview' },
          ]}
          title="Attendance overview"
          description={`Attendance totals and who showed up in ${scopeLabel}.`}
          className="flex-1"
        />

        {!loadingTypes && meetingTypes.length > 0 && (
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="overview-meeting-type" className="text-xs text-muted-foreground">
                Meeting
              </Label>
              <select
                id="overview-meeting-type"
                value={selectedTypeId}
                onChange={(e) => setSelectedTypeId(e.target.value)}
                className={selectClassName}
              >
                {meetingTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.title}
                  </option>
                ))}
              </select>
            </div>
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

      {selectedMeetingType && selectedOccurrence && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <CalendarDays className="size-4 shrink-0 text-primary" />
          <span>
            Showing data for{' '}
            <span className="font-medium">{selectedMeetingType.title}</span>
            {' · '}
            <span className="font-medium">{formatServiceDate(selectedOccurrence.meetingDate)}</span>
          </span>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <OverviewMetrics
        rollup={rollup}
        pendingCount={pendingCount}
        action={
          pendingCount > 0 ? (
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

      {loadingTypes ? (
        <Spinner label="Loading meetings…" />
      ) : meetingTypes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No meeting types set up yet.</p>
      ) : (
        <>
          <section className="space-y-4 rounded-lg border">
            <div className="flex flex-col gap-3 border-b px-4 py-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-sm font-medium">Who showed up</h2>
                <p className="text-sm text-muted-foreground">
                  {rollup
                    ? `${rollup.totalCount} people marked present for this service`
                    : 'Select a meeting and service date above'}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, phone, cell…"
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
                  <option value="Invitee">Invitees</option>
                  <option value="FirstTimer">First timers</option>
                </select>
                <Input
                  value={cellFilter}
                  onChange={(e) => setCellFilter(e.target.value)}
                  placeholder="Filter by cell"
                  className="h-9 w-full sm:w-40"
                />
              </div>
            </div>

            {loadingOccurrences || (loadingRollup && !rollup) ? (
              <div className="px-4 py-10">
                <Spinner label="Loading attendance…" />
              </div>
            ) : rollup && rollup.totalPresent > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[880px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        {SORT_COLUMNS.map((column) => (
                          <th key={column.id} className="px-4 py-2 font-medium">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 hover:text-foreground"
                              onClick={() => toggleSort(column.id)}
                            >
                              {column.label}
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
                        <tr key={`${person.scopeNodeId}:${person.name}:${person.personKind}:${person.phone ?? ''}`}>
                          <td className="px-4 py-3 font-medium">{person.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{person.cellName}</td>
                          <td className="px-4 py-3">{personKindLabel(person.personKind)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{person.phone || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {person.invitedByMemberName || '—'}
                          </td>
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
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">{emptyTableMessage}</p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
