import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Palette,
  Shield,
  User,
  Users,
} from 'lucide-react'
import { canManageChurch, displayName, type Me } from '@/api/auth'
import { useAuth } from '@/auth/AuthContext'
import { ChurchBrand } from '@/components/layout/church-brand'
import { NotificationsBell } from '@/components/layout/notifications-bell'
import { RoleBadge } from '@/components/layout/role-badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSidebar } from '@/components/layout/sidebar-context'
import { cn, initials } from '@/lib/utils'

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
          <span className="block text-sm font-medium leading-tight">{title}</span>
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{description}</span>
        </span>
      </Link>
    </DropdownMenuItem>
  )
}

export function DashboardTopbar({ me }: DashboardTopbarProps) {
  const { email, signOut } = useAuth()
  const { toggleMobile } = useSidebar()
  const name = displayName(me, email)
  const churchManager = canManageChurch(me.role)

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border/50 bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 text-muted-foreground lg:hidden"
        onClick={toggleMobile}
        aria-label="Open menu"
      >
        <Menu className="h-[18px] w-[18px]" />
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-3 lg:hidden">
        <ChurchBrand
          churchName={me.churchName}
          logoUrl={me.churchLogoUrl}
          collapsed
          className="shrink-0"
        />
        <p className="truncate text-sm font-semibold text-foreground">
          {me.churchName?.trim() || 'Your church'}
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <RoleBadge me={me} className="hidden md:flex" />
        <RoleBadge me={me} compact className="md:hidden" />

        <NotificationsBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'h-9 shrink-0 gap-2 rounded-full border border-transparent px-1.5 hover:border-border/60 hover:bg-muted/40',
                'md:rounded-full md:pl-1 md:pr-2.5',
              )}
            >
              <Avatar className="h-7 w-7 ring-1 ring-border/60">
                <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                  {initials(me.name, me.email)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[8rem] truncate text-sm font-medium text-foreground md:inline">
                {name}
              </span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 overflow-hidden rounded-xl p-0 shadow-lg">
            <div className="border-b border-border/60 bg-muted/20 px-4 py-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-11 shrink-0 ring-2 ring-background">
                  <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                    {initials(me.name, me.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{name}</p>
                  {email ? (
                    <p className="truncate text-xs text-muted-foreground">{email}</p>
                  ) : null}
                  <RoleBadge me={me} compact className="mt-2" />
                </div>
              </div>
            </div>

            <div className="p-2">
              <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Your account
              </DropdownMenuLabel>
              <MenuLink
                to="/account"
                icon={User}
                title="Profile"
                description="Name, email, and role"
              />
              <MenuLink
                to="/account#notifications"
                icon={Bell}
                title="Notifications"
                description="Alerts and delivery preferences"
              />
              <MenuLink
                to="/account#security"
                icon={Shield}
                title="Security"
                description="Password and sign-in"
              />
            </div>

            {churchManager ? (
              <>
                <DropdownMenuSeparator className="mx-0" />
                <div className="p-2">
                  <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Church
                  </DropdownMenuLabel>
                  <MenuLink
                    to="/settings"
                    icon={Palette}
                    title="Branding"
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
    </header>
  )
}
