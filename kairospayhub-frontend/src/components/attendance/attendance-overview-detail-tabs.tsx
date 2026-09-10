import { ArrowUpDown, Columns3 } from 'lucide-react'
import type { AttendanceOccurrenceDetail, AttendanceOccurrenceRollup } from '@/api/attendance'
import {
  approvalStatusLabel,
  ColumnToggleSwitch,
  personKindLabel,
} from '@/components/attendance/attendance-overview-parts'
import { StructurePageTabs } from '@/components/structure/structure-page-tabs'
import type { StructurePageTab } from '@/components/structure/structure-page-tabs'
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
import { Spinner } from '@/components/ui/spinner'
import { TablePagination } from '@/components/ui/table-pagination'
import {
  BY_UNIT_COLUMN_LABELS,
  WHO_SHOWED_UP_COLUMN_LABELS,
  type ByUnitColumnId,
  type MetricsDetailTabId,
  type WhoShowedUpColumnId,
} from '@/lib/attendance-ui'
import { cn } from '@/lib/utils'

const selectClassName =
  'flex h-9 min-w-[10rem] rounded-md border border-input bg-background px-3 text-sm shadow-sm'

type SortColumn = 'name' | 'cell' | 'parent' | 'type' | 'phone' | 'invitedBy'

type SortCol = { id: SortColumn; columnId: WhoShowedUpColumnId; label: string }

export type AttendanceOverviewDetailTabsProps = {
  detailTabs: StructurePageTab[]
  detailTab: MetricsDetailTabId
  setDetailTab: (id: MetricsDetailTabId) => void
  rollup: AttendanceOccurrenceRollup | null | undefined
  search: string
  setSearch: (v: string) => void
  personKind: '' | 'Member' | 'Invitee' | 'FirstTimer'
  setPersonKind: (v: '' | 'Member' | 'Invitee' | 'FirstTimer') => void
  cellFilter: string
  setCellFilter: (v: string) => void
  columnVisibility: Record<WhoShowedUpColumnId, boolean>
  toggleColumn: (id: WhoShowedUpColumnId) => void
  parentColumnLabel: string
  unitLayerLabel: string
  loadingOccurrences: boolean
  loadingRollup: boolean
  visibleSortColumns: SortCol[]
  sorting: { id: SortColumn; desc: boolean }
  toggleSort: (column: SortColumn) => void
  setPage: (p: number) => void
  setPageSize: (s: number) => void
  emptyTableMessage: string
  unitSearch: string
  setUnitSearch: (v: string) => void
  unitStatusFilter: string
  setUnitStatusFilter: (v: string) => void
  byUnitColumnVisibility: Record<ByUnitColumnId, boolean>
  toggleByUnitColumn: (id: ByUnitColumnId) => void
  loadingDetail: boolean
  occurrenceDetail: AttendanceOccurrenceDetail | null | undefined
  filteredUnits: NonNullable<AttendanceOccurrenceDetail>['scopeSubmissions']
  metricsGroups: ReturnType<typeof import('@/lib/attendance-ui').buildUnitMetricsGroups>
  draftUnits: NonNullable<AttendanceOccurrenceDetail>['scopeSubmissions']
}

export function AttendanceOverviewDetailTabs(p: AttendanceOverviewDetailTabsProps) {
  const {
    detailTabs, detailTab, setDetailTab, rollup, search, setSearch, personKind, setPersonKind,
    cellFilter, setCellFilter, columnVisibility, toggleColumn, parentColumnLabel, unitLayerLabel,
    loadingOccurrences, loadingRollup, visibleSortColumns, sorting, toggleSort,
    setPage, setPageSize, emptyTableMessage, unitSearch, setUnitSearch, unitStatusFilter,
    setUnitStatusFilter, byUnitColumnVisibility, toggleByUnitColumn, loadingDetail,
    occurrenceDetail, filteredUnits, metricsGroups, draftUnits,
  } = p

  return (
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
                              <p className="text-eyebrow">
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

  )
}
