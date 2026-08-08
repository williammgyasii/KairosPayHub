import { useMemo, useState } from 'react'
import { History, LayoutGrid, Paperclip, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatAmount } from '@/api/giving'
import type { StructureTree } from '@/api/structure'
import type { ContributionStructureRow, ContributionTreeNode } from '@/lib/contribution-structure'
import {
  buildUnitGivingOverview,
  buildUploadsByStructure,
  collectPaymentsInSubtree,
  isMemberContributionNode,
  isPfccContributionNode,
} from '@/lib/contribution-structure'
import { ContributionStatusBadge, LegacyParentContributionBadge } from '@/components/giving/giving-badges'
import { contributionEntererLabel, formatGivingDate } from '@/lib/giving-ui'
import { SideSheet } from '@/components/ui/side-sheet'
import { cn } from '@/lib/utils'

type UnitSheetTab = 'overview' | 'history' | 'attachments'

const TABS: { id: UnitSheetTab; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'history', label: 'History', icon: History },
  { id: 'attachments', label: 'Attachments', icon: Paperclip },
]

interface StructureContributionsUnitSheetProps {
  node: ContributionTreeNode | null
  tree?: StructureTree | null
  open: boolean
  viewerRole?: string
  onOpenChange: (open: boolean) => void
}

export function StructureContributionsUnitSheet({
  node,
  tree,
  open,
  viewerRole,
  onOpenChange,
}: StructureContributionsUnitSheetProps) {
  const [tab, setTab] = useState<UnitSheetTab>('overview')

  const payments = useMemo(
    () => (node ? collectPaymentsInSubtree(node) : []),
    [node],
  )

  const stats = useMemo(() => {
    if (!node) return null
    const approved = payments.filter((p) => p.status === 'Approved')
    const pending = payments.filter((p) => p.status === 'PendingApproval')
    const rejected = payments.filter((p) => p.status === 'Rejected')
    return {
      approvedTotal: approved.reduce((sum, p) => sum + p.amount, 0),
      approvedCount: approved.length,
      pendingCount: pending.length,
      rejectedCount: rejected.length,
      memberCount: new Set(payments.map((p) => p.memberId)).size,
      childCount: node.children.filter((c) => !isMemberContributionNode(c)).length,
    }
  }, [node, payments])

  const overview = useMemo(
    () => (node ? buildUnitGivingOverview(tree ?? null, node) : null),
    [node, tree],
  )

  const uploadsByStructure = useMemo(() => {
    if (!node || !isPfccContributionNode(tree ?? null, node)) return []
    return buildUploadsByStructure(tree ?? null, payments)
  }, [node, tree, payments])

  if (!node) return null

  const isMember = isMemberContributionNode(node)
  const participationRate =
    overview && overview.rosterMembers > 0
      ? Math.round((overview.membersGiving / overview.rosterMembers) * 100)
      : null

  return (
    <SideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={node.name}
      description={`${node.layerLabel} · ${formatAmount(node.totalAmount)}`}
      className="max-w-2xl"
    >
      <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-border/60 px-1 pb-px">
        {TABS.map((item) => {
          const active = tab === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="mt-5">
        {tab === 'overview' && stats && (
          <div className="space-y-5">
            <section className="overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.1] via-primary/[0.04] to-transparent px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Approved giving
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                {formatAmount(stats.approvedTotal)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {stats.approvedCount} approved payment{stats.approvedCount === 1 ? '' : 's'} in this unit
              </p>
            </section>

            {isMember ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricTile label="Payments" value={String(node.paymentCount)} />
                <MetricTile label="Pending" value={String(stats.pendingCount)} highlight={stats.pendingCount > 0} />
                <MetricTile label="Rejected" value={String(stats.rejectedCount)} />
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {overview && overview.rosterCells > 0 && (
                    <MetricTile label="Cells" value={String(overview.rosterCells)} />
                  )}
                  {overview && (
                    <MetricTile
                      label={overview.participationLabel}
                      value={String(overview.rosterMembers)}
                      icon={Users}
                    />
                  )}
                  <MetricTile label="Members giving" value={String(stats.memberCount)} />
                  <MetricTile
                    label="Participation"
                    value={participationRate != null ? `${participationRate}%` : '—'}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricTile label="Pending" value={String(stats.pendingCount)} highlight={stats.pendingCount > 0} />
                  <MetricTile label="Approved" value={String(stats.approvedCount)} />
                  <MetricTile label="Rejected" value={String(stats.rejectedCount)} />
                </div>

                {overview && overview.breakdownRows.length > 0 && (
                  <BreakdownTable
                    title={overview.breakdownTitle}
                    rows={overview.breakdownRows}
                    showUnitNumber={overview.breakdownRows.some((row) => row.unitNumber)}
                    memberLevel={overview.breakdownTitle.includes('Members')}
                  />
                )}

                {uploadsByStructure.length > 0 && (
                  <UploadsByStructureSection
                    groups={uploadsByStructure}
                    viewerRole={viewerRole}
                  />
                )}
              </>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-2">
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments in this unit yet.</p>
            ) : (
              payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-lg border border-border/60 px-3 py-2.5 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{payment.memberName}</p>
                        {payment.isLegacyParentContribution && <LegacyParentContributionBadge />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {payment.structurePath} · {formatGivingDate(payment.dateSent)}
                        {' · '}
                        Logged by {contributionEntererLabel(payment)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">
                        {formatAmount(payment.amount, payment.currency)}
                      </p>
                      <ContributionStatusBadge
                        status={payment.status}
                        viewerRole={viewerRole}
                        pendingApproverRole={payment.pendingApproverRole}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'attachments' && (
          <div className="space-y-2">
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attachments yet.</p>
            ) : (
              payments.map((payment) => (
                <AttachmentRow key={payment.id} payment={payment} />
              ))
            )}
          </div>
        )}
      </div>
    </SideSheet>
  )
}

function UploadsByStructureSection({
  groups,
  viewerRole,
}: {
  groups: ReturnType<typeof buildUploadsByStructure>
  viewerRole?: string
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border/60">
      <div className="border-b border-border/60 bg-muted/15 px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight">Who uploaded what</h3>
        <p className="text-xs text-muted-foreground">
          Every logged payment below this PFCC, grouped by fellowship and cell
        </p>
      </div>
      <div className="divide-y divide-border/50">
        {groups.map((group) => (
          <div key={group.fellowshipName} className="px-4 py-4">
            <p className="text-sm font-semibold">{group.fellowshipName}</p>
            <div className="mt-3 space-y-4">
              {group.cells.map((cell) => (
                <div key={`${group.fellowshipName}-${cell.cellName}`}>
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span>
                      {cell.unitNumber ? `#${cell.unitNumber} · ` : ''}
                      {cell.cellName}
                    </span>
                    <span>·</span>
                    <span>{cell.uploads.length} upload{cell.uploads.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="mt-2 overflow-x-auto rounded-lg border border-border/50">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/10">
                          <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Member
                          </th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Logged by
                          </th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Date
                          </th>
                          <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Amount
                          </th>
                          <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {cell.uploads.map((upload) => (
                          <tr key={upload.id} className="border-b border-border/40 last:border-0">
                            <td className="px-3 py-2.5 font-medium">{upload.memberName}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {contributionEntererLabel(upload)}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {formatGivingDate(upload.dateSent)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                              {formatAmount(upload.amount, upload.currency)}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <ContributionStatusBadge
                                status={upload.status}
                                viewerRole={viewerRole}
                                pendingApproverRole={upload.pendingApproverRole}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function BreakdownTable({
  title,
  rows,
  showUnitNumber,
  memberLevel,
}: {
  title: string
  rows: {
    id: string
    name: string
    unitNumber: string | null
    rosterCount: number
    membersGiving: number
    approvedTotal: number
    paymentCount: number
    pendingCount: number
  }[]
  showUnitNumber: boolean
  memberLevel: boolean
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border/60">
      <div className="border-b border-border/60 bg-muted/15 px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <p className="text-xs text-muted-foreground">
          {memberLevel ? 'Who has logged giving in this cell' : 'Giving by unit under this level'}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/10">
              {showUnitNumber && (
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  #
                </th>
              )}
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {memberLevel ? 'Member' : 'Unit'}
              </th>
              {!memberLevel && (
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  People giving
                </th>
              )}
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Approved
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Payments
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/40 last:border-0 hover:bg-muted/10">
                {showUnitNumber && (
                  <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                    {row.unitNumber ?? '—'}
                  </td>
                )}
                <td className="px-3 py-2.5 font-medium">{row.name}</td>
                {!memberLevel && (
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                    {row.rosterCount > 0 ? (
                      <>
                        {row.membersGiving}
                        <span className="text-xs"> / {row.rosterCount}</span>
                      </>
                    ) : (
                      row.membersGiving
                    )}
                  </td>
                )}
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                  {formatAmount(row.approvedTotal)}
                  {row.pendingCount > 0 && (
                    <span className="ml-1 block text-xs font-normal text-amber-700">
                      {row.pendingCount} pending
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                  {row.paymentCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function AttachmentRow({ payment }: { payment: ContributionStructureRow }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium">{payment.memberName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {contributionEntererLabel(payment)} · {payment.attachmentKey}
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">Screenshot on file</span>
    </div>
  )
}

function MetricTile({
  label,
  value,
  highlight,
  icon: Icon,
}: {
  label: string
  value: string
  highlight?: boolean
  icon?: LucideIcon
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5',
        highlight && 'border-amber-500/30 bg-amber-500/[0.06]',
      )}
    >
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5 text-muted-foreground" />}
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}
