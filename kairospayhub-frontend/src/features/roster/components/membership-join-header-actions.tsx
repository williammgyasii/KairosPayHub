import { Link2 } from 'lucide-react'
import type { MembershipRosterTab } from '@/lib/join-link-policy'
import { Button } from '@/shared/ui/button'

interface MembershipJoinHeaderActionsProps {
  tab: MembershipRosterTab
  onTabChange: (tab: MembershipRosterTab) => void
  pendingCount: number
  onGenerateJoinLink: () => void
}

export function MembershipJoinHeaderActions({
  tab,
  onTabChange,
  pendingCount,
  onGenerateJoinLink,
}: MembershipJoinHeaderActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-border/70 bg-muted/40 p-0.5">
        <Button
          type="button"
          size="sm"
          variant={tab === 'all' ? 'secondary' : 'ghost'}
          onClick={() => onTabChange('all')}
        >
          All
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === 'pending' ? 'secondary' : 'ghost'}
          onClick={() => onTabChange('pending')}
        >
          Pending members
          {pendingCount > 0 ? (
            <span className="ml-1.5 rounded-full bg-amber-200 px-1.5 text-[11px] font-semibold text-amber-950">
              {pendingCount}
            </span>
          ) : null}
        </Button>
      </div>
      <Button type="button" size="sm" onClick={onGenerateJoinLink}>
        <Link2 className="size-4" />
        Generate join link
      </Button>
    </div>
  )
}
