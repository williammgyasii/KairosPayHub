import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Contribution } from '@/api/giving'
import { formatAmount } from '@/api/giving'
import type { StructureTree } from '@/api/structure'
import { groupContributionsByMember } from '@/lib/contribution-structure'
import { formatGivingDate, contributionLegacyParentLabel } from '@/lib/giving-ui'
import { ContributionStatusBadge, LegacyParentContributionBadge } from '@/components/giving/giving-badges'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function ContributionsHistoryTable({
  contributions,
  tree,
  viewerRole,
}: {
  contributions: Contribution[]
  tree: StructureTree | null
  viewerRole?: string
}) {
  const members = useMemo(
    () => groupContributionsByMember(tree, contributions),
    [tree, contributions],
  )
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  function toggle(memberId: string) {
    setExpanded((prev) => ({ ...prev, [memberId]: !prev[memberId] }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Member history</CardTitle>
        <CardDescription>
          One row per person — expand to see every payment logged for this giving
        </CardDescription>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contributions logged yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/20">
                  <th className="w-8 px-3 py-3" />
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Member
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Structure
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Payments
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Approved
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Last given
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const open = expanded[member.memberId] ?? false
                  return (
                    <MemberHistoryRows
                      key={member.memberId}
                      member={member}
                      open={open}
                      onToggle={() => toggle(member.memberId)}
                      viewerRole={viewerRole}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MemberHistoryRows({
  member,
  open,
  onToggle,
  viewerRole,
}: {
  member: ReturnType<typeof groupContributionsByMember>[number]
  open: boolean
  onToggle: () => void
  viewerRole?: string
}) {
  return (
    <>
      <tr className="border-b border-border/40 hover:bg-muted/10">
        <td className="px-3 py-3 align-middle">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            aria-expanded={open}
            aria-label={open ? 'Collapse history' : 'Expand history'}
          >
            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        </td>
        <td className="px-4 py-3 align-middle font-medium">{member.memberName}</td>
        <td className="px-4 py-3 align-middle text-muted-foreground">{member.structurePath}</td>
        <td className="px-4 py-3 align-middle">
          {member.contributionCount}
          {member.pendingCount > 0 && (
            <span className="ml-1 text-xs text-muted-foreground">
              ({member.pendingCount} pending)
            </span>
          )}
        </td>
        <td className="px-4 py-3 align-middle tabular-nums font-medium">
          {formatAmount(member.approvedTotal)}
        </td>
        <td className="px-4 py-3 align-middle text-muted-foreground">
          {member.lastDateSent ? formatGivingDate(member.lastDateSent) : '—'}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-border/40 bg-muted/5">
          <td colSpan={6} className="px-4 py-3">
            <ul className="space-y-2 pl-8">
              {member.entries.map((entry) => (
                <li
                  key={entry.id}
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 bg-background px-3 py-2',
                  )}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium tabular-nums">
                        {formatAmount(entry.amount, entry.currency)}
                      </p>
                      {entry.isLegacyParentContribution && <LegacyParentContributionBadge />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sent {formatGivingDate(entry.dateSent)}
                      {contributionLegacyParentLabel(entry)
                        ? ` · ${contributionLegacyParentLabel(entry)}`
                        : ''}
                      {entry.notes ? ` · ${entry.notes}` : ''}
                    </p>
                  </div>
                  <ContributionStatusBadge
                    status={entry.status}
                    viewerRole={viewerRole}
                    pendingApproverRole={entry.pendingApproverRole}
                  />
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  )
}
