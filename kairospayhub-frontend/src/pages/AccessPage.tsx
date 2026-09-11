import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { useDispatch } from 'react-redux'
import { useApi } from '@/api/core'
import type { AccessChange, AccessGrid, AccessRow } from '@/api/access'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { Button } from '@/components/ui/button'
import { invalidateMeTags } from '@/store/meApi'
import { groupAccessColumns, orderAccessCells } from '@/lib/access-ability-groups'
import { formatApiError } from '@/lib/structure-tree'
import { cn } from '@/lib/utils'

export function AccessPage() {
  const api = useApi()
  const dispatch = useDispatch()
  const [grid, setGrid] = useState<AccessGrid | null>(null)
  const [draft, setDraft] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await api.get<AccessGrid>('/api/access')
      setGrid(next)
      const nextDraft: Record<string, boolean> = {}
      for (const row of next.rows) {
        for (const cell of row.cells) {
          nextDraft[cellKey(row.subjectKind, row.subjectId, cell.ability)] = cell.effectiveOn
        }
      }
      setDraft(nextDraft)
    } catch (err) {
      setError(formatApiError(err) || 'Could not load access')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    if (!grid) return
    const changes: AccessChange[] = []
    for (const row of grid.rows) {
      for (const cell of row.cells) {
        const key = cellKey(row.subjectKind, row.subjectId, cell.ability)
        const enabled = draft[key] ?? cell.effectiveOn
        if (enabled !== cell.effectiveOn) {
          changes.push({
            subjectKind: row.subjectKind,
            subjectId: row.subjectId,
            ability: cell.ability,
            enabled,
          })
        }
      }
    }
    setSaving(true)
    setError(null)
    try {
      const next = await api.put<AccessGrid>('/api/access', { changes })
      setGrid(next)
      const nextDraft: Record<string, boolean> = {}
      for (const row of next.rows) {
        for (const cell of row.cells) {
          nextDraft[cellKey(row.subjectKind, row.subjectId, cell.ability)] = cell.effectiveOn
        }
      }
      setDraft(nextDraft)
      dispatch(invalidateMeTags())
    } catch (err) {
      setError(formatApiError(err) || 'Could not save access')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Access' },
        ]}
        title="Access"
        description="Choose a level, then turn on what every unit on that level can do. You can only turn things down from the default."
        actions={
          <Button type="button" onClick={() => void save()} disabled={saving || !grid}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        }
      />

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading access…</p>}

      {grid && <AccessEditor grid={grid} draft={draft} saving={saving} onToggle={setDraft} />}
    </div>
  )
}

function AccessEditor({
  grid,
  draft,
  saving,
  onToggle,
}: {
  grid: AccessGrid
  draft: Record<string, boolean>
  saving: boolean
  onToggle: Dispatch<SetStateAction<Record<string, boolean>>>
}) {
  const groups = groupAccessColumns(grid.abilities)
  const [selectedKey, setSelectedKey] = useState(() => rowKey(grid.rows[0]))
  const selected = useMemo(
    () => grid.rows.find((row) => rowKey(row) === selectedKey) ?? grid.rows[0],
    [grid.rows, selectedKey],
  )
  const layers = grid.rows.filter((row) => row.subjectKind === 'layer')
  const people = grid.rows.filter((row) => row.subjectKind !== 'layer')

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/10 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <nav aria-label="Access subjects" className="space-y-4 border-b border-border/60 p-3 lg:border-b-0 lg:border-r">
        <SubjectNavGroup
          title="Levels"
          rows={layers}
          selectedKey={rowKey(selected)}
          onSelect={setSelectedKey}
        />
        {people.length > 0 ? (
          <SubjectNavGroup
            title="People"
            rows={people}
            selectedKey={rowKey(selected)}
            onSelect={setSelectedKey}
          />
        ) : null}
      </nav>

      <div className="bg-background p-4 sm:p-6">
        <header className="mb-6">
          <h2 className="text-lg font-semibold tracking-tight">{selected.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {subjectHint(selected.subjectKind, selected.label)}
          </p>
        </header>
        <div className="space-y-6">
          {groups.map((group) => {
            const cells = orderAccessCells(
              selected.cells,
              group.columns.map((column) => column.id),
            )
            if (cells.length === 0) return null
            return (
              <section key={group.id} className="space-y-3">
                <h3 className="text-eyebrow">{group.label}</h3>
                <ul className="space-y-2">
                  {cells.map((cell) => {
                    const column = group.columns.find((item) => item.id === cell.ability)
                    const key = cellKey(selected.subjectKind, selected.subjectId, cell.ability)
                    const on = draft[key] ?? cell.effectiveOn
                    return (
                      <li key={cell.ability}>
                        <AccessAbilityRow
                          title={column?.label ?? cell.ability}
                          switchLabel={`${selected.label} ${cell.ability}`}
                          on={on}
                          locked={cell.locked}
                          disabled={saving}
                          onToggle={(next) => onToggle((current) => ({ ...current, [key]: next }))}
                        />
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SubjectNavGroup({
  title,
  rows,
  selectedKey,
  onSelect,
}: {
  title: string
  rows: AccessRow[]
  selectedKey: string
  onSelect: (key: string) => void
}) {
  if (rows.length === 0) return null
  return (
    <div className="space-y-1">
      <p className="px-2 text-eyebrow">{title}</p>
      {rows.map((row) => {
        const key = rowKey(row)
        const active = key === selectedKey
        return (
          <button
            key={key}
            type="button"
            aria-current={active ? 'true' : undefined}
            onClick={() => onSelect(key)}
            className={cn(
              'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
              active
                ? 'bg-background font-medium text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
            )}
          >
            {row.label}
          </button>
        )
      })}
    </div>
  )
}

function AccessAbilityRow({
  title,
  switchLabel,
  on,
  locked,
  disabled,
  onToggle,
}: {
  title: string
  switchLabel: string
  on: boolean
  locked: boolean
  disabled: boolean
  onToggle: (next: boolean) => void
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-xl border px-4 py-3',
        locked ? 'border-border/50 bg-muted/20' : 'border-border/60 bg-card',
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {locked ? (
          <p className="mt-0.5 text-xs text-muted-foreground">Locked off for this level</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <span
          className={cn(
            'text-xs font-medium',
            locked ? 'text-muted-foreground' : on ? 'text-emerald-600' : 'text-muted-foreground',
          )}
        >
          {locked ? 'Locked' : on ? 'On' : 'Off'}
        </span>
        <AccessToggle
          checked={on}
          disabled={locked || disabled}
          label={switchLabel}
          onCheckedChange={onToggle}
        />
      </div>
    </div>
  )
}

function AccessToggle({
  checked,
  disabled,
  label,
  onCheckedChange,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  onCheckedChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        disabled && 'cursor-not-allowed opacity-60',
        checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600',
      )}
    >
      <span
        className={cn(
          'pointer-events-none absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

function subjectHint(kind: string, label: string) {
  if (kind === 'adminProfile') return 'Applies to every administrator. Named people below can only be tighter.'
  if (kind === 'adminUser') return `Further limit ${label}. Cannot turn on something Administrators do not have.`
  return `Every ${label.toLowerCase()} gets the same access.`
}

function rowKey(row: AccessRow) {
  return `${row.subjectKind}:${row.subjectId ?? ''}`
}

function cellKey(kind: string, subjectId: string | null, ability: string) {
  return `${kind}:${subjectId ?? ''}:${ability}`
}
