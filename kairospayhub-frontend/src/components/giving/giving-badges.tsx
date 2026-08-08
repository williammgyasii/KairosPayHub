import type { ContributionStatus, ProgramStatus } from '@/api/giving'
import { formatContributionStatus } from '@/api/giving'
import { contributionStatusTone, programStatusLabel, scopeKindLabel } from '@/lib/giving-ui'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function ProgramStatusBadge({ status }: { status: ProgramStatus | string }) {
  return (
    <Badge variant={status === 'Open' ? 'default' : 'secondary'}>
      {programStatusLabel(status)}
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

export function ContributionStatusBadge({ status }: { status: ContributionStatus | string }) {
  const tone = contributionStatusTone(status)
  return (
    <Badge
      variant={tone === 'success' ? 'default' : 'secondary'}
      className={cn(
        tone === 'pending' && 'border-amber-200/80 bg-amber-500/10 text-amber-900',
        tone === 'destructive' && 'border-destructive/30 bg-destructive/10 text-destructive',
      )}
    >
      {formatContributionStatus(status)}
    </Badge>
  )
}
