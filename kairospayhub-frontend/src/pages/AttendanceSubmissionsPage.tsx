import { useCallback, useEffect, useMemo, useState } from 'react'
import { Lock } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { useApi } from '@/api/useApi'
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
import { canManageChurch, canSubmitRollCall, isScopedLeader, rollCallScopesFor } from '@/api/me'
import {
  AttendanceRollCallSheet,
  buildEntryValues,
  buildInviteeDrafts,
  type InviteeRollCallDraft,
} from '@/components/attendance/attendance-roll-call-sheet'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  formatOccurrenceLabel,
  nextUpcomingOccurrence,
  pickNearestOccurrence,
  rollCallState,
  selectableOccurrences,
  upcomingRollCallLockMessage,
} from '@/lib/attendance-ui'
import { cn } from '@/lib/utils'

type EntryStatus = 'Present' | 'Absent' | 'Unrecorded'

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm'

function StatusBanner({
  tone,
  message,
}: {
  tone: 'error' | 'success'
  message: string
}) {
  return (
    <p
      className={cn(
        'text-sm',
        tone === 'error' ? 'text-destructive' : 'text-emerald-700',
      )}
    >
      {message}
    </p>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1 py-8">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

export function AttendanceSubmissionsPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const api = useApi()
  const churchManager = canManageChurch(me.role)
  const scopedLeader = isScopedLeader(me.role)
  const rollCallScopes = rollCallScopesFor(me)
  const canRollCall = canSubmitRollCall(me)

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
  const [busy, setBusy] = useState(false)
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

  const selectedCell = useMemo(
    () => rollCallScopes.find((scope) => scope.scopeNodeId === selectedScopeNodeId) ?? null,
    [rollCallScopes, selectedScopeNodeId],
  )

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
        const nearest = pickNearestOccurrence(rows)
        setSelectedOccurrenceId(nearest?.id ?? '')
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
  }, [api, selectedTypeId])

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
    if (!selectedOccurrenceId || !selectedScopeNodeId) {
      setDetail(null)
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
  }, [api, selectedOccurrenceId, selectedScopeNodeId])

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
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await saveEntries()
      await reloadDetail()
      setMessage('Roll call saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save roll call')
    } finally {
      setBusy(false)
    }
  }

  async function onSubmitRollCall() {
    if (!detail || !selectedScopeNodeId) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await saveEntries()
      await submitOccurrenceScope(api, detail.id, selectedScopeNodeId)
      await reloadDetail()
      setMessage('Roll call submitted for approval.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit roll call')
    } finally {
      setBusy(false)
    }
  }

  const selectableOccurrenceRows = useMemo(
    () => selectableOccurrences(occurrences),
    [occurrences],
  )

  const nextUpcomingOccurrenceRow = useMemo(
    () => nextUpcomingOccurrence(occurrences),
    [occurrences],
  )

  const upcomingLockMessage = useMemo(
    () =>
      nextUpcomingOccurrenceRow
        ? upcomingRollCallLockMessage(nextUpcomingOccurrenceRow)
        : null,
    [nextUpcomingOccurrenceRow],
  )

  const rollCallUi = useMemo(() => {
    if (!detail || !selectedScopeNodeId) return null
    return rollCallState(detail, selectedScopeNodeId)
  }, [detail, selectedScopeNodeId])

  const cellEntries = useMemo(() => {
    if (!detail) return []
    return detail.entries.filter((entry) => entry.memberScopeNodeId === selectedScopeNodeId)
  }, [detail, selectedScopeNodeId])

  const pageDescription = canRollCall
    ? 'Mark attendance for your cell, then submit for approval.'
    : scopedLeader
      ? 'Roll call is entered per cell. Link your cell leader assignment to submit attendance here.'
      : 'Cell leaders submit attendance here when the window is open.'

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        breadcrumbs={[
          { label: 'Overview', to: '/' },
          { label: 'Attendance', to: churchManager ? '/attendance' : '/attendance/submissions' },
          { label: 'Submissions' },
        ]}
        title="Roll call"
        description={pageDescription}
      />

      {error && <StatusBanner tone="error" message={error} />}
      {message && <StatusBanner tone="success" message={message} />}

      {!canRollCall ? (
        <EmptyState
          title={scopedLeader ? 'Roll call is for cell leaders' : 'Roll call is for cell leaders'}
          description={
            scopedLeader
              ? 'To approve roll calls from cells in your scope, open Attendance → Approvals.'
              : 'Attendance is marked per cell. Ask your pastor to assign you as a cell leader in Structure if you lead a cell.'
          }
        />
      ) : loadingTypes ? (
        <Spinner label="Loading meetings…" />
      ) : meetingTypes.length === 0 ? (
        <EmptyState
          title="No meetings yet"
          description={
            churchManager
              ? 'Create a meeting type under Attendance first.'
              : 'Your church has not set up any meeting types yet.'
          }
        />
      ) : (
        <>
          <section className="space-y-4 border-b pb-6">
            {rollCallScopes.length > 1 && (
              <div className="max-w-md space-y-1.5">
                <Label htmlFor="cell-scope" className="text-xs text-muted-foreground">
                  Cell
                </Label>
                <select
                  id="cell-scope"
                  value={selectedScopeNodeId}
                  onChange={(e) => setSelectedScopeNodeId(e.target.value)}
                  className={selectClassName}
                >
                  {rollCallScopes.map((scope) => (
                    <option key={scope.scopeNodeId} value={scope.scopeNodeId}>
                      {scope.scopeUnitName}
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
                {selectableOccurrenceRows.length === 0 && !loadingOccurrences && !nextUpcomingOccurrenceRow && (
                  <p className="text-xs text-muted-foreground">
                    No past services yet. Upcoming dates appear after the service happens.
                  </p>
                )}
              </div>
            </div>
            {upcomingLockMessage && !loadingOccurrences && (
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                <Lock
                  className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    {upcomingLockMessage.title}
                  </p>
                  <p className="mt-0.5 text-xs text-amber-800/90 dark:text-amber-200/90">
                    {upcomingLockMessage.description}
                  </p>
                </div>
              </div>
            )}
          </section>

          {loadingOccurrences || loadingDetail ? (
            <Spinner label="Loading roll call…" />
          ) : rollCallUi?.reason === 'serviceNotHappened' ? (
            <EmptyState
              title="Service has not happened yet"
              description={rollCallUi.message ?? ''}
            />
          ) : detail && selectedScopeNodeId ? (
            <section className="pt-6">
              <AttendanceRollCallSheet
                  detail={{ ...detail, entries: cellEntries }}
                  scopeNodeId={selectedScopeNodeId}
                  cellName={selectedCell?.scopeUnitName}
                  viewerRole={me.role}
                  values={entryValues}
                  inviteeValues={inviteeValues}
                  onChange={(memberId, status) =>
                    setEntryValues((current) => ({ ...current, [memberId]: status }))
                  }
                  onInviteeValuesChange={setInviteeValues}
                  busy={busy}
                  onSave={() => void onSaveRollCall()}
                  onSubmit={() => void onSubmitRollCall()}
              />
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
