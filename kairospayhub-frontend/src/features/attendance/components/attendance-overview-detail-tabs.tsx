import type { OnChangeFn, SortingState, VisibilityState } from '@tanstack/react-table'
import { Columns3 } from 'lucide-react'
import type { AttendanceOccurrenceDetail, AttendanceOccurrenceRollup } from '@/features/attendance/api'
import { AttendanceAllTable } from '@/features/attendance/components/attendance-all-table'
import { AttendanceAllToolbar } from '@/features/attendance/components/attendance-all-toolbar'
import { approvalStatusLabel } from '@/features/attendance/components/attendance-overview-parts'
import { ColumnToggleSwitch } from '@/shared/ui/column-toggle-switch'
import { StructurePageTabs } from '@/shared/ui/page-tabs'
import type { StructurePageTab } from '@/shared/ui/page-tabs'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Input } from '@/shared/ui/input'
import { PhoneList } from '@/shared/ui/phone-list'
import { Spinner } from '@/shared/ui/spinner'
import { attendanceUnitPhoneCard } from '@/features/attendance/lib/phone-cards'
import { labeledPhoneCard } from '@/shared/lib/phone-list'
import { usePhoneListViewport } from '@/shared/lib/use-phone-list-viewport'
import {
  BY_UNIT_COLUMN_LABELS,
  type ByUnitColumnId,
  type MetricsDetailTabId,
  type WhoShowedUpColumnId,
} from '@/features/attendance/lib/attendance-ui'
import { cn } from '@/shared/lib/utils'

const selectClassName =
  'flex h-9 min-w-[10rem] rounded-md border border-input bg-background px-3 text-sm shadow-sm'

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
  onColumnVisibilityChange: (next: VisibilityState) => void
  toggleColumn: (id: WhoShowedUpColumnId) => void
  parentColumnLabel: string
  unitLayerLabel: string
  loadingOccurrences: boolean
  loadingRollup: boolean
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
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
  metricsGroups: ReturnType<typeof import('@/features/attendance/lib/attendance-ui').buildUnitMetricsGroups>
  draftUnits: NonNullable<AttendanceOccurrenceDetail>['scopeSubmissions']
}

export function AttendanceOverviewDetailTabs(p: AttendanceOverviewDetailTabsProps) {
  const {
    detailTabs, detailTab, setDetailTab, rollup, search, setSearch, personKind, setPersonKind,
    cellFilter, setCellFilter, columnVisibility, onColumnVisibilityChange, toggleColumn, parentColumnLabel, unitLayerLabel,
    loadingOccurrences, loadingRollup, sorting, onSortingChange,
    setPage, setPageSize, emptyTableMessage, unitSearch, setUnitSearch, unitStatusFilter,
    setUnitStatusFilter, byUnitColumnVisibility, toggleByUnitColumn, loadingDetail,
    occurrenceDetail, filteredUnits, metricsGroups, draftUnits,
  } = p
  const phone = usePhoneListViewport()

  return (
          <section className="space-y-4">
            <StructurePageTabs
              tabs={detailTabs}
              activeId={detailTab}
              onChange={(id) => setDetailTab(id as MetricsDetailTabId)}
            />

            {detailTab === 'who' ? (
              <div className="space-y-3">
                <AttendanceAllToolbar
                  search={search}
                  setSearch={setSearch}
                  personKind={personKind}
                  setPersonKind={setPersonKind}
                  cellFilter={cellFilter}
                  setCellFilter={setCellFilter}
                  columnVisibility={columnVisibility}
                  toggleColumn={toggleColumn}
                  parentColumnLabel={parentColumnLabel}
                  unitLayerLabel={unitLayerLabel}
                  countLabel={
                    rollup
                      ? `${rollup.totalCount} people in attendance for this service`
                      : 'Select a service date above'
                  }
                />
                <AttendanceAllTable
                  rows={rollup?.items ?? []}
                  loading={loadingOccurrences || (loadingRollup && !rollup)}
                  emptyMessage={emptyTableMessage}
                  parentColumnLabel={parentColumnLabel}
                  unitLayerLabel={unitLayerLabel}
                  columnVisibility={columnVisibility}
                  onColumnVisibilityChange={(updater) => {
                    const next =
                      typeof updater === 'function' ? updater(columnVisibility) : updater
                    onColumnVisibilityChange(next)
                  }}
                  sorting={sorting}
                  onSortingChange={onSortingChange}
                  page={rollup?.page ?? 1}
                  pageSize={rollup?.pageSize ?? 25}
                  totalCount={rollup?.totalCount ?? 0}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size)
                    setPage(1)
                  }}
                  pagingDisabled={loadingRollup}
                />
              </div>
            ) : detailTab === 'by-unit' ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
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
                  <div className="rounded-lg border px-4 py-10">
                    <Spinner label="Loading units…" />
                  </div>
                ) : filteredUnits.length > 0 ? (
                  <div className="space-y-5 overflow-hidden rounded-lg border">
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
                        <PhoneList
                          phone={phone}
                          items={group.rows.map((unit) => ({
                            id: unit.id,
                            ...attendanceUnitPhoneCard(unit),
                          }))}
                        >
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
                        </PhoneList>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border px-4 py-10 text-center text-sm text-muted-foreground">
                    {(occurrenceDetail?.scopeSubmissions.length ?? 0) === 0
                      ? 'No unit sheets for this service yet. Sheets appear when the meeting occurrence is generated.'
                      : unitSearch || unitStatusFilter
                        ? 'No unit roll calls match these filters.'
                        : 'No unit roll calls yet. Leaders mark attendance from Mark attendance, then parent leaders approve.'}
                  </p>
                )}
              </div>
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
                    <PhoneList
                      phone={phone}
                      items={draftUnits.map((unit) => ({
                        id: unit.id,
                        ...labeledPhoneCard(
                          unit.scopeUnitName,
                          [unit.parentUnitName, approvalStatusLabel(unit.approvalStatus)],
                          [
                            { label: unitLayerLabel, value: unit.scopeUnitName },
                            { label: parentColumnLabel, value: unit.parentUnitName },
                            { label: 'Status', value: approvalStatusLabel(unit.approvalStatus) },
                          ],
                        ),
                      }))}
                    >
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
                    </PhoneList>
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
