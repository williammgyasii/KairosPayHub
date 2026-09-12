import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  ChevronDown,
  LogOut,
  Palette,
  Shield,
  User,
  Users,
} from 'lucide-react'
import { canManageChurch, displayName, type Me } from '@/api/auth'
import { useAuth } from '@/auth/AuthContext'
import { ChurchBrand } from '@/shared/layout/church-brand'
import { NotificationsBell } from '@/shared/layout/notifications-bell'
import { RoleBadge } from '@/shared/layout/role-badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { cn, initials } from '@/shared/lib/utils'

interface DashboardTopbarProps {
  me: Me & { onboarded: true }
}

function MenuLink({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <DropdownMenuItem asChild className="cursor-pointer p-0 focus:bg-transparent">
      <Link
        to={to}
        className="flex w-full items-start gap-3 rounded-md px-2.5 py-2.5 transition-colors hover:bg-muted/60 focus-visible:outline-none"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-body font-medium leading-tight">{title}</span>
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{description}</span>
        </span>
      </Link>
    </DropdownMenuItem>
  )
}

export function DashboardTopbar({ me }: DashboardTopbarProps) {
  const { email, signOut } = useAuth()
  const name = displayName(me, email)
  const churchManager = canManageChurch(me.role)

  return (
    <header className="sticky top-0 z-30 flex h-16 min-w-0 shrink-0 items-center gap-3 border-b border-border/50 bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sm:gap-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
          <ChurchBrand
            churchName={me.churchName}
            logoUrl={me.churchLogoUrl}
            collapsed
            className="shrink-0"
          />
          <p className="truncate text-body font-semibold text-foreground">
            {me.churchName?.trim() || 'Your church'}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <RoleBadge me={me} className="hidden lg:flex" />

        <div className="flex items-center gap-1.5 sm:gap-2">
          <NotificationsBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                aria-label={name}
                className={cn(
                  'h-9 shrink-0 gap-2 rounded-full border border-transparent px-1.5 hover:border-border/60 hover:bg-muted/40',
                  'md:rounded-full md:pl-1 md:pr-2.5',
                )}
              >
                <Avatar
                  className="h-7 w-7 ring-1 ring-border/60"
                  data-testid="user-avatar"
                  data-has-image={me.avatarUrl ? 'true' : 'false'}
                >
                  {me.avatarUrl ? <AvatarImage src={me.avatarUrl} alt="" /> : null}
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {initials(me.name, me.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[8rem] truncate text-body font-medium text-foreground md:inline">
                  {name}
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 overflow-hidden rounded-xl p-0 shadow-lg">
              <div className="border-b border-border/60 bg-muted/20 px-4 py-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-11 shrink-0 ring-2 ring-background">
                    <AvatarFallback className="bg-primary/10 text-body font-semibold text-primary">
                      {initials(me.name, me.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold text-foreground">{name}</p>
                    {email ? (
                      <p className="truncate text-xs text-muted-foreground">{email}</p>
                    ) : null}
                    <RoleBadge me={me} compact className="mt-2" />
                  </div>
                </div>
              </div>

              <div className="p-2">
                <DropdownMenuLabel className="text-eyebrow px-2 py-1.5">
                  Your account
                </DropdownMenuLabel>
                <MenuLink
                  to="/settings/profile"
                  icon={User}
                  title="Profile"
                  description="Name, email, and role"
                />
                <MenuLink
                  to="/settings/notifications"
                  icon={Bell}
                  title="Notifications"
                  description="Alerts and delivery preferences"
                />
                <MenuLink
                  to="/settings/security"
                  icon={Shield}
                  title="Security"
                  description="Password and sign-in"
                />
              </div>

              {churchManager ? (
                <>
                  <DropdownMenuSeparator className="mx-0" />
                  <div className="p-2">
                    <DropdownMenuLabel className="text-eyebrow px-2 py-1.5">
                      Church
                    </DropdownMenuLabel>
                    <MenuLink
                      to="/settings/profile"
                      icon={Palette}
                      title="Church logo"
                      description="Logo and church identity"
                    />
                    <MenuLink
                      to="/settings/administrators"
                      icon={Users}
                      title="Administrators"
                      description="Who can manage the church"
                    />
                  </div>
                </>
              ) : null}

              <DropdownMenuSeparator className="mx-0" />

              <div className="p-2 pb-2.5">
                <DropdownMenuItem
                  onClick={signOut}
                  className="cursor-pointer gap-2 rounded-md px-2.5 py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
