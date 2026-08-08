import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DashboardBreadcrumb = {
  label: string
  to?: string
}

interface DashboardPageHeaderProps {
  title: string
  description?: ReactNode
  breadcrumbs?: DashboardBreadcrumb[]
  titleSize?: 'default' | 'hero'
  actions?: ReactNode
  className?: string
}

export function DashboardPageHeader({
  title,
  description,
  breadcrumbs = [],
  titleSize = 'default',
  actions,
  className,
}: DashboardPageHeaderProps) {
  return (
    <header className={cn('space-y-3', className)}>
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1

            return (
              <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1.5">
                {index > 0 && (
                  <ChevronRight className="size-3 shrink-0 text-muted-foreground/40" aria-hidden />
                )}
                {crumb.to && !isLast ? (
                  <Link
                    to={crumb.to}
                    className="text-xs font-medium text-muted-foreground/70 transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      'text-xs font-medium',
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-3xl space-y-2">
          <h1
            className={cn(
              'font-semibold tracking-tight text-foreground',
              titleSize === 'hero'
                ? 'text-3xl sm:text-4xl lg:text-[2.75rem] lg:leading-tight'
                : 'text-2xl sm:text-3xl',
            )}
          >
            {title}
          </h1>
          {description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>

        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
