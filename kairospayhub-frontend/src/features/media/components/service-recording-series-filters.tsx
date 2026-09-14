import type { ReactNode } from 'react'
import type { ServiceRecordingSeries } from '@/features/media/api'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

type ServiceRecordingSeriesFiltersProps = {
  series: ServiceRecordingSeries[]
  selectedSeriesId: string | null
  onChange: (seriesId: string | null) => void
}

export function ServiceRecordingSeriesFilters({
  series,
  selectedSeriesId,
  onChange,
}: ServiceRecordingSeriesFiltersProps) {
  if (series.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      <FilterChip active={selectedSeriesId === null} onClick={() => onChange(null)}>
        All series
      </FilterChip>
      {series.map((item) => (
        <FilterChip
          key={item.id}
          active={selectedSeriesId === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.name}
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
