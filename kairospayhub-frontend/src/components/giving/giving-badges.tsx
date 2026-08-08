import type { ContributionStatus, ProgramApprovalStatus, ProgramStatus } from '@/api/giving'
import { formatApprovalStatus, formatContributionStatus } from '@/api/giving'
import { contributionStatusLabel, contributionStatusTone, programStatusLabel, scopeKindLabel } from '@/lib/giving-ui'
import { Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function ProgramStatusBadge({ status }: { status: ProgramStatus | string }) {
  return (
    <Badge variant={status === 'Open' ? 'default' : 'secondary'}>
      {programStatusLabel(status)}
    </Badge>
  )
}

export function ProgramApprovalBadge({ status }: { status: ProgramApprovalStatus | string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        status === 'PendingPastorApproval' &&
          'border-amber-200/80 bg-amber-500/10 text-amber-900',
        status === 'Rejected' && 'border-destructive/30 bg-destructive/10 text-destructive',
      )}
    >
      {formatApprovalStatus(status)}
    </Badge>
  )
}

export function ScopeKindBadge({ scopeKind }: { scopeKind: string }) {
  return (
    <Badge variant="outline" className="font-normal">
      {scopeKindLabel(scopeKind)}
    </Badge>
  )
}

export function LegacyParentContributionBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'border-amber-200/80 bg-amber-500/10 font-normal text-amber-900 dark:text-amber-200',
        className,
      )}
    >
      Before sub-givings
    </Badge>
  )
}

export function SubGivingTagBadge({ tag }: { tag: 'locked' | 'yours' | 'church' }) {
  if (tag === 'locked') {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-muted-foreground/30 bg-muted/40 font-normal text-muted-foreground"
      >
        <Lock className="size-3" />
        Locked
      </Badge>
    )
  }
  if (tag === 'yours') {
    return (
      <Badge variant="outline" className="border-primary/30 bg-primary/5 font-normal text-primary">
        Yours
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="font-normal text-muted-foreground">
      Church
    </Badge>
  )
}

export function ContributionStatusBadge({
  status,
  viewerRole,
  pendingApproverRole,
}: {
  status: ContributionStatus | string
  viewerRole?: string
  pendingApproverRole?: string | null
}) {
  const tone = contributionStatusTone(status)
  const label = viewerRole
    ? contributionStatusLabel(status, viewerRole, pendingApproverRole)
    : formatContributionStatus(status)
  return (
    <Badge
      variant={tone === 'success' ? 'default' : 'secondary'}
      className={cn(
        tone === 'pending' && 'border-amber-200/80 bg-amber-500/10 text-amber-900',
        tone === 'destructive' && 'border-destructive/30 bg-destructive/10 text-destructive',
      )}
    >
      {label}
    </Badge>
  )
}
