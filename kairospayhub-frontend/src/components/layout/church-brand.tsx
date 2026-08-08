import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn, initials } from '@/lib/utils'

const DEFAULT_CHURCH_EMOJI = '⛪'

interface ChurchBrandProps {
  churchName?: string | null
  logoUrl?: string | null
  collapsed?: boolean
  className?: string
}

export function ChurchBrand({ churchName, logoUrl, collapsed, className }: ChurchBrandProps) {
  const label = churchName?.trim() || 'Your church'
  const fallback = churchName ? initials(churchName) : DEFAULT_CHURCH_EMOJI

  return (
    <div
      className={cn(
        'flex items-center',
        collapsed ? 'justify-center' : 'gap-3',
        className,
      )}
    >
      <Avatar
        className={cn(
          'shrink-0 rounded-xl border bg-muted/40',
          collapsed ? 'size-10' : 'size-12',
        )}
      >
        {logoUrl ? <AvatarImage src={logoUrl} alt={label} className="object-cover" /> : null}
        <AvatarFallback className="rounded-xl bg-primary/10 text-base font-semibold text-primary">
          {logoUrl ? fallback : DEFAULT_CHURCH_EMOJI}
        </AvatarFallback>
      </Avatar>

      {!collapsed && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold leading-tight tracking-tight">{label}</p>
          <p className="truncate text-xs text-muted-foreground">Church workspace</p>
        </div>
      )}
    </div>
  )
}
