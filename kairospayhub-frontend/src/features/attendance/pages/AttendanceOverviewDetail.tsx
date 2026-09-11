import { useEffect, useMemo, useState } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { Link, useNavigate, useParams, useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/shared/layout/dashboard-layout'
import { DashboardPageHeader } from '@/shared/layout/dashboard-page-header'
import {
  useGetOccurrenceQuery,
  useGetOccurrenceRollupQuery,
  useListMeetingTypesQuery,
  useListOccurrencesQuery,
} from '@/features/attendance/api/attendanceApi'
import { isScopedLeader } from '@/api/auth/me'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import {
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
} from '@/features/attendance/lib/attendance-ui'
import { attendanceSortByFromColumn } from '@/features/attendance/lib/attendance-all-table'
import { TABLE_PREFERENCE_KEYS } from '@/lib/table-preferences'
import { usePersistedColumnVisibility } from '@/lib/use-persisted-column-visibility'
import {
  filterUnitRows,
  OverviewMetrics,
} from '@/features/attendance/components/attendance-overview-parts'
import { AttendanceOverviewDetailTabs } from '@/features/attendance/components/attendance-overview-detail-tabs'

const selectClassName =
  'flex h-9 min-w-[10rem] rounded-md border border-input bg-background px-3 text-sm shadow-sm'

export function AttendanceOverviewDetail() {
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
  const [columnVisibility, setColumnVisibility] = usePersistedColumnVisibility(
    TABLE_PREFERENCE_KEYS.attendanceWho,
    DEFAULT_WHO_SHOWED_UP_COLUMN_VISIBILITY,
    { alwaysOn: ['name'] },
  )
  const [byUnitColumnVisibility, setByUnitColumnVisibility] = useState(
    DEFAULT_BY_UNIT_COLUMN_VISIBILITY,
  )
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }])

  const selectedTypeId = routeTypeId ?? ''
  const timeZoneId = me.onboarded ? me.timeZoneId : null

  const {
    data: meetingTypes = [],
    isLoading: loadingTypes,
  } = useListMeetingTypesQuery()
  const {
    data: occurrences = [],
    isFetching: loadingOccurrences,
    error: occurrencesError,
  } = useListOccurrencesQuery(selectedTypeId, { skip: !selectedTypeId })

  const activeSort = sorting[0]
  const rollupQuery = useMemo(
    () => ({
      page,
      pageSize,
      sortBy: attendanceSortByFromColumn(activeSort?.id ?? 'name'),
      sortDir: activeSort?.desc ? ('desc' as const) : ('asc' as const),
      search: debouncedSearch || undefined,
      personKind: personKind || undefined,
      cell: cellFilter || undefined,
    }),
    [page, pageSize, activeSort?.id, activeSort?.desc, debouncedSearch, personKind, cellFilter],
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
    error: detailFetchError,
  } = useGetOccurrenceQuery(selectedOccurrenceId, { skip: !selectedOccurrenceId })

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search), 250)
    return () => window.clearTimeout(handle)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, personKind, cellFilter, activeSort?.id, activeSort?.desc, selectedOccurrenceId])

  const selectedMeetingType = meetingTypes.find((type) => type.id === selectedTypeId)
  const selectableOccurrenceRows = useMemo(
    () => selectableOccurrences(occurrences),
    [occurrences],
  )

  useEffect(() => {
    if (selectableOccurrenceRows.length === 0) {
      setSelectedOccurrenceId('')
      return
    }
    if (
      selectedOccurrenceId &&
      selectableOccurrenceRows.some((row) => row.id === selectedOccurrenceId)
    ) {
      return
    }
    const nearest = pickNearestOccurrence(selectableOccurrenceRows, undefined, timeZoneId)
    setSelectedOccurrenceId(nearest?.id ?? selectableOccurrenceRows[0]!.id)
  }, [selectableOccurrenceRows, selectedOccurrenceId, timeZoneId])

  const pendingCount = rollup?.pendingCellCount ?? 0
  const unitNoun = selectedMeetingType?.submissionLayerName?.trim() || 'Unit'

  const filteredUnits = useMemo(
    () =>
      filterUnitRows(
        occurrenceDetail?.scopeSubmissions ?? [],
        unitSearch,
        unitStatusFilter,
      ),
    [occurrenceDetail?.scopeSubmissions, unitSearch, unitStatusFilter],
  )

  const metricsGroups = useMemo(() => buildUnitMetricsGroups(filteredUnits), [filteredUnits])

  const draftUnits = useMemo(
    () =>
      yetToSubmitUnits(occurrenceDetail?.scopeSubmissions ?? []).filter((row) => {
        const q = unitSearch.trim().toLowerCase()
        if (!q) return true
        return (
          row.scopeUnitName.toLowerCase().includes(q) ||
          (row.parentUnitName?.toLowerCase().includes(q) ?? false)
        )
      }),
    [occurrenceDetail?.scopeSubmissions, unitSearch],
  )

  const detailError =
    (occurrencesError ? 'Could not load service dates' : null) ||
    (rollupError || detailFetchError ? 'Could not load attendance totals' : null)

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

  function toggleColumn(columnId: WhoShowedUpColumnId) {
    if (columnId === 'name') return
    setColumnVisibility({
      ...columnVisibility,
      [columnId]: !columnVisibility[columnId],
    })
  }

  function toggleByUnitColumn(columnId: ByUnitColumnId) {
    if (columnId === 'unit') return
    setByUnitColumnVisibility((current) => ({ ...current, [columnId]: !current[columnId] }))
  }

  const parentColumnLabel = useMemo(() => {
    const layer = occurrenceDetail?.scopeSubmissions.find((row) => row.parentLayerName?.trim())
      ?.parentLayerName
    return layer?.trim() || WHO_SHOWED_UP_COLUMN_LABELS.parentUnit
  }, [occurrenceDetail?.scopeSubmissions])

  const unitLayerLabel = useMemo(() => {
    const layer = occurrenceDetail?.scopeSubmissions.find((row) => row.layerName?.trim())?.layerName
    return layer?.trim() || unitNoun
  }, [occurrenceDetail?.scopeSubmissions, unitNoun])

  const detailTabs = useMemo(
    () => [
      {
        id: 'who',
        label: 'All attendance',
        count: rollup?.totalCount ?? 0,
      },
      {
        id: 'by-unit',
        label: 'Attendance by units',
        count: occurrenceDetail?.scopeSubmissions.length ?? 0,
      },
    ],
    [occurrenceDetail?.scopeSubmissions.length, rollup?.totalCount],
  )

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

          <AttendanceOverviewDetailTabs
            detailTabs={detailTabs}
            detailTab={detailTab}
            setDetailTab={setDetailTab}
            rollup={rollup}
            search={search}
            setSearch={setSearch}
            personKind={personKind}
            setPersonKind={setPersonKind}
            cellFilter={cellFilter}
            setCellFilter={setCellFilter}
            columnVisibility={columnVisibility as Record<WhoShowedUpColumnId, boolean>}
            onColumnVisibilityChange={setColumnVisibility}
            toggleColumn={toggleColumn}
            parentColumnLabel={parentColumnLabel}
            unitLayerLabel={unitLayerLabel}
            loadingOccurrences={loadingOccurrences}
            loadingRollup={loadingRollup}
            sorting={sorting}
            onSortingChange={setSorting}
            setPage={setPage}
            setPageSize={setPageSize}
            emptyTableMessage={emptyTableMessage}
            unitSearch={unitSearch}
            setUnitSearch={setUnitSearch}
            unitStatusFilter={unitStatusFilter}
            setUnitStatusFilter={setUnitStatusFilter}
            byUnitColumnVisibility={byUnitColumnVisibility}
            toggleByUnitColumn={toggleByUnitColumn}
            loadingDetail={loadingDetail}
            occurrenceDetail={occurrenceDetail}
            filteredUnits={filteredUnits}
            metricsGroups={metricsGroups}
            draftUnits={draftUnits}
          />
        </>
      )}
    </div>
  )
}
