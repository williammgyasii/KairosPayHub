import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function AddFellowshipButton({
  label,
  onClick,
  disabled,
  className,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <Button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'shrink-0 border-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20',
        'hover:from-emerald-700 hover:to-teal-700 hover:shadow-emerald-700/25',
        'disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:shadow-none',
        className,
      )}
    >
      <Plus className="size-4" />
      {label}
    </Button>
  )
}
