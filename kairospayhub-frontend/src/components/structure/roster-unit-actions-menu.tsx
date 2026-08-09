import { Eye, Layers, MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { StructureTree } from '@/api/structure'
import { directChildLayer } from '@/lib/structure-tree'
import {
  rosterUnitLayerUrl,
  rosterUnitMembersUrl,
  rosterUnitViewLayerLabel,
} from '@/lib/roster-navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface RosterUnitActionsMenuProps {
  tree: StructureTree
  unitId: string
  unitName?: string
  readOnly?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export function RosterUnitActionsMenu({
  tree,
  unitId,
  unitName,
  readOnly = false,
  onEdit,
  onDelete,
}: RosterUnitActionsMenuProps) {
  const childLayer = directChildLayer(tree, unitId)
  const showManageActions = !readOnly && (onEdit || onDelete)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label={unitName ? `Actions for ${unitName}` : 'Unit actions'}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link to={rosterUnitMembersUrl(unitId)} className="gap-2">
            <Users className="size-4" />
            View members
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={rosterUnitMembersUrl(unitId, 'leaders')} className="gap-2">
            <Eye className="size-4" />
            View leaders
          </Link>
        </DropdownMenuItem>
        {childLayer && (
          <DropdownMenuItem asChild>
            <Link to={rosterUnitLayerUrl(unitId, childLayer.id)} className="gap-2">
              <Layers className="size-4" />
              {rosterUnitViewLayerLabel(childLayer.displayName)}
            </Link>
          </DropdownMenuItem>
        )}
        {showManageActions && (
          <>
            <DropdownMenuSeparator />
            {onEdit && (
              <DropdownMenuItem className="gap-2" onClick={onEdit}>
                <Pencil className="size-4" />
                Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                className="gap-2 text-destructive focus:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
