import type { StructureLayer } from '@/api/structure'
import type { StructureSegment } from '@/lib/structure-table-rows'
import { layerBadgeClass, roleBadgeClass } from '@/lib/structure-tree'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function StructureSegmentBadge({
  segment,
  showLayer = false,
  className,
}: {
  segment: StructureSegment
  showLayer?: boolean
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'max-w-[180px] truncate font-medium',
        layerBadgeClass(segment.standardType),
        className,
      )}
      title={segment.nodeName}
    >
      {showLayer && (
        <span className="mr-1 text-[10px] uppercase tracking-wide opacity-70">
          {segment.layerName}
        </span>
      )}
      {segment.nodeName}
    </Badge>
  )
}

export function StructurePathBadges({
  segments,
  showLayer = false,
  className,
}: {
  segments: StructureSegment[]
  showLayer?: boolean
  className?: string
}) {
  if (segments.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {segments.map((segment) => (
        <StructureSegmentBadge
          key={`${segment.layerId}-${segment.nodeName}`}
          segment={segment}
          showLayer={showLayer}
        />
      ))}
    </div>
  )
}

export function RoleBadge({ role, position }: { role: string; position: string }) {
  return (
    <Badge variant="outline" className={cn('font-medium', roleBadgeClass(position))}>
      {role}
    </Badge>
  )
}

export function CountBadge({
  label,
  count,
  className,
}: {
  label: string
  count: number
  className?: string
}) {
  return (
    <Badge variant="secondary" className={cn('tabular-nums font-medium', className)}>
      {count} {label}
    </Badge>
  )
}

export function LayerTabBadge({ layer }: { layer: Pick<StructureLayer, 'displayName' | 'standardType'> }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        layerBadgeClass(layer.standardType),
      )}
    >
      {layer.displayName}
    </span>
  )
}
