import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Lock } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/shared/layout/dashboard-layout'
import { DashboardPageHeader } from '@/shared/layout/dashboard-page-header'
import { useApi } from '@/shared/api'
import { useAppDispatch } from '@/store/hooks'
import { invalidateAttendanceApprovalQueue, useListMySubmissionsQuery } from '@/features/attendance/api/attendanceApi'
import {
  getOccurrence,
  listMeetingTypes,
  listOccurrences,
  putOccurrenceEntries,
  submitOccurrenceScope,
  uploadReportPhoto,
  type AttendanceMeetingType,
  type AttendanceOccurrenceDetail,
  type AttendanceOccurrenceSummary,
} from '@/features/attendance/api'
import { canManageChurch, canSubmitRollCall, isScopedLeader, rollCallScopesFor } from '@/api/auth'
import { markableMeetingTypes, rollCallScopesForMeeting } from '@/features/attendance/lib/roll-call-submit-policy'
import {
  type ReportAnswers,
  reportPolicy,
} from '@/features/attendance/lib/report-policy'
import { AttendanceReportStep } from '@/features/attendance/components/attendance-report-step'
import { AttendanceMySubmissionsList } from '@/features/attendance/components/attendance-my-submissions-list'
import { AttendanceMeetingPackPanel } from '@/features/attendance/components/attendance-meeting-pack-panel'
import {
  AttendanceRollCallSheet,
  buildEntryValues,
  buildInviteeDrafts,
  type InviteeRollCallDraft,
} from '@/features/attendance/components/attendance-roll-call-sheet'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { InlineSpinner } from '@/shared/ui/spinner'
import {
  formatOccurrenceLabel,
  nextUpcomingOccurrence,
  pickNearestOccurrence,
  selectableOccurrences,
  upcomingRollCallLockMessage,
} from '@/features/attendance/lib/attendance-ui'
import {
  AttendanceEmptyState,
  AttendanceStatusBanner,
} from '@/features/attendance/components/attendance-submissions-parts'

