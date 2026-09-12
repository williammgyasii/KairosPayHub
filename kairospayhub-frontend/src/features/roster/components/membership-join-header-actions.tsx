import { Link2, UserRound, Users } from 'lucide-react'
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
    <div className="flex w-full items-center gap-2">
      <div className="inline-flex rounded-md border border-border/70 bg-muted/40 p-0.5">
        <Button
          type="button"
          size="icon"
          variant={tab === 'all' ? 'secondary' : 'ghost'}
          className="size-8"
          aria-label="All"
          onClick={() => onTabChange('all')}
        >
          <Users className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={tab === 'pending' ? 'secondary' : 'ghost'}
          className="relative size-8"
          aria-label="Pending members"
          onClick={() => onTabChange('pending')}
        >
          <UserRound className="size-4" />
          {pendingCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 min-w-3.5 rounded-md bg-amber-200 px-1 text-[10px] font-semibold leading-4 text-amber-950">
              {pendingCount}
            </span>
          ) : null}
        </Button>
      </div>
      <Button type="button" size="sm" className="ml-auto shrink-0" onClick={onGenerateJoinLink}>
        <Link2 className="size-4" />
        Add invite
      </Button>
    </div>
  )
}
