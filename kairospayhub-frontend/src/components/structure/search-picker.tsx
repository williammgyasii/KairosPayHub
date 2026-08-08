import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type SearchPickerOption = {
  id: string
  label: string
  hint?: string
}

interface SearchPickerProps {
  options: SearchPickerOption[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  emptyMessage?: string
  required?: boolean
}

export function SearchPicker({
  options,
  value,
  onChange,
  placeholder = 'Search…',
  emptyMessage = 'No matches found.',
  required = false,
}: SearchPickerProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        option.hint?.toLowerCase().includes(q),
    )
  }, [options, query])

  const selected = options.find((option) => option.id === value)

  return (
    <div className="space-y-2">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="h-9"
      />

      {selected && (
        <p className="text-xs text-muted-foreground">
          Selected: <span className="font-medium text-foreground">{selected.label}</span>
          {selected.hint ? ` · ${selected.hint}` : ''}
        </p>
      )}

      <div
        className="max-h-44 overflow-y-auto rounded-lg border border-border/60 bg-muted/10"
        role="listbox"
        aria-required={required}
      >
        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          filtered.map((option) => {
            const active = option.id === value
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={active}
                className={cn(
                  'flex w-full items-start gap-2 border-b border-border/40 px-3 py-2.5 text-left text-sm last:border-0 hover:bg-accent/60',
                  active && 'bg-primary/10',
                )}
                onClick={() => onChange(option.id)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{option.label}</span>
                  {option.hint && (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {option.hint}
                    </span>
                  )}
                </span>
                {active && <Check className="mt-0.5 size-4 shrink-0 text-primary" />}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
