import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { Coins, FileText, LayoutGrid, Pencil } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatOccupationStatus } from '@/lib/member-filters'
import { buildMemberRow } from '@/lib/structure-table-rows'
import { cn } from '@/lib/utils'
import { MemberGivingTab } from '@/components/giving/member-giving-tab'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { MemberEditWizard } from '@/components/structure/member-edit-wizard'
import { ResponsivenessBadge } from '@/components/structure/responsiveness-badge'
import { RoleBadge, StructureSegmentBadge } from '@/components/structure/structure-badges'
import { StructureChain } from '@/components/structure/structure-chain'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { TablePagination } from '@/components/ui/table-pagination'
import { useGetMemberAttendanceHistoryQuery } from '@/store/attendanceApi'
import {
  invalidateStructureTags,
  useGetStructureMemberQuery,
  useGetStructureTreeQuery,
} from '@/store/structureApi'

type MemberSection = 'profile' | 'attendance' | 'givings' | 'edit'

const SECTION_TABS: { id: Exclude<MemberSection, 'edit'>; label: string; icon: LucideIcon; to: string }[] = [
  { id: 'profile', label: 'Profile', icon: LayoutGrid, to: '' },
  { id: 'attendance', label: 'Attendance', icon: FileText, to: '/attendance' },
  { id: 'givings', label: 'Givings', icon: Coins, to: '/givings' },
]

function memberBasePath(memberId: string) {
  return `/roster/members/${memberId}`
}

function useMemberPageContext() {
  const { memberId = '' } = useParams()
  const treeQuery = useGetStructureTreeQuery({ includeMembers: false })
  const memberQuery = useGetStructureMemberQuery(memberId, { skip: !memberId })

  const row = useMemo(() => {
    if (!treeQuery.data || !memberQuery.data) return null
    return buildMemberRow(treeQuery.data, memberQuery.data)
  }, [treeQuery.data, memberQuery.data])

  return {
    memberId,
    tree: treeQuery.data,
    member: memberQuery.data,
    row,
    loading: treeQuery.isLoading || memberQuery.isLoading,
    error:
      (treeQuery.error && 'Could not load structure') ||
      (memberQuery.error && 'Member not found') ||
      null,
  }
}

function MemberPageShell({
  section,
  children,
  actions,
}: {
  section: MemberSection
  children: ReactNode
  actions?: ReactNode
}) {
  const navigate = useNavigate()
  const { memberId, tree, row, loading, error } = useMemberPageContext()

  if (!memberId) return <Navigate to="/roster/membership" replace />
  if (loading) return <Spinner label="Loading member…" />
  if (error || !tree || !row) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{error ?? 'Member not found.'}</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/roster/membership">Back to membership</Link>
        </Button>
      </div>
    )
  }

  const base = memberBasePath(memberId)
  const sectionLabel =
    section === 'edit'
      ? 'Edit'
      : SECTION_TABS.find((t) => t.id === section)?.label ?? 'Profile'

  return (
    <div className="space-y-5">
      <DashboardPageHeader
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Roster', to: '/roster' },
          { label: 'Membership', to: '/roster/membership' },
          { label: row.member, to: base },
          ...(section === 'profile' ? [] : [{ label: sectionLabel }]),
        ]}
        title={row.member}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <RoleBadge role={row.role} position={row.position} />
            <span className="text-muted-foreground">{row.path}</span>
          </span>
        }
        actions={
          actions ??
          (section !== 'edit' ? (
            <Button size="sm" variant="outline" onClick={() => navigate(`${base}/edit`)}>
              <Pencil className="size-3.5" />
              Edit profile
            </Button>
          ) : undefined)
        }
      />

      {section !== 'edit' && (
        <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-border/60 px-1 pb-px">
          {SECTION_TABS.map((tab) => {
            const active = tab.id === section
            const Icon = tab.icon
            return (
              <Link
                key={tab.id}
                to={`${base}${tab.to}`}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-3.5" />
                {tab.label}
              </Link>
            )
          })}
        </nav>
      )}

      {children}
    </div>
  )
}

export function MemberProfilePage() {
  const { tree, row } = useMemberPageContext()
  const navigate = useNavigate()

  return (
    <MemberPageShell section="profile">
      {row && tree && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-section-title">Contact</h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Phone" value={row.phone || '—'} />
                <DetailItem label="Email" value={row.email || '—'} />
              </dl>
            </section>
            <section className="space-y-3">
              <h2 className="text-section-title">Personal</h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Date of birth" value={row.dateOfBirth || '—'} />
                <DetailItem label="Age" value={row.age || '—'} />
                <DetailItem label="Residence" value={row.residence || '—'} />
                <DetailItem
                  label="Occupation"
                  value={formatOccupationStatus(row.occupationStatus)}
                />
                <DetailItem label="School / workplace" value={row.schoolOrWorkplace || '—'} />
                <DetailItem
                  label="Responsiveness"
                  value={<ResponsivenessBadge level={row.responsiveness} />}
                />
              </dl>
            </section>
          </div>

          <div className="space-y-4">
            <section className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
              <h2 className="text-section-title">Structure</h2>
              <StructureChain
                animated={false}
                size="sm"
                items={[
                  { label: tree.churchName, tone: 'church' },
                  ...row.structure.map((segment) => ({
                    id: segment.layerId,
                    label: segment.nodeName,
                    tone: 'layer' as const,
                  })),
                ]}
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {row.structure.map((segment) => (
                  <StructureSegmentBadge key={segment.layerId} segment={segment} />
                ))}
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Button
                type="button"
                variant="outline"
                className="justify-start"
                onClick={() => navigate(`${memberBasePath(row.id)}/attendance`)}
              >
                <FileText className="size-4" />
                View attendance
              </Button>
              <Button
                type="button"
                variant="outline"
                className="justify-start"
                onClick={() => navigate(`${memberBasePath(row.id)}/givings`)}
              >
                <Coins className="size-4" />
                View givings
              </Button>
            </section>
          </div>
        </div>
      )}
    </MemberPageShell>
  )
}

