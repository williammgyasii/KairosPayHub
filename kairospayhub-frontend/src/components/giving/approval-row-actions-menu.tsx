import { Check, Eye, MoreHorizontal, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type ApprovalRowActionsMenuProps = {
  busy?: boolean
  canAct?: boolean
  viewHref?: string
  onView?: () => void
  onApprove?: () => void
  onReject?: () => void
}

export function ApprovalRowActionsMenu({
  busy,
  canAct,
  viewHref,
  onView,
  onApprove,
  onReject,
}: ApprovalRowActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          disabled={busy}
          aria-label="Row actions"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {(viewHref || onView) && (
          viewHref ? (
            <DropdownMenuItem asChild>
              <Link to={viewHref} className="gap-2">
                <Eye className="size-3.5 opacity-70" />
                View
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem className="gap-2" onClick={onView}>
              <Eye className="size-3.5 opacity-70" />
              View
            </DropdownMenuItem>
          )
        )}
        {canAct && (
          <>
            {(viewHref || onView) && <DropdownMenuSeparator />}
            <DropdownMenuItem
              className="gap-2"
              disabled={busy}
              onClick={onApprove}
            >
              <Check className="size-3.5 opacity-70" />
              Approve
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 text-destructive focus:text-destructive"
              disabled={busy}
              onClick={onReject}
            >
              <X className="size-3.5 opacity-70" />
              Reject
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
