import { Columns3 } from 'lucide-react'
import { ColumnToggleSwitch } from '@/shared/ui/column-toggle-switch'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Input } from '@/shared/ui/input'
import { WHO_SHOWED_UP_COLUMN_LABELS, type WhoShowedUpColumnId } from '@/features/attendance/lib/attendance-ui'
import { cn } from '@/shared/lib/utils'

const selectClassName =
  'flex h-9 min-w-[10rem] rounded-md border border-input bg-background px-3 text-sm shadow-sm'

export function AttendanceAllToolbar({
  search,
  setSearch,
  personKind,
  setPersonKind,
  cellFilter,
  setCellFilter,
  columnVisibility,
  toggleColumn,
  parentColumnLabel,
  unitLayerLabel,
  countLabel,
}: {
  search: string
  setSearch: (v: string) => void
  personKind: '' | 'Member' | 'Invitee' | 'FirstTimer'
  setPersonKind: (v: '' | 'Member' | 'Invitee' | 'FirstTimer') => void
  cellFilter: string
  setCellFilter: (v: string) => void
  columnVisibility: Record<WhoShowedUpColumnId, boolean>
  toggleColumn: (id: WhoShowedUpColumnId) => void
  parentColumnLabel: string
  unitLayerLabel: string
  countLabel: string
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <p className="text-sm text-muted-foreground">{countLabel}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone, unit…"
          className="h-9 w-full sm:w-56"
        />
        <select
          value={personKind}
          onChange={(e) =>
            setPersonKind(e.target.value as '' | 'Member' | 'Invitee' | 'FirstTimer')
          }
          className={cn(selectClassName, 'sm:w-40')}
        >
          <option value="">All types</option>
          <option value="Member">Members</option>
          <option value="Invitee">Invitees / guests</option>
          <option value="FirstTimer">First timers</option>
        </select>
        <Input
          value={cellFilter}
          onChange={(e) => setCellFilter(e.target.value)}
          placeholder="Filter by unit"
          className="h-9 w-full sm:w-40"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" variant="outline" className="h-9 gap-1.5">
              <Columns3 className="size-3.5" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Show columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(Object.keys(WHO_SHOWED_UP_COLUMN_LABELS) as WhoShowedUpColumnId[]).map((columnId) => (
              <DropdownMenuItem
                key={columnId}
                disabled={columnId === 'name'}
                className="justify-between gap-3"
                onSelect={(event) => {
                  event.preventDefault()
                  toggleColumn(columnId)
                }}
              >
                {columnId === 'parentUnit'
                  ? parentColumnLabel
                  : columnId === 'unit'
                    ? unitLayerLabel
                    : WHO_SHOWED_UP_COLUMN_LABELS[columnId]}
                <ColumnToggleSwitch on={columnVisibility[columnId]} />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
