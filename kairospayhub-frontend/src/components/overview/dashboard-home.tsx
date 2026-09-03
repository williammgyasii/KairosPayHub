import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Church,
  Circle,
  Layers,
  ListChecks,
  Network,
  Sparkles,
  TrendingUp,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { StructureTree } from '@/api/structure'
import { UpcomingEventsCard } from '@/components/overview/upcoming-events-card'
import {
  CHART_COLORS,
  dashboardMetrics,
  fellowshipBreakdown,
} from '@/lib/structure-dashboard'
import {
  dashboardSetupActions,
  dashboardWelcomeSubtitle,
  isEarlyChurchSetup,
  setupProgress,
  type DashboardSetupAction,
} from '@/lib/dashboard-setup-actions'
import { cn, initials } from '@/lib/utils'

const SETUP_ICONS: Record<string, LucideIcon> = {
  structure: Layers,
  units: Network,
  leaders: UserCog,
  members: UserPlus,
}

const METRIC_ICONS: Record<string, LucideIcon> = {
  Group: Layers,
  PFCC: Layers,
  Fellowship: Church,
  Cell: Network,
  members: Users,
}

const TILE_ACCENTS = [
  { chip: 'bg-indigo-500/15 text-indigo-700', ring: 'ring-indigo-500/20', dot: 'bg-indigo-500' },
  { chip: 'bg-violet-500/15 text-violet-700', ring: 'ring-violet-500/20', dot: 'bg-violet-500' },
  { chip: 'bg-sky-500/15 text-sky-700', ring: 'ring-sky-500/20', dot: 'bg-sky-500' },
  { chip: 'bg-emerald-500/15 text-emerald-700', ring: 'ring-emerald-500/20', dot: 'bg-emerald-500' },
  { chip: 'bg-amber-500/15 text-amber-800', ring: 'ring-amber-500/20', dot: 'bg-amber-500' },
  { chip: 'bg-rose-500/15 text-rose-700', ring: 'ring-rose-500/20', dot: 'bg-rose-500' },
] as const

const WHATS_NEW = [
  {
    title: 'Givings campaigns',
    body: 'Launch a campaign and track contributions by cell or fellowship.',
    tag: 'Hot',
    tagClass: 'bg-orange-500/15 text-orange-700',
    to: '/givings',
  },
  {
    title: 'Events calendar',
    body: 'Birthdays, meetings, and church events in one feed.',
    tag: 'New',
    tagClass: 'bg-sky-500/15 text-sky-700',
    to: '/events',
  },
  {
    title: 'Church branding',
    body: 'Upload your logo in Settings for a branded sidebar.',
    tag: 'Tip',
    tagClass: 'bg-violet-500/15 text-violet-700',
    to: '/settings/branding',
  },
] as const