type EntryStatus = 'Present' | 'Absent' | 'Unrecorded'
type WizardStep = 'pick' | 'mark' | 'report'

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
  const [reportAnswers, setReportAnswers] = useState<ReportAnswers>({})
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [loadingOccurrences, setLoadingOccurrences] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [busyAction, setBusyAction] = useState<'save' | 'submit' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [packReady, setPackReady] = useState(true)

  const markableTypes = useMemo(
    () => markableMeetingTypes(meetingTypes, rollCallScopes),
    [meetingTypes, rollCallScopes],
  )

  const selectedMeetingType = useMemo(
    () => markableTypes.find((type) => type.id === selectedTypeId) ?? null,
    [markableTypes, selectedTypeId],
  )

  const scopesForSelected = useMemo(
    () => (selectedMeetingType ? rollCallScopesForMeeting(rollCallScopes, selectedMeetingType) : []),
    [rollCallScopes, selectedMeetingType],
  )

  useEffect(() => {
    setSelectedTypeId((current) =>
      markableTypes.some((type) => type.id === current) ? current : markableTypes[0]?.id ?? '',
    )
  }, [markableTypes])

  useEffect(() => {
    if (scopesForSelected.length === 0) {
      setSelectedScopeNodeId('')
      return
    }
    setSelectedScopeNodeId((current) =>
      scopesForSelected.some((scope) => scope.scopeNodeId === current)
        ? current
        : scopesForSelected[0].scopeNodeId,
    )
  }, [scopesForSelected])

  const selectedCell = useMemo(() => {
    return scopesForSelected.find((scope) => scope.scopeNodeId === selectedScopeNodeId) ?? null
  }, [scopesForSelected, selectedScopeNodeId])

  const loadTypes = useCallback(async () => {
    setLoadingTypes(true)
    setError(null)
    try {
      setMeetingTypes(await listMeetingTypes(api))
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
    const stored = nextDetail.scopeSubmissions.find((row) => row.scopeNodeId === scopeNodeId)?.report
    setReportAnswers(stored?.answers ?? {})
  }

  useEffect(() => {
    if ((step !== 'mark' && step !== 'report') || !selectedOccurrenceId || !selectedScopeNodeId) {
      if (step === 'pick') setDetail(null)
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
      reportAnswers,
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
    const policy = reportPolicy(selectedMeetingType ?? {}, reportAnswers)
    if (step === 'mark' && policy.required) {
      setBusyAction('save')
      setError(null)
      setMessage(null)
      try {
        await saveEntries()
        setStep('report')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save roll call')
      } finally {
        setBusyAction(null)
      }
      return
    }

    setBusyAction('submit')
    setError(null)
    setMessage(null)
    try {
      await saveEntries()
      await submitOccurrenceScope(api, detail.id, selectedScopeNodeId, {
        reportAnswers,
      })
      dispatch(invalidateAttendanceApprovalQueue())
      await reloadDetail()
      setMessage('Roll call submitted for approval.')
      setStep('pick')
      setReportAnswers({})
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

  const cellEntries = useMemo(() => {
    if (!detail) return []
    return detail.entries.filter((entry) => entry.memberScopeNodeId === selectedScopeNodeId)
  }, [detail, selectedScopeNodeId])

  useEffect(() => {
    setPackReady(churchManager)
  }, [churchManager, selectedOccurrenceId])

  const canContinue =
    Boolean(selectedTypeId && selectedOccurrenceId) &&
    selectableOccurrenceRows.length > 0 &&
    (churchManager || packReady)

  const pageDescription = canRollCall
    ? step === 'pick'
      ? 'Choose the meeting and service date, then continue to mark attendance.'
      : step === 'report'
        ? 'Complete the meeting report, then submit for approval.'
        : null
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
          onBack={
            step === 'mark' || step === 'report'
              ? () => {
                  setStep(step === 'report' ? 'mark' : 'pick')
                  setMessage(null)
                }
              : undefined
          }
        />
        {step === 'pick' && upcomingLockMessage ? (
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
            scopedLeader
              ? 'No submission unit assigned'
              : churchManager
                ? 'Pastors don’t mark attendance'
                : 'Mark attendance is for unit leaders'
          }
          description={
            scopedLeader
              ? 'To approve roll calls from units below you, open Attendance → Approvals.'
              : churchManager
                ? 'Share notes and files from Attendance → Share files. Unit leaders mark attendance here.'
                : 'Ask your pastor to assign you as leader of a submission unit in Structure.'
          }
        />
      ) : loadingTypes ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <InlineSpinner /> Loading meetings…
        </p>
      ) : markableTypes.length === 0 ? (
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
          {scopesForSelected.length > 1 && (
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
                {scopesForSelected.map((scope) => (
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
                {markableTypes.map((type) => (
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

          {!churchManager && selectedOccurrenceId ? (
            <AttendanceMeetingPackPanel
              occurrenceId={selectedOccurrenceId}
              canManageChurch={false}
              onViewerChange={setPackReady}
            />
          ) : null}

          {canRollCall ? (
            <div className="flex flex-col items-end gap-1.5">
              {!packReady && !churchManager ? (
                <p className="text-xs text-sky-800 dark:text-sky-200">
                  Download the meeting files before you continue.
                </p>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="rounded-md"
                disabled={!canContinue}
                title={
                  !packReady && !churchManager
                    ? 'Download the meeting files before you continue.'
                    : undefined
                }
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
          ) : null}

          {canRollCall ? (
            <AttendanceMySubmissionsList rows={mySubmissions} loading={loadingMySubmissions} />
          ) : null}
        </section>
      ) : step === 'report' && selectedMeetingType ? (
        <AttendanceReportStep
          type={selectedMeetingType}
          answers={reportAnswers}
          onChange={setReportAnswers}
          busy={busyAction !== null}
          busyAction={busyAction}
          onSaveDraft={() => void onSaveRollCall()}
          onSubmit={() => void onSubmitRollCall()}
          onUploadPhoto={async (fieldId, file) => {
            if (!detail || !selectedScopeNodeId) return
            const url = await uploadReportPhoto(detail.id, selectedScopeNodeId, file)
            setReportAnswers((current) => {
              const existing = Array.isArray(current[fieldId]) ? (current[fieldId] as string[]) : []
              return { ...current, [fieldId]: [...existing, url] }
            })
          }}
        />
      ) : (
        <section className="space-y-4">
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
              submitLabel={
                reportPolicy(selectedMeetingType ?? {}).required ? 'Continue to report' : undefined
              }
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
