import { Check, Coins, Eye, FileText, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react'
import type { StructureMemberRow } from '@/lib/structure-table-rows'
import { canRemoveMember, pendingMemberActions } from '@/lib/member-row-actions'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type MemberViewDestination = 'profile' | 'attendance' | 'givings'

export function MemberRowMenu({
  member,
  onEdit,
  onView,
  onDelete,
  onAccept,
  onDecline,
  currentMemberId = null,
  readOnly = false,
}: {
  member: StructureMemberRow
  onEdit?: (member: StructureMemberRow) => void
  onView?: (member: StructureMemberRow, destination?: MemberViewDestination) => void
  onDelete?: (member: StructureMemberRow) => void
  onAccept?: (member: StructureMemberRow) => void
  onDecline?: (member: StructureMemberRow) => void
  currentMemberId?: string | null
  readOnly?: boolean
}) {
  const pending = pendingMemberActions(member.rosterStatus)
  const canEdit = !readOnly && Boolean(onEdit) && !pending.accept
  const canDelete =
    !readOnly && Boolean(onDelete) && !pending.accept && canRemoveMember(currentMemberId, member.id)
  const canAccept = !readOnly && pending.accept && Boolean(onAccept)
  const canDecline = !readOnly && pending.decline && Boolean(onDecline)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground"
          aria-label={`Actions for ${member.member}`}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {canAccept && (
          <DropdownMenuItem className="gap-2" onClick={() => onAccept?.(member)}>
            <Check className="size-4" />
            Accept
          </DropdownMenuItem>
        )}
        {canDecline && (
          <DropdownMenuItem
            className="gap-2 text-destructive focus:text-destructive"
            onClick={() => onDecline?.(member)}
          >
            <X className="size-4" />
            Decline
          </DropdownMenuItem>
        )}
        {onView && !pending.accept && (
          <>
            <DropdownMenuItem className="gap-2" onClick={() => onView(member, 'profile')}>
              <Eye className="size-4" />
              View profile
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={() => onView(member, 'attendance')}>
              <FileText className="size-4" />
              View attendance
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={() => onView(member, 'givings')}>
              <Coins className="size-4" />
              View givings
            </DropdownMenuItem>
          </>
        )}
        {canEdit && (
          <DropdownMenuItem className="gap-2" onClick={() => onEdit?.(member)}>
            <Pencil className="size-4" />
            Edit profile
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            {(onView || canEdit) && <DropdownMenuSeparator />}
            <DropdownMenuItem
              className="gap-2 text-destructive focus:text-destructive"
              onClick={() => onDelete?.(member)}
            >
              <Trash2 className="size-4" />
              Remove member
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
