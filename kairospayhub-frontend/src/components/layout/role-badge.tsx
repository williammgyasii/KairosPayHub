import type { LucideIcon } from 'lucide-react'
import {
  Crown,
  Shield,
  Users,
  UserRound,
  HandCoins,
  Building2,
} from 'lucide-react'
import {
  canManageChurch,
  isCellLeader,
  isScopedLeader,
  roleScopeBadgeLabel,
  type Me,
} from '@/api/auth'
import { cn } from '@/lib/utils'

type RoleDisplay = {
  title: string
  subtitle?: string
  icon: LucideIcon
}

export function roleDisplayInfo(me: Me & { onboarded: true }): RoleDisplay | null {
  const badge = roleScopeBadgeLabel(me)
  if (!badge) return null

  if (isCellLeader(me.role)) {
    return {
      title: badge,
      subtitle: 'Cell leadership',
      icon: UserRound,
    }
  }

  if (isScopedLeader(me.role)) {
    const layerLabel =
      me.role === 'PFCCManager'
        ? 'PFCC leadership'
        : me.role === 'FellowshipLeader'
          ? 'Fellowship leadership'
          : 'Unit leadership'
    return {
      title: badge,
      subtitle: layerLabel,
      icon: Users,
    }
  }

  if (canManageChurch(me.role)) {
    return {
      title: me.role === 'Pastor' ? 'Pastor' : 'Church admin',
      subtitle: 'Full church access',
      icon: me.role === 'Pastor' ? Crown : Shield,
    }
  }

  if (me.role === 'Leader') {
    return {
      title: badge,
      subtitle: me.churchName ?? undefined,
      icon: HandCoins,
    }
  }

  return {
    title: badge,
    subtitle: me.churchName ?? undefined,
    icon: Building2,
  }
}

interface RoleBadgeProps {
  me: Me & { onboarded: true }
  className?: string
  compact?: boolean
}

export function RoleBadge({ me, className, compact = false }: RoleBadgeProps) {
  const info = roleDisplayInfo(me)
  if (!info) return null

  const Icon = info.icon

  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex max-w-[12rem] items-center gap-1.5 truncate rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground',
          className,
        )}
        title={info.subtitle ? `${info.title} · ${info.subtitle}` : info.title}
      >
        <Icon className="size-3 shrink-0 text-primary" aria-hidden />
        <span className="truncate">{info.title}</span>
      </span>
    )
  }

  return (
    <div
      className={cn(
        'flex max-w-[14rem] min-w-0 items-center gap-2.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-2',
        className,
      )}
      title={info.subtitle ? `${info.title} · ${info.subtitle}` : info.title}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight text-foreground">{info.title}</p>
        {info.subtitle ? (
          <p className="truncate text-xs leading-tight text-muted-foreground">{info.subtitle}</p>
        ) : null}
      </div>
    </div>
  )
}
