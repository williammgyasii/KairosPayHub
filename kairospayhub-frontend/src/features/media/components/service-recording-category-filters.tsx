import type { ReactNode } from 'react'
import type { ServiceRecordingCategory } from '@/features/media/api'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

type ServiceRecordingCategoryFiltersProps = {
  categories: ServiceRecordingCategory[]
  selectedCategoryId: string | null
  onChange: (categoryId: string | null) => void
}

export function ServiceRecordingCategoryFilters({
  categories,
  selectedCategoryId,
  onChange,
}: ServiceRecordingCategoryFiltersProps) {
  if (categories.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      <FilterChip
        active={selectedCategoryId === null}
        onClick={() => onChange(null)}
      >
        All
      </FilterChip>
      {categories.map((category) => (
        <FilterChip
          key={category.id}
          active={selectedCategoryId === category.id}
          onClick={() => onChange(category.id)}
        >
          {category.name}
        </FilterChip>
      ))}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? 'default' : 'outline'}
      className={cn('rounded-full', !active && 'bg-background')}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}
