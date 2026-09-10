import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Lock } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { useApi } from '@/api/core'
import { useAppDispatch } from '@/store/hooks'
import { invalidateAttendanceApprovalQueue, useListMySubmissionsQuery } from '@/store/attendanceApi'
import {
  getOccurrence,
  listMeetingTypes,
  listOccurrences,
  putOccurrenceEntries,
  submitOccurrenceScope,
  type AttendanceMeetingType,
  type AttendanceOccurrenceDetail,
  type AttendanceOccurrenceSummary,
} from '@/api/attendance'
import { canManageChurch, canSubmitRollCall, isScopedLeader, rollCallScopesFor } from '@/api/auth'
import {
  AttendanceRollCallSheet,
  buildEntryValues,
  buildInviteeDrafts,
  type InviteeRollCallDraft,
} from '@/components/attendance/attendance-roll-call-sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { InlineSpinner } from '@/components/ui/spinner'
import {
  formatOccurrenceLabel,
  nextUpcomingOccurrence,
  pickNearestOccurrence,
  selectableOccurrences,
  upcomingRollCallLockMessage,
} from '@/lib/attendance-ui'
import {
  AttendanceEmptyState,
  AttendanceStatusBanner,
} from '@/components/attendance/attendance-submissions-parts'

type EntryStatus = 'Present' | 'Absent' | 'Unrecorded'
type WizardStep = 'pick' | 'mark'

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm'

