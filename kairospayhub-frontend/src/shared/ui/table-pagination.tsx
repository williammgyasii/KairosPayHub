import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

interface TablePaginationProps {
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  disabled?: boolean
  className?: string
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export function TablePagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  disabled,
  className,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  return (
    <div className={cn('flex w-full flex-col gap-2 border-t border-border/60 px-3 py-3 sm:px-5', className)}>
      <div className="flex w-full items-center justify-between gap-3">
        <p className="min-w-0 text-xs text-muted-foreground">
          {totalCount === 0 ? 'No results' : `Showing ${from}–${to} of ${totalCount}`}
        </p>
        <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          Rows
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            value={pageSize}
            disabled={disabled}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <nav
        aria-label="Pagination"
        className="flex w-full items-center justify-between gap-3"
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          disabled={disabled || page <= 1}
          aria-label="Previous page"
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-center text-xs text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          disabled={disabled || page >= totalPages}
          aria-label="Next page"
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </nav>
    </div>
  )
}
