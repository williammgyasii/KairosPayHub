import { useCallback, useEffect, useMemo, useState, Fragment } from 'react'
import { ChevronRight } from 'lucide-react'
import type { ApiClient } from '@/api/client'
import type { StructureMemberListResponse, StructureTree } from '@/api/structure'
import { buildMembersQuery } from '@/api/structure'
import { MemberTableToolbar } from '@/components/structure/member-table-toolbar'
import { StructureSegmentBadge } from '@/components/structure/structure-badges'
import {
  applyMemberFilterRules,
  applyMemberSearch,
  type MemberFilterRule,
} from '@/lib/member-filters'
import { buildMemberRows, type StructureSegment } from '@/lib/structure-table-rows'
import {
  filterTreeToSubtree,
  layersBelowScopeRoot,
  nodeById,
} from '@/lib/structure-tree'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

interface GivingMemberPickerProps {
  api: ApiClient
  tree: StructureTree | null
  scopeNodeId?: string | null
  excludeMemberIds?: string[]
  selectedMemberId?: string | null
  actionLabel?: string
  compact?: boolean
  className?: string
  disabled?: boolean
  onSelect: (member: { id: string; name: string }) => void
}

export function GivingMemberPicker({
  api,
  tree,
  scopeNodeId,
  excludeMemberIds = [],
  selectedMemberId = null,
  actionLabel = 'Add',
  compact = false,
  className,
  disabled,
  onSelect,
}: GivingMemberPickerProps) {
  const [filterRules, setFilterRules] = useState<MemberFilterRule[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [list, setList] = useState<StructureMemberListResponse | null>(null)
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  const scopedTree = useMemo(() => {
    if (!tree) return null
    if (!scopeNodeId) return tree
    return filterTreeToSubtree(tree, scopeNodeId)
  }, [tree, scopeNodeId])

  const filterStructureLayers = useMemo(() => {
    if (!scopedTree) return []
    return layersBelowScopeRoot(scopedTree, scopeNodeId)
  }, [scopedTree, scopeNodeId])

  const loadMembers = useCallback(async () => {
    setListLoading(true)
    setListError(null)
    try {
      const query = buildMembersQuery({
        page: 1,
        pageSize: 200,
        sortBy: 'name',
        sortDir: 'asc',
        parentNodeId: scopeNodeId ?? undefined,
        includeDescendants: scopeNodeId ? true : undefined,
      })
      setList(await api.get<StructureMemberListResponse>(`/api/structure/members${query}`))
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Could not load members')
      setList(null)
    } finally {
      setListLoading(false)
    }
  }, [api, scopeNodeId])

  useEffect(() => {
    void loadMembers()
  }, [loadMembers])

  const listTree = useMemo((): StructureTree | null => {
    if (!scopedTree) return null
    return { ...scopedTree, members: list?.items ?? [] }
  }, [scopedTree, list?.items])

  const rows = useMemo(
    () => (listTree ? buildMemberRows(listTree) : []),
    [listTree],
  )

  const filteredRows = useMemo(() => {
    let result = applyMemberFilterRules(rows, filterRules)
    result = applyMemberSearch(result, searchQuery, 'name')
    return result.filter((row) => !excludeMemberIds.includes(row.id))
  }, [rows, filterRules, searchQuery, excludeMemberIds])

  const scopeLabel = useMemo(() => {
    if (!scopeNodeId || !tree) return 'your church'
    return nodeById(tree, scopeNodeId)?.name ?? 'your scope'
  }, [scopeNodeId, tree])

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2 text-xs text-muted-foreground">
        <span>Search by name or filter by fellowship, cell, and other structure units.</span>
        <span className="shrink-0 font-medium">Scope: {scopeLabel}</span>
      </div>

      <MemberTableToolbar
        rows={rows}
        structureLayers={filterStructureLayers}
        rules={filterRules}
        onChangeRules={setFilterRules}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchField="name"
        onSearchFieldChange={() => {}}
        filteredCount={filteredRows.length}
        totalCount={rows.length}
        compact={compact}
        structureOnly
      />

      {listError && (
        <p className="px-3 text-sm text-destructive">{listError}</p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-border/60">
        {listLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            Loading members…
          </div>
        ) : filteredRows.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            No members match your search or filters in this scope.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {filteredRows.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/20"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.member}</p>
                  <MemberStructureChips segments={row.structure} />
                </div>
                <Button
                  type="button"
                  variant={selectedMemberId === row.id ? 'default' : 'outline'}
                  size="sm"
                  className="shrink-0"
                  disabled={disabled}
                  onClick={() => onSelect({ id: row.id, name: row.member })}
                >
                  {selectedMemberId === row.id ? 'Selected' : actionLabel}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function MemberStructureChips({ segments }: { segments: StructureSegment[] }) {
  const visible = segments.filter((segment) => segment.standardType !== 'PFCC')

  if (visible.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  return (
    <div className="mt-1 flex min-w-0 items-center gap-0.5 overflow-hidden">
      {visible.map((segment, index) => (
        <Fragment key={`${segment.layerId}-${segment.nodeName}`}>
          {index > 0 && (
            <ChevronRight className="size-3 shrink-0 text-muted-foreground/45" aria-hidden />
          )}
          <StructureSegmentBadge
            segment={segment}
            className="w-fit max-w-[4.75rem] shrink truncate px-1.5 py-0 text-[10px]"
          />
        </Fragment>
      ))}
    </div>
  )
}
