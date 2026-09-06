import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronsUpDown, Search, X } from 'lucide-react'
import type { ApiClient } from '@/api/core'
import type { StructureMemberListResponse } from '@/api/structure'
import { buildMembersQuery } from '@/api/structure'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { InlineSpinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

export type MemberOption = {
  id: string
  name: string
}

interface MemberSearchSelectProps {
  api: ApiClient
  scopeNodeId?: string | null
  excludeIds?: string[]
  disabled?: boolean
  placeholder?: string
  onSelect: (member: MemberOption) => void
}

export function MemberSearchSelect({
  api,
  scopeNodeId,
  excludeIds = [],
  disabled,
  placeholder = 'Search members…',
  onSelect,
}: MemberSearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [members, setMembers] = useState<MemberOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadMembers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = buildMembersQuery({
        page: 1,
        pageSize: 200,
        sortBy: 'name',
        sortDir: 'asc',
        parentNodeId: scopeNodeId ?? undefined,
        includeDescendants: scopeNodeId ? true : undefined,
      })
      const list = await api.get<StructureMemberListResponse>(`/api/structure/members${qs}`)
      setMembers(
        (list.items ?? []).map((m) => ({
          id: m.id,
          name: m.name,
        })),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load members')
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [api, scopeNodeId])

  useEffect(() => {
    void loadMembers()
  }, [loadMembers])

  const exclude = useMemo(() => new Set(excludeIds), [excludeIds])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return members
      .filter((m) => !exclude.has(m.id))
      .filter((m) => !q || m.name.toLowerCase().includes(q))
  }, [members, exclude, query])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="h-10 w-full justify-between font-normal"
        >
          <span className="truncate text-muted-foreground">{placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a name…"
            className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            autoFocus
          />
          {query && (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setQuery('')}
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="max-h-56 overflow-y-auto py-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <InlineSpinner className="size-4" />
              Loading…
            </div>
          ) : error ? (
            <p className="px-3 py-6 text-center text-sm text-destructive">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No members found.
            </p>
          ) : (
            filtered.map((member) => (
              <button
                key={member.id}
                type="button"
                className={cn(
                  'flex w-full px-3 py-2 text-left text-sm hover:bg-accent/60',
                )}
                onClick={() => {
                  onSelect(member)
                  setOpen(false)
                  setQuery('')
                }}
              >
                {member.name}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