export function AttendanceSubmissionsPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const api = useApi()
  const dispatch = useAppDispatch()
  const churchManager = canManageChurch(me.role)
  const scopedLeader = isScopedLeader(me.role)
  const rollCallScopes = rollCallScopesFor(me)
  const canRollCall = canSubmitRollCall(me)
  const timeZoneId = me.onboarded ? me.timeZoneId : null
  const { data: mySubmissions = [], isFetching: loadingMySubmissions } = useListMySubmissionsQuery(
    undefined,
    { skip: !canRollCall },
  )

  const [step, setStep] = useState<WizardStep>('pick')
  const [selectedScopeNodeId, setSelectedScopeNodeId] = useState('')
  const [meetingTypes, setMeetingTypes] = useState<AttendanceMeetingType[]>([])
  const [occurrences, setOccurrences] = useState<AttendanceOccurrenceSummary[]>([])
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState('')
  const [detail, setDetail] = useState<AttendanceOccurrenceDetail | null>(null)
  const [entryValues, setEntryValues] = useState<Record<string, EntryStatus>>({})
  const [inviteeValues, setInviteeValues] = useState<InviteeRollCallDraft[]>([])
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [loadingOccurrences, setLoadingOccurrences] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [busyAction, setBusyAction] = useState<'save' | 'submit' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (rollCallScopes.length === 0) {
      setSelectedScopeNodeId('')
      return
    }
    setSelectedScopeNodeId((current) =>
      rollCallScopes.some((scope) => scope.scopeNodeId === current)
        ? current
        : rollCallScopes[0].scopeNodeId,
    )
  }, [rollCallScopes])

  const selectedCell = useMemo(() => {
    return rollCallScopes.find((scope) => scope.scopeNodeId === selectedScopeNodeId) ?? null
  }, [rollCallScopes, selectedScopeNodeId])

  const loadTypes = useCallback(async () => {
    setLoadingTypes(true)
    setError(null)
    try {
      const types = await listMeetingTypes(api)
      setMeetingTypes(types)
      setSelectedTypeId((current) => current || types[0]?.id || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load meeting types')
    } finally {
      setLoadingTypes(false)
    }
  }, [api])

  useEffect(() => {
    void loadTypes()
  }, [loadTypes])

  useEffect(() => {
    if (!selectedTypeId) {
      setOccurrences([])
      setSelectedOccurrenceId('')
      return
    }

    let cancelled = false
    setLoadingOccurrences(true)
    setError(null)

    void listOccurrences(api, selectedTypeId)
      .then((rows) => {
        if (cancelled) return
        setOccurrences(rows)
        const nearest = pickNearestOccurrence(rows, undefined, timeZoneId)
        setSelectedOccurrenceId((current) => {
          if (current && rows.some((row) => row.id === current) && nearest) {
            const stillSelectable = selectableOccurrences(rows, undefined, timeZoneId).some(
              (row) => row.id === current,
            )
            if (stillSelectable) return current
          }
          return nearest?.id ?? ''
        })
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load occurrences')
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingOccurrences(false)
      })

    return () => {
      cancelled = true
    }
  }, [api, selectedTypeId, timeZoneId])

  function applyDetailForScope(nextDetail: AttendanceOccurrenceDetail, scopeNodeId: string) {
    setDetail(nextDetail)
    const cellEntries = nextDetail.entries.filter(
      (entry) => entry.memberScopeNodeId === scopeNodeId,
    )
    setEntryValues(buildEntryValues(cellEntries))
    setInviteeValues(
      buildInviteeDrafts(
        (nextDetail.inviteeEntries ?? []).filter((row) => row.scopeNodeId === scopeNodeId),
      ),
    )
  }

  useEffect(() => {
    if (step !== 'mark' || !selectedOccurrenceId || !selectedScopeNodeId) {
      if (step !== 'mark') setDetail(null)
      return
    }

    let cancelled = false
    setLoadingDetail(true)
    setError(null)

    void getOccurrence(api, selectedOccurrenceId)
      .then((nextDetail) => {
        if (cancelled) return
        applyDetailForScope(nextDetail, selectedScopeNodeId)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load roll call')
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false)
      })

    return () => {
      cancelled = true
    }
  }, [api, selectedOccurrenceId, selectedScopeNodeId, step])

  async function reloadDetail() {
    if (!selectedOccurrenceId || !selectedScopeNodeId) return
    const nextDetail = await getOccurrence(api, selectedOccurrenceId)
    applyDetailForScope(nextDetail, selectedScopeNodeId)
  }

  async function saveEntries() {
    if (!detail || !selectedScopeNodeId) return
    const cellEntries = detail.entries.filter(
      (entry) => entry.memberScopeNodeId === selectedScopeNodeId,
    )
    const entries = cellEntries.map((entry) => {
      const status = entryValues[entry.memberId] ?? entry.status
      if (status !== 'Present' && status !== 'Absent') {
        throw new Error('Mark each member present or absent before saving')
      }
      return { memberId: entry.memberId, status: status as 'Present' | 'Absent' }
    })
    const inviteePayload = inviteeValues.map((row) => ({
      inviteeId: row.inviteeId,
      status: 'Present' as const,
      wasFirstTimer: row.wasFirstTimer,
    }))
    await putOccurrenceEntries(api, detail.id, selectedScopeNodeId, {
      entries,
      inviteeEntries: inviteePayload,
    })
  }

  async function onSaveRollCall() {
    setBusyAction('save')
    setError(null)
    setMessage(null)
    try {
      await saveEntries()
      await reloadDetail()
      setMessage('Roll call saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save roll call')
    } finally {
      setBusyAction(null)
    }
  }

  async function onSubmitRollCall() {
    if (!detail || !selectedScopeNodeId) return
    setBusyAction('submit')
    setError(null)
    setMessage(null)
    try {
      await saveEntries()
      await submitOccurrenceScope(api, detail.id, selectedScopeNodeId)
      dispatch(invalidateAttendanceApprovalQueue())
      await reloadDetail()
      setMessage('Roll call submitted for approval.')
      setStep('pick')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit roll call')
    } finally {
      setBusyAction(null)
    }
  }

  const selectableOccurrenceRows = useMemo(
    () => selectableOccurrences(occurrences, undefined, timeZoneId),
    [occurrences, timeZoneId],
  )

  const nextUpcomingOccurrenceRow = useMemo(
    () => nextUpcomingOccurrence(occurrences, undefined, timeZoneId),
    [occurrences, timeZoneId],
  )

  const upcomingLockMessage = useMemo(
    () =>
      nextUpcomingOccurrenceRow
        ? upcomingRollCallLockMessage(nextUpcomingOccurrenceRow)
        : null,
    [nextUpcomingOccurrenceRow],
  )

  const selectedMeetingType = useMemo(
    () => meetingTypes.find((type) => type.id === selectedTypeId) ?? null,
    [meetingTypes, selectedTypeId],
  )

  const selectedOccurrence = useMemo(
    () => selectableOccurrenceRows.find((row) => row.id === selectedOccurrenceId) ?? null,
    [selectableOccurrenceRows, selectedOccurrenceId],
  )

  const cellEntries = useMemo(() => {
    if (!detail) return []
    return detail.entries.filter((entry) => entry.memberScopeNodeId === selectedScopeNodeId)
  }, [detail, selectedScopeNodeId])

  const canContinue =
    Boolean(selectedTypeId && selectedOccurrenceId) && selectableOccurrenceRows.length > 0

  const pageDescription = canRollCall
    ? step === 'pick'
      ? 'Choose the meeting and service date, then continue to mark attendance.'
      : 'Mark members and invitees, then save a draft or submit for approval.'
    : churchManager
      ? 'Unit leaders mark attendance. Use Meeting types and Metrics from here.'
      : scopedLeader
        ? 'If you also lead a submission unit, it appears below. Otherwise use Approvals to review child roll calls.'
        : 'Unit leaders mark attendance here when the window is open.'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <DashboardPageHeader
          breadcrumbs={[
            { label: 'Dashboard', to: '/' },
            { label: 'Attendance', to: churchManager ? '/attendance' : '/attendance/submissions' },
            { label: 'Mark attendance' },
          ]}
          title="Mark attendance"
          description={pageDescription}
          className="flex-1"
        />
        {upcomingLockMessage ? (
          <div className="flex max-w-md gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs dark:border-amber-500/30 dark:bg-amber-500/10 lg:mt-1">
            <Lock className="mt-0.5 size-3.5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium text-amber-900 dark:text-amber-100">
                Upcoming: {upcomingLockMessage.title.replace(' — roll call locked', '')}
              </p>
              <p className="mt-0.5 text-amber-800/90 dark:text-amber-200/90">
                {upcomingLockMessage.description}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {error && <AttendanceStatusBanner tone="error" message={error} />}
      {message && <AttendanceStatusBanner tone="success" message={message} />}

      {!canRollCall ? (
        <AttendanceEmptyState
          title={
            churchManager
              ? 'Pastors don’t mark attendance'
              : scopedLeader
                ? 'No submission unit assigned'
                : 'Mark attendance is for unit leaders'
          }
          description={
            churchManager
              ? 'Leaders of the meeting’s submission layer mark attendance. Parent leaders approve.'
              : scopedLeader
                ? 'To approve roll calls from units below you, open Attendance → Approvals.'
                : 'Ask your pastor to assign you as leader of a submission unit in Structure.'
          }
        />
      ) : loadingTypes ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <InlineSpinner /> Loading meetings…
        </p>
      ) : meetingTypes.length === 0 ? (
        <AttendanceEmptyState
          title="No meetings yet"
          description={
            churchManager
              ? 'Create a meeting type under Attendance first.'
              : 'Your church has not set up any meeting types yet.'
          }
        />
      ) : step === 'pick' ? (
        <section className="space-y-5">
          {rollCallScopes.length > 1 && (
            <div className="max-w-md space-y-1.5">
              <Label htmlFor="cell-scope" className="text-xs text-muted-foreground">
                Logging for (choose your unit)
              </Label>
              <select
                id="cell-scope"
                value={selectedScopeNodeId}
                onChange={(e) => setSelectedScopeNodeId(e.target.value)}
                className={selectClassName}
              >
                {rollCallScopes.map((scope) => (
                  <option key={scope.scopeNodeId} value={scope.scopeNodeId}>
                    {scope.layerName
                      ? `${scope.layerName}: ${scope.scopeUnitName}`
                      : scope.scopeUnitName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="meeting-type" className="text-xs text-muted-foreground">
                Meeting
              </Label>
              <select
                id="meeting-type"
                value={selectedTypeId}
                onChange={(e) => {
                  setSelectedTypeId(e.target.value)
                  setStep('pick')
                }}
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
              <Label htmlFor="occurrence" className="text-xs text-muted-foreground">
                Service date
              </Label>
              <select
                id="occurrence"
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
              {loadingOccurrences ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <InlineSpinner className="size-3" /> Loading dates…
                </p>
              ) : null}
              {selectableOccurrenceRows.length === 0 && !loadingOccurrences && (
                <p className="text-xs text-muted-foreground">
                  No past or today services yet for this meeting.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              className="rounded-md"
              disabled={!canContinue}
              onClick={() => {
                setMessage(null)
                setError(null)
                setStep('mark')
              }}
            >
              Continue
              <ArrowRight className="ml-1.5 size-3.5" />
            </Button>
          </div>

          <section className="space-y-3 border-t pt-5">
            <div>
              <h2 className="text-sm font-medium">Your submissions</h2>
              <p className="text-sm text-muted-foreground">
                Recent roll calls you have submitted from your units.
              </p>
            </div>
            {loadingMySubmissions && mySubmissions.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <InlineSpinner /> Loading…
              </p>
            ) : mySubmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No submitted roll calls yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Meeting</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Unit</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {mySubmissions.map((row) => (
                      <tr key={`${row.occurrenceId}:${row.scopeNodeId}`}>
                        <td className="px-3 py-2.5 font-medium">{row.meetingTypeTitle}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {formatOccurrenceLabel({
                            id: row.occurrenceId,
                            meetingDate: row.meetingDate,
                            status: 'Open',
                            submissionOpensAt: '',
                            submissionDeadlineAt: '',
                            scopeSubmissionCount: 1,
                          }).split(' · ')[0]}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{row.scopeUnitName}</td>
                        <td className="px-3 py-2.5">
                          {row.approvalStatus === 'PendingApproval'
                            ? 'Pending approval'
                            : row.approvalStatus === 'Approved'
                              ? 'Approved'
                              : row.approvalStatus === 'Rejected'
                                ? 'Rejected'
                                : row.approvalStatus}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-md"
              onClick={() => {
                setStep('pick')
                setMessage(null)
              }}
            >
              <ArrowLeft className="mr-1.5 size-3.5" />
              Go back
            </Button>
            <p className="text-sm text-muted-foreground">
              {[
                selectedMeetingType?.title,
                selectedOccurrence
                  ? new Date(`${selectedOccurrence.meetingDate}T12:00:00`).toLocaleDateString(
                      undefined,
                      { month: 'short', day: 'numeric' },
                    )
                  : null,
                selectedCell?.scopeUnitName,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>

          {loadingDetail ? (
            <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <InlineSpinner /> Loading attendance sheet…
            </p>
          ) : detail && selectedScopeNodeId ? (
            <AttendanceRollCallSheet
              detail={{ ...detail, entries: cellEntries }}
              scopeNodeId={selectedScopeNodeId}
              cellName={selectedCell?.scopeUnitName}
              viewerRole={me.role}
              timeZoneId={timeZoneId}
              values={entryValues}
              inviteeValues={inviteeValues}
              onChange={(memberId, status) =>
                setEntryValues((current) => ({ ...current, [memberId]: status }))
              }
              onInviteeValuesChange={setInviteeValues}
              busy={busyAction !== null}
              busyAction={busyAction}
              onSave={() => void onSaveRollCall()}
              onSubmit={() => void onSubmitRollCall()}
            />
          ) : (
            <AttendanceEmptyState
              title="Could not open this sheet"
              description="Go back and pick another meeting or date."
            />
          )}
        </section>
      )}
    </div>
  )
}
