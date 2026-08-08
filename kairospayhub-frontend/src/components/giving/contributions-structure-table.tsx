import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, MoreHorizontal } from 'lucide-react'
import type { Contribution, ContributionStatus, GivingProgram } from '@/api/giving'
import { formatAmount } from '@/api/giving'
import type { StructureTree } from '@/api/structure'
import {
  aggregateSubtreeByLayer,
  availableBreakdownLayers,
  buildContributionStructureTree,
  findContributionTreeNodeWithPath,
  isMemberContributionNode,
  type ContributionStructureOptions,
  type ContributionTreeNode,
} from '@/lib/contribution-structure'
import { formatGivingDate } from '@/lib/giving-ui'
import { ContributionStatusBadge } from '@/components/giving/giving-badges'
import { StructureContributionsUnitSheet } from '@/components/giving/structure-contributions-unit-sheet'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const FILTER_OPTIONS: { value: 'all' | ContributionStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'PendingApproval', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
]

export function ContributionsStructureTable({
  programId,
  contributions,
  tree,
  structureOptions,
  viewerRole,
}: {
  programId: string
  contributions: Contribution[]
  tree: StructureTree | null
  structureOptions?: ContributionStructureOptions
  viewerRole?: string
}) {
  const [filter, setFilter] = useState<'all' | ContributionStatus>('all')
  const [sheetNode, setSheetNode] = useState<ContributionTreeNode | null>(null)

  const filtered = useMemo(() => {
    if (filter === 'all') return contributions
    return contributions.filter((c) => c.status === filter)
  }, [contributions, filter])

  const roots = useMemo(
    () => buildContributionStructureTree(tree, filtered, structureOptions),
    [tree, filtered, structureOptions],
  )

  const counts = useMemo(() => {
    const pending = contributions.filter((c) => c.status === 'PendingApproval').length
    const approved = contributions.filter((c) => c.status === 'Approved').length
    const rejected = contributions.filter((c) => c.status === 'Rejected').length
    return { pending, approved, rejected, all: contributions.length }
  }, [contributions])

  const topLayerLabel = roots[0]?.layerLabel ?? 'Structure'

  return (
    <>
      <StructureLevelTable
        title="Contributions by structure"
        description={`${topLayerLabel} totals — use the menu to open overview or breakdown by level`}
        programId={programId}
        nodes={roots}
        counts={counts}
        filter={filter}
        onFilterChange={setFilter}
        treeMissing={!tree}
        onOpenOverview={setSheetNode}
      />
      <StructureContributionsUnitSheet
        node={sheetNode}
        tree={tree}
        open={sheetNode != null}
        viewerRole={viewerRole}
        onOpenChange={(open) => {
          if (!open) setSheetNode(null)
        }}
      />
    </>
  )
}

