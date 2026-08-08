import { useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Briefcase,
  ChevronDown,
  Filter,
  GitBranch,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  User,
  X,
} from 'lucide-react'
import type { StructureLayer } from '@/api/structure'
import { MEMBER_OCCUPATION_OPTIONS, MEMBER_POSITION_OPTIONS } from '@/api/structure'
import {
  buildMemberFilterFields,
  createMemberFilterRule,
  fieldDefFor,
  getActiveFilterRules,
  layerValueOptions,
  operatorLabel,
  operatorsForField,
  textValueSuggestions,
  type MemberFilterField,
  type MemberFilterFieldDef,
  type MemberFilterRule,
} from '@/lib/member-filters'
import type { StructureMemberRow } from '@/lib/structure-table-rows'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const FIELD_ICONS: Partial<Record<string, LucideIcon>> = {
  name: User,
  email: Mail,
  phone: Phone,
  residence: MapPin,
  work: Briefcase,
  occupation: Briefcase,
  role: User,
  age: User,
}

interface MemberTableToolbarProps {
  rows: StructureMemberRow[]
  structureLayers: Pick<StructureLayer, 'id' | 'displayName' | 'standardType'>[]
  rules: MemberFilterRule[]
  onChangeRules: (rules: MemberFilterRule[]) => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  searchField: MemberFilterField | 'all'
  onSearchFieldChange: (field: MemberFilterField | 'all') => void
  filteredCount: number
  totalCount: number
}

