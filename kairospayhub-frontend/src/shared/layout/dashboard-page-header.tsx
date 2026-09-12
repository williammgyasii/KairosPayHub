import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

export type DashboardBreadcrumb = {
  label: string
  to?: string
}

interface DashboardPageHeaderProps {
  title: ReactNode
  description?: ReactNode
  breadcrumbs?: DashboardBreadcrumb[]
  titleSize?: 'default' | 'hero'
  actions?: ReactNode
  onBack?: () => void
  className?: string
}

export function DashboardPageHeader({
  title,
  description,
  breadcrumbs = [],
  titleSize = 'default',
  actions,
  onBack,
  className,
}: DashboardPageHeaderProps) {
  return (
    <header className={cn('min-w-0 space-y-3', className)}>
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1.5">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1

            return (
              <span key={`${crumb.label}-${index}`} className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                {index > 0 && (
                  <ChevronRight className="size-3 shrink-0 text-muted-foreground/40" aria-hidden />
                )}
                {crumb.to && !isLast ? (
                  <Link
                    to={crumb.to}
                    className="truncate text-xs font-medium text-muted-foreground/70 transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      'truncate text-xs font-medium',
                      isLast ? 'text-muted-foreground' : 'text-muted-foreground/70',
                    )}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {crumb.label}
                  </span>
                )}
              </span>
            )
          })}
        </nav>
      )}

      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-3xl space-y-2">
          <h1
            className={cn(
              'min-w-0 text-foreground',
              onBack && 'flex items-center gap-1',
              titleSize === 'hero' ? 'text-page-title-hero' : 'text-page-title',
            )}
          >
            {onBack && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="-ml-2 size-9 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={onBack}
                aria-label="Go back"
              >
                <ChevronLeft className="size-5" />
              </Button>
            )}
            <span className="block truncate">{title}</span>
          </h1>
          {description && <p className="text-muted-body break-words">{description}</p>}
        </div>

        {actions && (
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}
