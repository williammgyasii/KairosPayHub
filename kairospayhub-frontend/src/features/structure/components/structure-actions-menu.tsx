import { Link } from 'react-router-dom'
import { MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

interface StructureActionsMenuProps {
  hasRoster: boolean
  busy: boolean
  onRename: () => void
  onDelete: () => void
}

export function StructureActionsMenu({
  hasRoster,
  busy,
  onRename,
  onDelete,
}: StructureActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={busy}>
          <MoreHorizontal className="size-4" />
          Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {hasRoster && (
          <>
            <DropdownMenuItem disabled={busy} onClick={onRename} className="gap-2">
              <Pencil className="size-4" />
              Rename all labels
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <Link to="/roster" className="flex items-center gap-2">
            <Users className="size-4" />
            Go to roster
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/roster/membership" className="flex items-center gap-2">
            Manage membership
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={busy}
          className="gap-2 text-destructive focus:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
          Delete structure
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
