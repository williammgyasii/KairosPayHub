import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { Coins, FileText, LayoutGrid, Pencil } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { memberProfileOverviewSections } from '@/lib/member-profile-overview'
import { buildMemberRow } from '@/lib/structure-table-rows'
import { cn } from '@/shared/lib/utils'
import { MemberGivingTab } from '@/features/giving/components/member-giving-tab'
import type { DashboardOutletContext } from '@/shared/layout/dashboard-layout'
import { DashboardPageHeader } from '@/shared/layout/dashboard-page-header'
import { MemberEditWizard } from '@/features/roster/components/member-edit-wizard'
import { ResponsivenessBadge } from '@/features/roster/components/responsiveness-badge'
import { RoleBadge } from '@/shared/ui/structure-badges'
import { StructureChain } from '@/shared/ui/structure-chain'
import { Button } from '@/shared/ui/button'
import { Spinner } from '@/shared/ui/spinner'
import { TablePagination } from '@/shared/ui/table-pagination'
import { useGetMemberAttendanceHistoryQuery } from '@/features/attendance/api/attendanceApi'
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
  const { me } = useOutletContext<DashboardOutletContext>()
  const navigate = useNavigate()
  const sections = row ? memberProfileOverviewSections(row, me.countryCode) : []

  return (
    <MemberPageShell section="profile">
      {row && tree && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(17rem,0.85fr)]">
          <div className="space-y-4">
            {sections.map((section) => (
              <section
                key={section.id}
                className="rounded-xl border border-border/60 bg-background p-4 sm:p-5"
              >
                <h2 className="text-section-title">{section.title}</h2>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  {section.fields.map((field) => (
                    <ProfileFieldTile
                      key={field.id}
                      label={field.label}
                      value={field.value}
                      wide={field.wide}
                    />
                  ))}
                  {section.id === 'work' && (
                    <ProfileFieldTile
                      label="Responsiveness"
                      value={<ResponsivenessBadge level={row.responsiveness} />}
                    />
                  )}
                </dl>
              </section>
            ))}
          </div>

          <aside className="space-y-4">
            <section className="rounded-xl border border-border/60 bg-background p-4 sm:p-5">
              <h2 className="text-section-title">Placement</h2>
              <div className="mt-3">
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
              </div>
              <dl className="mt-3 space-y-2">
                {row.structure.map((segment) => (
                  <div
                    key={segment.layerId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5"
                  >
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {segment.layerName}
                    </dt>
                    <dd className="truncate text-sm font-medium text-foreground">{segment.nodeName}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <ProfileShortcut
                icon={FileText}
                label="Attendance"
                description="History and roll-call status"
                onClick={() => navigate(`${memberBasePath(row.id)}/attendance`)}
              />
              <ProfileShortcut
                icon={Coins}
                label="Givings"
                description="Contributions and totals"
                onClick={() => navigate(`${memberBasePath(row.id)}/givings`)}
              />
            </div>
          </aside>
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
            navigate('/roster/membership')
          } finally {
            setBusy(false)
          }
        }}
        onClose={() => navigate('/roster/membership')}
      />
    </MemberPageShell>
  )
}

function ProfileFieldTile({
  label,
  value,
  wide,
}: {
  label: string
  value: ReactNode
  wide?: boolean
}) {
  const empty = typeof value === 'string' && !value.trim()
  return (
    <div
      className={cn(
        'min-w-0 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5',
        wide && 'sm:col-span-2',
      )}
    >
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          'mt-1 break-words text-sm font-medium',
          empty ? 'font-normal italic text-muted-foreground' : 'text-foreground',
        )}
      >
        {empty ? 'Not set' : value}
      </dd>
    </div>
  )
}

function ProfileShortcut({
  icon: Icon,
  label,
  description,
  onClick,
}: {
  icon: LucideIcon
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-xl border border-border/60 bg-background px-4 py-3.5 text-left transition-colors hover:border-primary/30 hover:bg-muted/20"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/30">
        <Icon className="size-4 text-foreground" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
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