function DashboardWelcome({
  firstName,
  tree,
}: {
  firstName: string
  tree: StructureTree
}) {
  const today = format(new Date(), 'EEEE, MMMM d')
  const earlySetup = isEarlyChurchSetup(tree)
  const subtitle = dashboardWelcomeSubtitle(tree)
  const { completed, total } = setupProgress(tree)

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/[0.07] via-background to-violet-500/[0.06] px-5 py-6 sm:px-7 sm:py-7">
      <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-primary/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 left-1/3 size-24 rounded-full bg-violet-500/10 blur-2xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{today}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {earlySetup ? `Welcome, ${firstName}` : `Welcome back, ${firstName}`}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          {earlySetup ? (
            <p className="mt-3 text-xs font-medium text-primary">
              Setup progress · {completed} of {total} complete
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
          <Sparkles className="size-3.5 text-primary" aria-hidden />
          Your church dashboard
        </div>
      </div>
    </section>
  )
}

function SetupActionCard({ action }: { action: DashboardSetupAction }) {
  const Icon = SETUP_ICONS[action.id] ?? Circle
  const isDone = action.status === 'done'
  const isCurrent = action.status === 'current'

  return (
    <Link
      to={action.to}
      className={cn(
        'group flex gap-3 rounded-xl border px-3.5 py-3 transition-all sm:px-4 sm:py-3.5',
        isDone && 'border-border/40 bg-muted/20 opacity-80',
        isCurrent && 'border-primary/40 bg-primary/5 shadow-sm ring-1 ring-primary/20',
        !isDone && !isCurrent && 'border-border/40 bg-background hover:border-border hover:bg-muted/20',
      )}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg',
          isDone && 'bg-emerald-500/15 text-emerald-700',
          isCurrent && 'bg-primary/15 text-primary',
          !isDone && !isCurrent && 'bg-muted text-muted-foreground',
        )}
      >
        {isDone ? <Check className="size-4" /> : <Icon className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm font-semibold leading-snug', isDone && 'text-muted-foreground line-through')}>
            {action.title}
          </p>
          {isCurrent ? (
            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
              Start here
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{action.description}</p>
        {action.detail ? (
          <p className="mt-1.5 text-[11px] font-medium text-foreground/80">{action.detail}</p>
        ) : null}
      </div>
      {!isDone ? (
        <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      ) : null}
    </Link>
  )
}

function SuggestedActionsPanel({ tree }: { tree: StructureTree }) {
  const actions = dashboardSetupActions(tree)
  const { completed, total } = setupProgress(tree)
  const earlySetup = isEarlyChurchSetup(tree)
  const allDone = completed === total

  if (allDone && !earlySetup) return null

  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border bg-background',
        earlySetup ? 'border-primary/30 shadow-sm' : 'border-border/60',
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ListChecks className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              {earlySetup ? 'Get your church set up' : 'Suggested actions'}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {earlySetup
                ? 'Units and leaders first — then members and givings.'
                : `${completed} of ${total} setup steps done`}
            </p>
          </div>
        </div>
        <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-muted sm:block">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-2">
        {actions.map((action) => (
          <SetupActionCard key={action.id} action={action} />
        ))}
      </div>
    </section>
  )
}

function MetricTiles({ tree }: { tree: StructureTree }) {
  const metrics = dashboardMetrics(tree)

  return (
    <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
      {metrics.map((metric, index) => {
        const layer = tree.template?.layers.find((l) => l.id === metric.key)
        const iconKey = metric.key === 'members' ? 'members' : (layer?.standardType ?? 'Cell')
        const Icon = METRIC_ICONS[iconKey] ?? Layers
        const accent = TILE_ACCENTS[index % TILE_ACCENTS.length]
        const fill = CHART_COLORS[index % CHART_COLORS.length]

        return (
          <div
            key={metric.key}
            className={cn(
              'group relative overflow-hidden rounded-xl border border-border/50 bg-background p-3 ring-1 transition-shadow hover:shadow-md sm:p-3.5',
              accent.ring,
            )}
          >
            <div
              className="pointer-events-none absolute -right-3 -top-3 size-12 rounded-full opacity-20"
              style={{ backgroundColor: fill }}
            />
            <div className="relative flex items-start justify-between gap-2">
              <span
                className={cn(
                  'inline-flex size-7 items-center justify-center rounded-lg',
                  accent.chip,
                )}
              >
                <Icon className="size-3.5" aria-hidden />
              </span>
              <span className={cn('size-1.5 rounded-full', accent.dot)} aria-hidden />
            </div>
            <p className="relative mt-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {metric.label}
            </p>
            <p className="relative mt-0.5 text-xl font-bold tabular-nums tracking-tight sm:text-2xl">
              {metric.value}
            </p>
          </div>
        )
      })}
    </section>
  )
}

function MembersSnapshot({ tree }: { tree: StructureTree }) {
  const members = tree.members.slice(0, 6)
  const total = tree.members.length

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-background">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700">
            <Users className="size-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Members</h2>
            <p className="text-[11px] text-muted-foreground">{total} on roster</p>
          </div>
        </div>
        <Link
          to="/roster/membership"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View all
          <ArrowRight className="size-3" />
        </Link>
      </div>

      <ul className="flex-1 divide-y divide-border/40 px-2 py-1">
        {members.length === 0 ? (
          <li className="px-2 py-6 text-center text-sm text-muted-foreground">
            No members yet.{' '}
            <Link to="/roster/membership" className="font-medium text-primary hover:underline">
              Add your first
            </Link>
          </li>
        ) : (
          members.map((member) => (
            <li key={member.id}>
              <Link
                to="/roster/membership"
                className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                  {initials(member.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{member.name}</p>
                  {member.phone ? (
                    <p className="truncate text-[11px] text-muted-foreground">{member.phone}</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground/70">No phone on file</p>
                  )}
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>

      {total > members.length ? (
        <div className="border-t border-border/60 px-4 py-2.5">
          <Link
            to="/roster/membership"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <UserPlus className="size-3.5" />
            {total - members.length} more on roster
          </Link>
        </div>
      ) : null}
    </section>
  )
}

function WhatsNewPanel() {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-background">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <div className="flex size-7 items-center justify-center rounded-lg bg-orange-500/15 text-orange-700">
          <Sparkles className="size-3.5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-tight">What&apos;s new</h2>
          <p className="text-[11px] text-muted-foreground">Fresh in KairosPayHub</p>
        </div>
      </div>

      <ul className="flex-1 space-y-2 p-3">
        {WHATS_NEW.map((item) => (
          <li key={item.title}>
            <Link
              to={item.to}
              className="block rounded-lg border border-border/40 bg-muted/15 px-3 py-2.5 transition-colors hover:border-border hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug">{item.title}</p>
                <span
                  className={cn(
                    'shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                    item.tagClass,
                  )}
                >
                  {item.tag}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function FellowshipSnapshot({ tree }: { tree: StructureTree }) {
  const rows = fellowshipBreakdown(tree).slice(0, 4)

  if (rows.length === 0) return null

  return (
    <section className="overflow-hidden rounded-xl border border-border/60 bg-background xl:col-span-2">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <TrendingUp className="size-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Fellowship snapshot</h2>
          <p className="text-[11px] text-muted-foreground">Cells and members at a glance</p>
        </div>
      </div>
      <div className="grid gap-2 p-3 sm:grid-cols-2">
        {rows.map((row, index) => {
          const accent = TILE_ACCENTS[index % TILE_ACCENTS.length]
          return (
            <div
              key={row.id}
              className={cn('rounded-lg border border-border/40 bg-background px-3 py-2.5', accent.chip)}
            >
              <p className="truncate text-sm font-medium">{row.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {row.cells} cells · {row.members} members
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function PastorDashboardHome({
  tree,
  firstName,
  showEvents,
}: {
  tree: StructureTree
  firstName: string
  showEvents: boolean
}) {
  const earlySetup = isEarlyChurchSetup(tree)

  return (
    <div className="space-y-5 sm:space-y-6">
      <DashboardWelcome firstName={firstName} tree={tree} />
      <SuggestedActionsPanel tree={tree} />

      {!earlySetup ? <MetricTiles tree={tree} /> : null}

      {showEvents && !earlySetup ? <UpcomingEventsCard /> : null}

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        {!earlySetup ? <MembersSnapshot tree={tree} /> : null}
        {!earlySetup ? <WhatsNewPanel /> : null}
      </div>

      {!earlySetup ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <FellowshipSnapshot tree={tree} />
        </div>
      ) : null}
    </div>
  )
}

export function DashboardSetupPreview({ tree }: { tree: StructureTree | null }) {
  if (!tree) return null

  return (
    <section className="rounded-xl border border-border/60 bg-muted/10 px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Dashboard preview
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Go to Structure to define your layer chain, then add nodes and members in Roster.
      </p>
    </section>
  )
}
