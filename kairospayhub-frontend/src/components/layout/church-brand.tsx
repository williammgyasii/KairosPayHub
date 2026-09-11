import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn, initials } from '@/lib/utils'

interface ChurchBrandProps {
  churchName?: string | null
  logoUrl?: string | null
  collapsed?: boolean
  /** Avatar mark only — same shape as sidebar, without name / “Church workspace”. */
  logoOnly?: boolean
  className?: string
}

export function ChurchBrand({
  churchName,
  logoUrl,
  collapsed,
  logoOnly,
  className,
}: ChurchBrandProps) {
  const label = churchName?.trim() || 'Your church'
  const fallback = initials(label)
  const avatarClass = logoOnly ? 'size-16' : collapsed ? 'size-10' : 'size-12'

  return (
    <div
      className={cn(
        'flex min-w-0 items-center',
        logoOnly || collapsed ? 'justify-center' : 'w-full gap-3',
        className,
      )}
      data-testid={logoOnly ? 'church-logo-preview' : undefined}
      data-logo-url={logoOnly ? logoUrl ?? '' : undefined}
    >
      <Avatar className={cn('shrink-0 rounded-xl border bg-muted/40', avatarClass)}>
        {logoUrl ? <AvatarImage src={logoUrl} alt={label} className="object-cover" /> : null}
        <AvatarFallback className="rounded-xl bg-primary/10 text-sm font-semibold text-primary">
          {fallback}
        </AvatarFallback>
      </Avatar>

      {!collapsed && !logoOnly && (
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="truncate text-base font-bold leading-tight tracking-tight">{label}</p>
          <p className="truncate text-xs text-muted-foreground">Church workspace</p>
        </div>
      )}
    </div>
  )
}
