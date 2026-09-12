import { ChevronDown, HandCoins, Layers, User } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

export type LogGivingMode = 'single' | 'bulk'

export function LogGivingMenu({
  onSelect,
  disabled,
}: {
  onSelect: (mode: LogGivingMode) => void
  disabled?: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" className="gap-1.5" disabled={disabled}>
          <HandCoins className="size-4" />
          Log giving
          <ChevronDown className="size-3.5 opacity-80" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem className="gap-2" onSelect={() => onSelect('single')}>
          <User className="size-4" />
          Single giving
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2" onSelect={() => onSelect('bulk')}>
          <Layers className="size-4" />
          Batch giving
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
