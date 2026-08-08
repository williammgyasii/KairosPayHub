import { useCallback, useEffect, useMemo, useState } from 'react'
import type { OnChangeFn, SortingState } from '@tanstack/react-table'
import { Link } from 'react-router-dom'
import type {
  StructureMemberListParams,
  StructureMemberListResponse,
  StructureTree,
} from '@/api/structure'
import { buildMembersQuery } from '@/api/structure'
import { useApi } from '@/api/useApi'
import { MemberCreateWizard } from '@/components/structure/member-create-wizard'
import { MemberDetailSheet } from '@/components/structure/member-detail-sheet'
import { MemberFormSheet, type MemberSheetState } from '@/components/structure/member-form-sheet'
import { MemberTableToolbar } from '@/components/structure/member-table-toolbar'
import { StructureMemberTable } from '@/components/structure/structure-member-table'
import {
  applyMemberFilterRules,
  type MemberFilterField,
  type MemberFilterRule,
} from '@/lib/member-filters'
import { buildMemberRows } from '@/lib/structure-table-rows'
import { getLayers } from '@/lib/structure-tree'
import { formatApiError } from '@/lib/structure-tree'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { TablePagination } from '@/components/ui/table-pagination'

interface MembershipViewProps {
  tree: StructureTree
  error: string | null
  busy: boolean
  submit: (action: () => Promise<void>) => Promise<void>
  wizardOpen?: boolean
  onWizardOpenChange?: (open: boolean) => void
}

function sortFieldFromColumn(columnId: string): StructureMemberListParams['sortBy'] {
  switch (columnId) {
    case 'member':
      return 'name'
    case 'email':
      return 'email'
    case 'phone':
      return 'phone'
    case 'age':
      return 'age'
    case 'role':
      return 'position'
    default:
      return 'name'
  }
}

function sortingToParams(sorting: SortingState): Pick<StructureMemberListParams, 'sortBy' | 'sortDir'> {
  const active = sorting[0]
  if (!active) return { sortBy: 'name', sortDir: 'asc' }
  return {
    sortBy: sortFieldFromColumn(active.id),
    sortDir: active.desc ? 'desc' : 'asc',
  }
}

function paramsToSorting(sortBy: string, sortDir: 'asc' | 'desc'): SortingState {
  const columnId =
    sortBy === 'name'
      ? 'member'
      : sortBy === 'position'
        ? 'role'
        : sortBy
  return [{ id: columnId, desc: sortDir === 'desc' }]
}

export function MembershipView({
  tree,
  error,
  busy,
  submit,
  wizardOpen: wizardOpenProp,
  onWizardOpenChange,
}: MembershipViewProps) {
  const api = useApi()
  const [wizardOpenInternal, setWizardOpenInternal] = useState(false)
  const wizardOpen = wizardOpenProp ?? wizardOpenInternal
  const setWizardOpen = onWizardOpenChange ?? setWizardOpenInternal
  const [sheet, setSheet] = useState<MemberSheetState | null>(null)
  const [detailMember, setDetailMember] = useState<ReturnType<typeof buildMemberRows>[number] | null>(
    null,
  )
  const [filterRules, setFilterRules] = useState<MemberFilterRule[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchField, setSearchField] = useState<MemberFilterField | 'all'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [sortBy, setSortBy] = useState<StructureMemberListParams['sortBy']>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [list, setList] = useState<StructureMemberListResponse | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [listLoading, setListLoading] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, pageSize])

  const loadMembers = useCallback(async () => {
    setListLoading(true)
    setListError(null)
    try {
      const query = buildMembersQuery({
        page,
        pageSize,
        sortBy,
        sortDir,
        search: debouncedSearch || undefined,
      })
      setList(await api.get<StructureMemberListResponse>(`/api/structure/members${query}`))
    } catch (err) {
      setListError(formatApiError(err))
      setList(null)
    } finally {
      setListLoading(false)
    }
  }, [api, page, pageSize, sortBy, sortDir, debouncedSearch])

  useEffect(() => {
    void loadMembers()
  }, [loadMembers])

  const listTree = useMemo(
    (): StructureTree => ({ ...tree, members: list?.items ?? [] }),
    [tree, list?.items],
  )
  const rows = useMemo(() => buildMemberRows(listTree), [listTree])
  const structureLayers = getLayers(tree)
  const filteredRows = useMemo(() => {
    if (filterRules.length === 0) return rows
    return applyMemberFilterRules(rows, filterRules)
  }, [rows, filterRules])

  const sorting = useMemo(() => paramsToSorting(sortBy ?? 'name', sortDir), [sortBy, sortDir])

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater
    const params = sortingToParams(next)
    setSortBy(params.sortBy ?? 'name')
    setSortDir(params.sortDir ?? 'asc')
    setPage(1)
  }

  async function submitAndRefresh(action: () => Promise<void>) {
    await submit(action)
    await loadMembers()
  }

  const totalCount = list?.totalCount ?? 0

  return (
    <div className="min-w-0 space-y-4">
      {(error || listError) && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error ?? listError}
        </p>
      )}

      <StructureMemberTable
        rows={filteredRows}
        structureLayers={structureLayers}
        title="All members"
        extendedColumns
        totalCount={totalCount}
        emptyMessage={
          totalCount === 0
            ? 'No members yet. Click Add member above.'
            : 'No members match your filters on this page.'
        }
        showSearch={false}
        hideHeader
        serverSorting
        sorting={sorting}
        onSortingChange={handleSortingChange}
        toolbar={
          <MemberTableToolbar
            rows={rows}
            structureLayers={structureLayers}
            rules={filterRules}
            onChangeRules={setFilterRules}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            searchField={searchField}
            onSearchFieldChange={setSearchField}
            filteredCount={filteredRows.length}
            totalCount={totalCount}
          />
        }
        footer={
          listLoading ? (
            <div className="border-t border-border/60 px-5 py-4">
              <Spinner label="Loading members…" />
            </div>
          ) : (
            <TablePagination
              page={list?.page ?? page}
              pageSize={list?.pageSize ?? pageSize}
              totalCount={totalCount}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )
        }
        onView={(member) => setDetailMember(member)}
        onEdit={(member) => setSheet({ mode: 'edit', member })}
      />

      {wizardOpen && (
        <MemberCreateWizard
          tree={tree}
          busy={busy}
          submit={submitAndRefresh}
          onClose={() => setWizardOpen(false)}
        />
      )}

      {sheet && (
        <MemberFormSheet
          tree={tree}
          busy={busy}
          submit={submitAndRefresh}
          sheet={sheet}
          onClose={() => setSheet(null)}
        />
      )}

      {detailMember && (
        <MemberDetailSheet
          member={detailMember}
          tree={listTree}
          open
          onOpenChange={(open) => !open && setDetailMember(null)}
          onEdit={(member) => setSheet({ mode: 'edit', member })}
        />
      )}
    </div>
  )
}

export function MembershipEmptyState({ needsRoster }: { needsRoster: boolean }) {
  return (
    <section className="rounded-xl border border-border/60 bg-muted/10 px-5 py-8 text-center">
      <p className="text-sm font-medium">
        {needsRoster ? 'Set up roster units first' : 'Define your structure first'}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {needsRoster
          ? 'Add PFCCs, fellowships, or cells in Roster before registering members.'
          : 'Save your layer chain on the Structure page, then add roster units.'}
      </p>
      <Button asChild className="mt-4">
        <Link to={needsRoster ? '/roster' : '/structure'}>
          Go to {needsRoster ? 'Roster' : 'Structure'}
        </Link>
      </Button>
    </section>
  )
}
