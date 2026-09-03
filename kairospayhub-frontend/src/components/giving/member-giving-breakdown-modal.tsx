import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ApiClient } from '@/api/core'
import type { Contribution, GivingProgram } from '@/api/giving'
import { formatAmount, listMemberContributions } from '@/api/giving'
import type { StructureTree } from '@/api/structure'
import { nodeById, parentChain } from '@/lib/structure-tree'
import { ContributionDetailModal } from '@/components/giving/contribution-detail-modal'
import { LegacyParentContributionBadge } from '@/components/giving/giving-badges'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { InlineSpinner } from '@/components/ui/spinner'
import {
  collectProgramIdsInCampaign,
  contributionEntererLabel,
  contributionLegacyParentLabel,
  contributionRemittanceSummary,
  contributionSubGivingLabel,
  findRootGivingProgram,
  formatGivingDate,
  formatGivingDateTime,
  givingProgramLabel,
} from '@/lib/giving-ui'

interface MemberGivingBreakdownModalProps {
  api: ApiClient
  open: boolean
  onOpenChange: (open: boolean) => void
  memberId: string | null
  memberName: string
  approvedTotal: number
  rank?: number
  memberParentNodeId?: string
  tree?: StructureTree | null
  campaignId: string
  campaigns: GivingProgram[]
  viewerRole?: string
}

type CampaignGroup = {
  id: string
  label: string
  total: number
  entries: Contribution[]
}

export function MemberGivingBreakdownModal({
  api,
  open,
  onOpenChange,
  memberId,
  memberName,
  approvedTotal,
  rank,
  memberParentNodeId,
  tree,
  campaignId,
  campaigns,
  viewerRole,
}: MemberGivingBreakdownModalProps) {
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewTarget, setViewTarget] = useState<Contribution | null>(null)

  const programIds = useMemo(
    () => collectProgramIdsInCampaign(campaigns, campaignId || null),
    [campaigns, campaignId],
  )

  const campaignLabel = useMemo(() => {
    if (!campaignId) return 'All campaigns'
    const root = campaigns.find((program) => program.id === campaignId)
    return root ? givingProgramLabel(root) : 'Selected campaign'
  }, [campaigns, campaignId])

  const structurePath = useMemo(() => {
    if (!tree || !memberParentNodeId) return null
    const node = nodeById(tree, memberParentNodeId)
    if (!node) return null
    return parentChain(tree, node.id)
      .map((item) => item.name)
      .join(' · ')
  }, [tree, memberParentNodeId])

  const groupedContributions = useMemo(() => {
    const groups = new Map<string, CampaignGroup>()
    for (const entry of contributions) {
      const root = findRootGivingProgram(campaigns, entry.programId)
      const id = root?.id ?? entry.programId
      const label = root ? givingProgramLabel(root) : givingProgramLabel(entry)
      const group = groups.get(id) ?? { id, label, total: 0, entries: [] }
      group.entries.push(entry)
      group.total += entry.amount
      groups.set(id, group)
    }
    return [...groups.values()].sort((a, b) => b.total - a.total)
  }, [contributions, campaigns])

  const load = useCallback(async () => {
    if (!memberId || !open) return
    setLoading(true)
    setError(null)
    try {
      const rows = await listMemberContributions(api, memberId)
      const approved = rows
        .filter((row) => row.status === 'Approved' && programIds.has(row.programId))
        .sort((a, b) => new Date(b.dateSent).getTime() - new Date(a.dateSent).getTime())
      setContributions(approved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load breakdown')
      setContributions([])
    } finally {
      setLoading(false)
    }
  }, [api, memberId, open, programIds])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!open) setViewTarget(null)
  }, [open])

  if (!memberId) return null

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title={memberName}
        description={structurePath ?? 'Approved giving history'}
        size="xl"
        className="max-w-4xl"
      >
        <div className="space-y-5">
          <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/10 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryTile label="Rank" value={rank && rank > 0 ? `#${rank}` : '—'} />
            <SummaryTile label="Approved total" value={formatAmount(approvedTotal)} />
            <SummaryTile label="Approved payments" value={String(contributions.length)} />
            <SummaryTile label="Scope" value={campaignLabel} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {loading ? (
            <div className="py-10 text-center">
              <InlineSpinner className="mx-auto size-6 text-muted-foreground" />
            </div>
          ) : contributions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No approved payments for this member in the selected scope.
            </p>
          ) : (
            <div className="space-y-5">
              {groupedContributions.map((group) => (
                <section key={group.id} className="space-y-3">
                  <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/60 pb-2">
                    <div>
                      <h3 className="text-sm font-semibold tracking-tight">{group.label}</h3>
                      <p className="text-xs text-muted-foreground">
                        {group.entries.length} payment{group.entries.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">{formatAmount(group.total)}</p>
                  </div>

                  <div className="space-y-3">
                    {group.entries.map((entry) => (
                      <PaymentHistoryCard
                        key={entry.id}
                        entry={entry}
                        onView={() => setViewTarget(entry)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <ContributionDetailModal
        open={Boolean(viewTarget)}
        onOpenChange={(nextOpen) => !nextOpen && setViewTarget(null)}
        contribution={viewTarget}
        viewerRole={viewerRole}
      />
    </>
  )
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function PaymentHistoryCard({
  entry,
  onView,
}: {
  entry: Contribution
  onView: () => void
}) {
  const givenFor = contributionSubGivingLabel(entry) ?? givingProgramLabel(entry)
  const remittance = contributionRemittanceSummary(entry)
  const legacyLabel = contributionLegacyParentLabel(entry)

  return (
    <div className="rounded-xl border border-border/60 bg-background p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold tabular-nums tracking-tight">
              {formatAmount(entry.amount, entry.currency)}
            </p>
            {entry.isLegacyParentContribution && <LegacyParentContributionBadge />}
          </div>
          <p className="font-medium">{givenFor}</p>
          {entry.isSubGiving && (
            <p className="text-xs text-muted-foreground">
              Sub-giving under{' '}
              <Link
                to={`/givings/${entry.programId}`}
                className="font-medium text-primary hover:underline"
              >
                {entry.programTitle}
              </Link>
            </p>
          )}
        </div>
        <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" onClick={onView}>
          <Eye className="size-3.5" />
          View proof
        </Button>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <DetailItem label="Date sent" value={formatGivingDate(entry.dateSent)} />
        <DetailItem label="Logged by" value={contributionEntererLabel(entry)} />
        {entry.approvedAt && (
          <DetailItem
            label="Approved"
            value={`${formatGivingDateTime(entry.approvedAt)}${entry.approvedByName ? ` · ${entry.approvedByName}` : ''}`}
          />
        )}
        {remittance && <DetailItem label="Remittance" value={remittance} />}
        {legacyLabel && <DetailItem label="Logged on" value={legacyLabel} />}
        {entry.notes && (
          <DetailItem label="Notes" value={entry.notes} className="sm:col-span-2" />
        )}
      </dl>
    </div>
  )
}

function DetailItem({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  )
}