export function MemberTableToolbar({
  rows,
  structureLayers,
  rules,
  onChangeRules,
  searchQuery,
  onSearchQueryChange,
  searchField,
  onSearchFieldChange,
  filteredCount,
  totalCount,
}: MemberTableToolbarProps) {
  const fields = useMemo(() => buildMemberFilterFields(structureLayers), [structureLayers])
  const activeCount = getActiveFilterRules(rules).length
  const [filtersOpen, setFiltersOpen] = useState(activeCount > 0 || rules.length > 0)

  function addRule() {
    onChangeRules([...rules, createMemberFilterRule()])
    setFiltersOpen(true)
  }

  function updateRule(id: string, patch: Partial<MemberFilterRule>) {
    onChangeRules(rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)))
  }

  function removeRule(id: string) {
    const next = rules.filter((rule) => rule.id !== id)
    onChangeRules(next)
    if (next.length === 0) setFiltersOpen(false)
  }

  function clearAllFilters() {
    onChangeRules([])
    setFiltersOpen(false)
  }

  const searchFieldLabel =
    searchField === 'all'
      ? 'All fields'
      : (fieldDefFor(fields, searchField)?.label ?? 'Field')

  return (
    <div className="min-w-0 border-b border-border/60 bg-background">
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 justify-between gap-2 sm:w-36"
                >
                  {searchFieldLabel}
                  <ChevronDown className="size-3.5 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-52 p-1">
                <ScopeOption
                  label="All fields"
                  active={searchField === 'all'}
                  onClick={() => onSearchFieldChange('all')}
                />
                {fields.map((field) => (
                  <ScopeOption
                    key={field.field}
                    label={field.label}
                    active={searchField === field.field}
                    onClick={() => onSearchFieldChange(field.field)}
                  />
                ))}
              </PopoverContent>
            </Popover>

            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Search visible columns…"
                className="h-9 pl-9"
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant={filtersOpen ? 'secondary' : 'outline'}
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => {
                if (filtersOpen && rules.length === 0) {
                  addRule()
                  return
                }
                setFiltersOpen((open) => !open)
              }}
            >
              <Filter className="size-3.5" />
              Filters
              {activeCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  {activeCount}
                </span>
              )}
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground">
              {filteredCount} / {totalCount}
            </span>
          </div>
        </div>

        {filtersOpen && (
          <div className="relative rounded-lg border border-border/70 bg-muted/20 p-3 shadow-sm">
            {rules.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 size-7 text-muted-foreground"
                aria-label="Clear all filters"
                onClick={clearAllFilters}
              >
                <X className="size-3.5" />
              </Button>
            )}

            <div className="space-y-2 pr-8">
              {rules.map((rule, index) => (
                <FilterRuleRow
                  key={rule.id}
                  rule={rule}
                  index={index}
                  rows={rows}
                  fields={fields}
                  onChange={(patch) => updateRule(rule.id, patch)}
                  onRemove={() => removeRule(rule.id)}
                />
              ))}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={addRule}
              >
                <Plus className="size-3.5" />
                Add filter
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ScopeOption({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent',
        active && 'bg-accent font-medium',
      )}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function FilterRuleRow({
  rule,
  index,
  rows,
  fields,
  onChange,
  onRemove,
}: {
  rule: MemberFilterRule
  index: number
  rows: StructureMemberRow[]
  fields: MemberFilterFieldDef[]
  onChange: (patch: Partial<MemberFilterRule>) => void
  onRemove: () => void
}) {
  const def = rule.field ? fieldDefFor(fields, rule.field) : undefined
  const operators = operatorsForField(rule.field)
  const needsValue = rule.operator !== 'is_empty' && rule.operator !== 'is_not_empty'
  const layerId = rule.field?.startsWith('layer:') ? rule.field.slice('layer:'.length) : null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={cn(
          'inline-flex h-8 items-center rounded-md px-2.5 text-xs font-semibold uppercase tracking-wide',
          index === 0
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {index === 0 ? 'Where' : 'And'}
      </span>

      <FieldPicker fields={fields} value={rule.field} onChange={(field) => onChange({ field })} />

      {rule.field && (
        <>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={rule.operator}
            onChange={(e) =>
              onChange({ operator: e.target.value as MemberFilterRule['operator'] })
            }
          >
            {operators.map((operator) => (
              <option key={operator} value={operator}>
                {operatorLabel(operator)}
              </option>
            ))}
          </select>

          {needsValue &&
            (rule.field === 'occupation' ? (
              <select
                className="h-8 min-w-[9rem] flex-1 rounded-md border border-input bg-background px-2 text-sm"
                value={rule.value}
                onChange={(e) => onChange({ value: e.target.value })}
              >
                <option value="">Select value…</option>
                {MEMBER_OCCUPATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : rule.field === 'role' ? (
              <select
                className="h-8 min-w-[9rem] flex-1 rounded-md border border-input bg-background px-2 text-sm"
                value={rule.value}
                onChange={(e) => onChange({ value: e.target.value })}
              >
                <option value="">Select value…</option>
                {MEMBER_POSITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : layerId ? (
              <select
                className="h-8 min-w-[9rem] flex-1 rounded-md border border-input bg-background px-2 text-sm"
                value={rule.value}
                onChange={(e) => onChange({ value: e.target.value })}
              >
                <option value="">Select unit…</option>
                {layerValueOptions(rows, layerId).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={rule.value}
                onChange={(e) => onChange({ value: e.target.value })}
                placeholder={`${def?.label ?? 'Value'}…`}
                className="h-8 min-w-[9rem] flex-1"
                list={`filter-${rule.id}`}
              />
            ))}

          {needsValue && def?.kind === 'text' && rule.field && (
            <datalist id={`filter-${rule.id}`}>
              {textValueSuggestions(rows, rule.field).map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
          )}
        </>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-muted-foreground"
        aria-label="Remove filter"
        onClick={onRemove}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  )
}

function FieldPicker({
  fields,
  value,
  onChange,
}: {
  fields: MemberFilterFieldDef[]
  value: MemberFilterField | null
  onChange: (field: MemberFilterField) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = value ? fieldDefFor(fields, value) : undefined

  const filtered = fields.filter((field) =>
    field.label.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const Icon = value ? (FIELD_ICONS[value] ?? GitBranch) : GitBranch

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 min-w-[10rem] justify-between gap-2 font-normal"
        >
          <span className="flex items-center gap-2 truncate">
            <Icon className="size-3.5 shrink-0 opacity-70" />
            {selected?.label ?? 'Select field…'}
          </span>
          <ChevronDown className="size-3.5 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search fields…"
          className="mb-2 h-8"
        />
        <div className="max-h-56 space-y-0.5 overflow-y-auto">
          {filtered.map((field) => {
            const FieldIcon = FIELD_ICONS[field.field] ?? GitBranch
            return (
              <button
                key={field.field}
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent',
                  value === field.field && 'bg-accent font-medium',
                )}
                onClick={() => {
                  onChange(field.field)
                  setOpen(false)
                  setQuery('')
                }}
              >
                <FieldIcon className="size-3.5 shrink-0 opacity-70" />
                {field.label}
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">No fields found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