export function ProgramStructureContributionsView({
  program,
  nodeId,
  groupBy,
  contributions,
  tree,
  structureOptions,
  viewerRole,
}: {
  program: GivingProgram
  nodeId: string
  groupBy?: string | null
  contributions: Contribution[]
  tree: StructureTree | null
  structureOptions?: ContributionStructureOptions
  viewerRole?: string
}) {
  const [sheetNode, setSheetNode] = useState<ContributionTreeNode | null>(null)

  const roots = useMemo(
    () => buildContributionStructureTree(tree, contributions, structureOptions),
    [tree, contributions, structureOptions],
  )

  const match = useMemo(
    () => findContributionTreeNodeWithPath(roots, nodeId),
    [roots, nodeId],
  )

  const node = match?.node ?? null
  const path = match?.path ?? []
  const isMember = node ? isMemberContributionNode(node) : false

  const displayNodes = useMemo(() => {
    if (!node || isMember) return []
    if (groupBy) return aggregateSubtreeByLayer(node, groupBy)
    return node.children
  }, [node, groupBy, isMember])

  if (!match || !node) {
    return (
      <p className="text-sm text-destructive">
        Structure unit not found or has no contributions in this giving.
      </p>
    )
  }

  const parent = path.length > 1 ? path[path.length - 2] : null

  const breadcrumbs = [
    { label: 'Overview', to: '/' },
    { label: 'Givings', to: '/givings' },
    { label: program.title, to: `/givings/${program.id}` },
    { label: 'Contributions', to: `/givings/${program.id}?tab=contributions` },
    ...path.slice(0, -1).map((segment) => ({
      label: segment.name,
      to: `/givings/${program.id}/structure/${encodeURIComponent(segment.id)}`,
    })),
    { label: node.name },
  ]

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        breadcrumbs={breadcrumbs}
        title={groupBy ? `${node.name} · by ${groupBy}` : node.name}
        description={
          isMember
            ? `${node.paymentCount} payment${node.paymentCount === 1 ? '' : 's'} logged for this member`
            : `${node.layerLabel} · ${formatAmount(node.totalAmount)} across ${node.paymentCount} payment${node.paymentCount === 1 ? '' : 's'}`
        }
        actions={
          parent ? (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to={`/givings/${program.id}/structure/${encodeURIComponent(parent.id)}`}>
                <ChevronLeft className="size-4" />
                Back to {parent.name}
              </Link>
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to={`/givings/${program.id}?tab=contributions`}>
                <ChevronLeft className="size-4" />
                All {node.layerLabel}s
              </Link>
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Total amount" value={formatAmount(node.totalAmount)} />
        <StatTile label="Payments" value={String(node.paymentCount)} />
        <StatTile label="Level" value={node.layerLabel} />
      </div>

      {isMember ? (
        <MemberPaymentsTable payments={node.payments} viewerRole={viewerRole} />
      ) : (
        <>
          <StructureLevelTable
            title={groupBy ? `Breakdown by ${groupBy}` : 'Breakdown'}
            description={
              groupBy
                ? `All ${groupBy} units under ${node.name}`
                : 'Next level down — use the row menu for overview or other breakdowns'
            }
            programId={program.id}
            nodes={displayNodes}
            hideFilters
            onOpenOverview={setSheetNode}
          />
          <StructureContributionsUnitSheet
            node={sheetNode}
            tree={tree}
            open={sheetNode != null}
            viewerRole={viewerRole}
            onOpenChange={(open) => {
              if (!open) setSheetNode(null)
            }}
          />
        </>
      )}
    </div>
  )
}

function StructureLevelTable({
  title,
  description,
  programId,
  nodes,
  counts,
  filter,
  onFilterChange,
  treeMissing,
  hideFilters,
  onOpenOverview,
}: {
  title: string
  description: string
  programId: string
  nodes: ContributionTreeNode[]
  counts?: { all: number; pending: number; approved: number; rejected: number }
  filter?: 'all' | ContributionStatus
  onFilterChange?: (value: 'all' | ContributionStatus) => void
  treeMissing?: boolean
  hideFilters?: boolean
  onOpenOverview: (node: ContributionTreeNode) => void
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
        {!hideFilters && counts && filter != null && onFilterChange && (
          <div className="flex flex-wrap gap-1.5">
            {FILTER_OPTIONS.map((option) => {
              const count =
                option.value === 'all'
                  ? counts.all
                  : option.value === 'PendingApproval'
                    ? counts.pending
                    : option.value === 'Approved'
                      ? counts.approved
                      : counts.rejected
              if (option.value !== 'all' && count === 0) return null
              const active = filter === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted/40',
                  )}
                  onClick={() => onFilterChange(option.value)}
                >
                  {option.label}
                  {count > 0 ? ` (${count})` : ''}
                </button>
              )
            })}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {treeMissing && (
          <p className="mb-4 text-sm text-muted-foreground">
            Structure tree not loaded — cannot group by structure.
          </p>
        )}

        {nodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing at this level.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/20">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Level
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Payments
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Amount
                  </th>
                  <th className="w-12 px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {nodes.map((node) => (
                  <StructureRowMenu
                    key={node.id}
                    node={node}
                    programId={programId}
                    onOpenOverview={onOpenOverview}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StructureRowMenu({
  node,
  programId,
  onOpenOverview,
}: {
  node: ContributionTreeNode
  programId: string
  onOpenOverview: (node: ContributionTreeNode) => void
}) {
  const breakdownLayers = availableBreakdownLayers(node)
  const canDrillDown = !isMemberContributionNode(node) && node.children.length > 0

  return (
    <tr className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/10">
      <td className="px-4 py-3 font-medium">{node.name}</td>
      <td className="px-4 py-3 text-muted-foreground">{node.layerLabel}</td>
      <td className="px-4 py-3 text-right tabular-nums">{node.paymentCount}</td>
      <td className="px-4 py-3 text-right tabular-nums font-semibold">
        {formatAmount(node.totalAmount)}
      </td>
      <td className="px-3 py-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Open menu for {node.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onOpenOverview(node)}>Overview</DropdownMenuItem>
            {canDrillDown && (
              <DropdownMenuItem asChild>
                <Link to={`/givings/${programId}/structure/${encodeURIComponent(node.id)}`}>
                  Drill down
                </Link>
              </DropdownMenuItem>
            )}
            {breakdownLayers.length > 0 && <DropdownMenuSeparator />}
            {breakdownLayers.map((layer) => (
              <DropdownMenuItem key={layer} asChild>
                <Link
                  to={`/givings/${programId}/structure/${encodeURIComponent(node.id)}?group=${encodeURIComponent(layer)}`}
                >
                  Breakdown by {layer}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )
}

function MemberPaymentsTable({
  payments,
  viewerRole,
}: {
  payments: ContributionTreeNode['payments']
  viewerRole?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment history</CardTitle>
        <CardDescription>Every contribution logged for this member in this giving</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/20">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Date sent
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-border/30 last:border-0">
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {formatGivingDate(payment.dateSent)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                    {formatAmount(payment.amount, payment.currency)}
                  </td>
                  <td className="px-4 py-2.5">
                    <ContributionStatusBadge
                      status={payment.status}
                      viewerRole={viewerRole}
                      pendingApproverRole={payment.pendingApproverRole}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{payment.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
    </div>
  )
}
