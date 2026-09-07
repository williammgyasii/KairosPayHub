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
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { StructureTree } from '@/api/structure'
import { DashboardCalendarPanel } from '@/components/overview/dashboard-calendar-panel'
import { PastorGivingsOverview } from '@/components/overview/pastor-givings-overview'
import { dashboardMetrics, fellowshipBreakdown } from '@/lib/structure-dashboard'
import {
  dashboardSetupActions,
  dashboardWelcomeSubtitle,
  isEarlyChurchSetup,
  rosterLayerCounts,
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

/** Tiles always stretch to fill the row, regardless of how many metrics the structure has. */
const FLUID_TILE_GRID =
  'grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,10.5rem),1fr))]'

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

  return (
    <section className="rounded-xl border border-border/60 bg-muted/20 px-4 py-4 sm:px-5 sm:py-5">
      <p className="text-xs font-medium text-muted-foreground">{today}</p>
      <h2 className="text-section-title mt-1">
        {earlySetup ? `Welcome, ${firstName}` : `Welcome back, ${firstName}`}
      </h2>
      <p className="text-muted-body mt-2 max-w-2xl">{subtitle}</p>
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
        'flex gap-3 rounded-lg border px-3 py-3 transition-colors',
        isDone && 'border-border/50 bg-muted/20 text-muted-foreground',
        isCurrent && 'border-primary/30 bg-primary/5',
        !isDone && !isCurrent && 'border-border/60 hover:bg-muted/30',
      )}
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
        {isDone ? <Check className="size-4" /> : <Icon className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', isDone && 'line-through')}>{action.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{action.description}</p>
      </div>
      {!isDone ? <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" /> : null}
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
    <section className="rounded-xl border border-border/60 bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <ListChecks className="size-4 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-semibold">
              {earlySetup ? 'Get started' : 'Suggested next steps'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {completed} of {total} complete
            </p>
          </div>
        </div>
        <div className="h-1.5 w-full min-w-[8rem] max-w-[10rem] overflow-hidden rounded-full bg-muted sm:w-24">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
          />
        </div>
      </div>
      <div className={cn(FLUID_TILE_GRID, 'p-3 sm:p-4')}>
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
    <section className={FLUID_TILE_GRID}>
      {metrics.map((metric) => {
        const layer = tree.template?.layers.find((l) => l.id === metric.key)
        const iconKey = metric.key === 'members' ? 'members' : (layer?.standardType ?? 'Cell')
        const Icon = METRIC_ICONS[iconKey] ?? Layers

        return (
          <div
            key={metric.key}
            className="rounded-xl border border-border/60 bg-background px-3 py-3 sm:px-4 sm:py-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-eyebrow">{metric.label}</p>
              <Icon className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
            </div>
            <p className="text-section-title mt-2 tabular-nums">{metric.value}</p>
          </div>
        )
      })}
    </section>
  )
}

function MembersSnapshot({ tree }: { tree: StructureTree }) {
  const members = tree.members.slice(0, 5)
  const total = tree.members.length

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-background">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-semibold">Recent members</h2>
            <p className="text-xs text-muted-foreground">{total} on roster</p>
          </div>
        </div>
        <Link to="/roster/membership" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      </div>
      <ul className="divide-y divide-border/40">
        {members.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
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
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                  {initials(member.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{member.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.phone ?? member.email ?? 'No contact on file'}
                  </p>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </section>
  )
}

function FellowshipSnapshot({ tree }: { tree: StructureTree }) {
  const rows = fellowshipBreakdown(tree).slice(0, 6)
  if (rows.length === 0) return null

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-background">
      <div className="border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold">Fellowships</h2>
        <p className="text-xs text-muted-foreground">Cells and members per unit</p>
      </div>
      <ul className="divide-y divide-border/40">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-sm"
          >
            <span className="min-w-0 flex-1 truncate font-medium">{row.name}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {row.cells} cells · {row.members} members
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function StructureSummaryCard({ tree }: { tree: StructureTree }) {
  const rows = rosterLayerCounts(tree)

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-background">
      <div className="border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold">Structure</h2>
        <p className="text-xs text-muted-foreground">Units by layer</p>
      </div>
      <ul className="divide-y divide-border/40">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-x-4 px-4 py-2.5 text-sm"
          >
            <span className="min-w-0 flex-1 truncate font-medium">{row.label}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {row.count} unit{row.count === 1 ? '' : 's'}
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-x-4 px-4 py-2.5 text-sm">
          <span className="min-w-0 flex-1 truncate font-medium">Members</span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {tree.members.length} on roster
          </span>
        </li>
      </ul>
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
  const fellowshipRows = fellowshipBreakdown(tree)

  return (
    <div className="space-y-5 sm:space-y-6">
      <DashboardWelcome firstName={firstName} tree={tree} />
      <SuggestedActionsPanel tree={tree} />

      {!earlySetup ? (
        <div
          className={cn(
            'grid gap-5',
            showEvents && 'lg:grid-cols-[minmax(0,1fr)_17.5rem] xl:grid-cols-[minmax(0,1fr)_20rem]',
          )}
        >
          <div className="space-y-5">
            <MetricTiles tree={tree} />
            <PastorGivingsOverview tree={tree} />

            <div className="grid gap-4 md:grid-cols-2">
              <MembersSnapshot tree={tree} />
              {fellowshipRows.length > 0 ? (
                <FellowshipSnapshot tree={tree} />
              ) : (
                <StructureSummaryCard tree={tree} />
              )}
            </div>
          </div>

          {showEvents ? (
            <aside className="lg:sticky lg:top-20 lg:self-start">
              <DashboardCalendarPanel />
            </aside>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function DashboardSetupPreview({ tree }: { tree: StructureTree | null }) {
  if (!tree) return null

  return (
    <section className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
      Define your structure in Structure, then add members in Roster.
    </section>
  )
}
