import { Eye, Layers, Lock, MoreHorizontal, RotateCcw, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { GivingProgram } from '@/api/giving'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type CampaignAction = 'view' | 'subgivings' | 'close' | 'reopen' | 'delete'

interface GivingCampaignActionsMenuProps {
  program: GivingProgram
  canManage?: boolean
  onAction?: (action: CampaignAction, program: GivingProgram) => void
}

export function GivingCampaignActionsMenu({
  program,
  canManage = false,
  onAction,
}: GivingCampaignActionsMenuProps) {
  const isOpen = program.status === 'Open'
  const showSubGivings = program.hasChildren || !program.parentProgramId

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label={`Actions for ${program.title}`}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link to={`/givings/${program.id}`} className="gap-2">
            <Eye className="size-4" />
            View campaign
          </Link>
        </DropdownMenuItem>
        {showSubGivings && (
          <DropdownMenuItem asChild>
            <Link to={`/givings/${program.id}?tab=subgivings`} className="gap-2">
              <Layers className="size-4" />
              Sub givings
            </Link>
          </DropdownMenuItem>
        )}
        {canManage && (
          <>
            <DropdownMenuSeparator />
            {isOpen ? (
              <DropdownMenuItem className="gap-2" onClick={() => onAction?.('close', program)}>
                <Lock className="size-4" />
                Close campaign
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem className="gap-2" onClick={() => onAction?.('reopen', program)}>
                <RotateCcw className="size-4" />
                Reopen campaign
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="gap-2 text-destructive focus:text-destructive"
              onClick={() => onAction?.('delete', program)}
            >
              <Trash2 className="size-4" />
              Delete campaign
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