export function MemberAttendancePage() {
  const { memberId, row } = useMemberPageContext()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [selectedMeetingTypeId, setSelectedMeetingTypeId] = useState<string | null>(null)

  useEffect(() => {
    setPage(1)
    setSelectedMeetingTypeId(null)
  }, [memberId])

  const bootstrap = useGetMemberAttendanceHistoryQuery(
    { memberId, page: 1, pageSize: 1 },
    { skip: !memberId },
  )

  const meetingTypes = bootstrap.data?.meetingTypes ?? []
  const effectiveMeetingTypeId =
    selectedMeetingTypeId ??
    meetingTypes.find((t) => t.recordedCount > 0)?.meetingTypeId ??
    meetingTypes[0]?.meetingTypeId ??
    null

  const history = useGetMemberAttendanceHistoryQuery(
    {
      memberId,
      page,
      pageSize,
      meetingTypeId: effectiveMeetingTypeId,
    },
    { skip: !memberId || !effectiveMeetingTypeId },
  )

  const loading = bootstrap.isLoading || (!!effectiveMeetingTypeId && history.isLoading)
  const error = bootstrap.error || history.error
  const typesForNav = history.data?.meetingTypes ?? meetingTypes

  return (
    <MemberPageShell section="attendance">
      {loading && <Spinner label="Loading attendance…" />}
      {error && (
        <p className="text-sm text-destructive">Could not load attendance history.</p>
      )}
      {!loading && !error && typesForNav.length === 0 && (
        <p className="rounded-xl border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
          No meeting types configured yet.
        </p>
      )}
      {!loading && !error && effectiveMeetingTypeId && history.data && (
        <div className="space-y-4">
          <nav
            aria-label="Meeting types"
            className="-mx-1 flex gap-1 overflow-x-auto border-b border-border/60 px-1 pb-px"
          >
            {typesForNav.map((type) => {
              const active = type.meetingTypeId === effectiveMeetingTypeId
              return (
                <button
                  key={type.meetingTypeId}
                  type="button"
                  onClick={() => {
                    setSelectedMeetingTypeId(type.meetingTypeId)
                    setPage(1)
                  }}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 border-b-2 px-2.5 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span>{type.title}</span>
                  <span
                    className={cn(
                      'rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                      active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {type.recordedCount}
                  </span>
                </button>
              )
            })}
          </nav>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Present" value={history.data.summary.presentCount} />
            <MetricCard label="Absent" value={history.data.summary.absentCount} />
            <MetricCard label="Recorded" value={history.data.summary.recordedCount} />
          </div>

          {history.data.items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
              No attendance records yet for {row?.member ?? 'this member'} in this meeting type.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full min-w-[24rem] text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20 text-left text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.items.map((item) => (
                    <tr key={item.entryId} className="border-b border-border/40 last:border-0">
                      <td className="px-4 py-3 whitespace-nowrap">{item.meetingDate}</td>
                      <td className="px-4 py-3">{item.status}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.scopeUnitName ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <TablePagination
                page={history.data.page}
                pageSize={history.data.pageSize}
                totalCount={history.data.totalCount}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setPage(1)
                }}
              />
            </div>
          )}
        </div>
      )}
    </MemberPageShell>
  )
}

export function MemberGivingsPage() {
  const { memberId } = useMemberPageContext()
  return (
    <MemberPageShell section="givings">
      {memberId ? <MemberGivingTab memberId={memberId} /> : null}
    </MemberPageShell>
  )
}

export function MemberEditPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { memberId, tree, row, loading, error } = useMemberPageContext()
  const [busy, setBusy] = useState(false)

  if (!memberId) return <Navigate to="/roster/membership" replace />
  if (loading) return <Spinner label="Loading member…" />
  if (error || !tree || !row) {
    return <p className="text-sm text-destructive">{error ?? 'Member not found.'}</p>
  }

  return (
    <MemberPageShell section="edit" actions={null}>
      <MemberEditWizard
        tree={tree}
        member={row}
        busy={busy}
        presentation="page"
        submit={async (action) => {
          setBusy(true)
          try {
            await action()
            dispatch(invalidateStructureTags())
            navigate(memberBasePath(memberId))
          } finally {
            setBusy(false)
          }
        }}
        onClose={() => navigate(memberBasePath(memberId))}
      />
    </MemberPageShell>
  )
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-eyebrow text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3">
      <p className="text-eyebrow text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
