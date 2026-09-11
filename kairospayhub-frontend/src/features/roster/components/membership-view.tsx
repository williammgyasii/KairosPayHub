import { useCallback, useEffect, useMemo, useState } from 'react'
import type { OnChangeFn, SortingState, VisibilityState } from '@tanstack/react-table'
import { Link, useNavigate } from 'react-router-dom'
import type {
  StructureMemberListParams,
  StructureMemberListResponse,
  StructureTree,
} from '@/api/structure'
import { buildMembersQuery } from '@/api/structure'
import { useApi } from '@/shared/api'
import { MemberFormSheet, type MemberSheetState } from '@/features/roster/components/member-form-sheet'
import { MemberDeleteModal } from '@/features/roster/components/member-delete-modal'
import { resolveMemberWizardMode } from '@/features/roster/components/member-wizard-steps'
import { MemberTableToolbar } from '@/features/roster/components/member-table-toolbar'
import {
  StructureMemberTable,
  type MemberViewDestination,
} from '@/features/roster/components/structure-member-table'
import {
  applyMemberFilterRules,
  type MemberFilterRule,
} from '@/lib/member-filters'
import {
  MEMBERSHIP_ALWAYS_VISIBLE_COLUMN_IDS,
  defaultMembershipColumnVisibility,
} from '@/features/roster/lib/membership-table-columns'
import { TABLE_PREFERENCE_KEYS } from '@/lib/table-preferences'
import { usePersistedColumnVisibility } from '@/lib/use-persisted-column-visibility'
import { buildMemberRows } from '@/lib/structure-table-rows'
import type { MembershipRosterTab } from '@/lib/join-link-policy'
import { getLayers } from '@/shared/lib/structure-tree'
import { formatApiError } from '@/shared/lib/structure-tree'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { Spinner } from '@/shared/ui/spinner'
import { TablePagination } from '@/shared/ui/table-pagination'

interface MembershipViewProps {
  tree: StructureTree
  error: string | null
  busy: boolean
  submit: (action: () => Promise<void>) => Promise<void>
  wizardOpen?: boolean
  onWizardOpenChange?: (open: boolean) => void
  readOnly?: boolean
  hideAddMemberHint?: boolean
  scopeParentNodeId?: string | null
  currentMemberId?: string | null
  rosterTab?: MembershipRosterTab
  onPendingCountChange?: (count: number) => void
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
  readOnly = false,
  hideAddMemberHint = false,
  scopeParentNodeId = null,
  currentMemberId = null,
  rosterTab = 'all',
  onPendingCountChange,
}: MembershipViewProps) {
  const api = useApi()
  const navigate = useNavigate()
  const [wizardOpenInternal, setWizardOpenInternal] = useState(false)
  const wizardOpen = wizardOpenProp ?? wizardOpenInternal
  const setWizardOpen = onWizardOpenChange ?? setWizardOpenInternal
  const [sheet, setSheet] = useState<MemberSheetState | null>(null)
  const [deleteMember, setDeleteMember] = useState<ReturnType<typeof buildMemberRows>[number] | null>(
    null,
  )
  const [filterRules, setFilterRules] = useState<MemberFilterRule[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
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
  }, [debouncedSearch, pageSize, rosterTab])

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
        parentNodeId: scopeParentNodeId ?? undefined,
        includeDescendants: scopeParentNodeId ? true : undefined,
        rosterStatus: rosterTab === 'pending' ? 'Pending' : undefined,
      })
      const next = await api.get<StructureMemberListResponse>(`/api/structure/members${query}`)
      setList(next)
      onPendingCountChange?.(next.pendingCount ?? 0)
    } catch (err) {
      setListError(formatApiError(err))
      setList(null)
    } finally {
      setListLoading(false)
    }
  }, [api, page, pageSize, sortBy, sortDir, debouncedSearch, scopeParentNodeId, rosterTab, onPendingCountChange])

  useEffect(() => {
    void loadMembers()
  }, [loadMembers])

  const listTree = useMemo(
    (): StructureTree => ({ ...tree, members: list?.items ?? [] }),
    [tree, list?.items],
  )
  const rows = useMemo(() => buildMemberRows(listTree), [listTree])
  const structureLayers = useMemo(() => getLayers(tree), [tree])
  const structureLayerKey = useMemo(
    () => structureLayers.map((layer) => layer.id).join('|'),
    [structureLayers],
  )
  const membershipDefaults = useMemo(
    () => defaultMembershipColumnVisibility(structureLayers),
    [structureLayerKey, structureLayers],
  )
  const [columnVisibility, setColumnVisibility] = usePersistedColumnVisibility(
    TABLE_PREFERENCE_KEYS.membership,
    membershipDefaults,
    { alwaysOn: MEMBERSHIP_ALWAYS_VISIBLE_COLUMN_IDS },
  )
  const handleColumnVisibilityChange: OnChangeFn<VisibilityState> = (updater) => {
    setColumnVisibility(typeof updater === 'function' ? updater(columnVisibility) : updater)
  }

  const filteredRows = useMemo(() => {
    if (filterRules.length === 0) return rows
    return applyMemberFilterRules(rows, filterRules)
  }, [rows, filterRules])

  const totalCount = list?.totalCount ?? 0

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

  const wizardMode = useMemo(
    () => resolveMemberWizardMode(tree, scopeParentNodeId),
    [tree, scopeParentNodeId],
  )

  const tableTitle = useMemo(() => {
    if (rosterTab === 'pending') return 'Pending members'
    if (!scopeParentNodeId) return 'All members'
    switch (wizardMode) {
      case 'cell':
        return 'Members in your cell'
      case 'fellowship':
        return 'Members in your fellowship'
      default:
        return 'Members in your scope'
    }
  }, [scopeParentNodeId, wizardMode, rosterTab])

  const emptyAddHint = hideAddMemberHint
    ? 'No members in this unit yet. Share a join link so people can request to join.'
    : wizardMode === 'cell'
      ? 'No members in this cell yet. Click Add member to register someone.'
      : wizardMode === 'fellowship'
        ? 'No members in this fellowship yet. Click Add member to register someone.'
        : 'No members yet. Click Add member above.'

  const activeSheet: MemberSheetState | null = wizardOpen ? { mode: 'create' } : sheet

  function closeSheet() {
    setSheet(null)
    setWizardOpen(false)
  }

  return (
    <div className="min-w-0 max-w-full space-y-4 overflow-x-clip">
      {(error || listError) && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error ?? listError}
        </p>
      )}

      <StructureMemberTable
        rows={filteredRows}
        structureLayers={structureLayers}
        title={tableTitle}
        extendedColumns
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        totalCount={totalCount}
        emptyMessage={
          rosterTab === 'pending'
            ? 'No pending join requests.'
            : totalCount === 0
            ? readOnly
              ? wizardMode === 'cell'
                ? 'No members in this cell yet.'
                : wizardMode === 'fellowship'
                  ? 'No members in this fellowship yet.'
                  : 'No members in your scope yet.'
              : emptyAddHint
            : 'No members match your filters on this page.'
        }
        showSearch={false}
        hideHeader
        serverSorting
        sorting={sorting}
        onSortingChange={handleSortingChange}
        readOnly={readOnly}
        currentMemberId={currentMemberId}
        toolbar={
          <MemberTableToolbar
            rows={rows}
            structureLayers={structureLayers}
            rules={filterRules}
            onChangeRules={setFilterRules}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            hideSearchField
            searchPlaceholder="Search by name or email…"
            filteredCount={filteredRows.length}
            totalCount={totalCount}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={handleColumnVisibilityChange}
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
        onView={(member, destination: MemberViewDestination = 'profile') => {
          const suffix =
            destination === 'attendance'
              ? '/attendance'
              : destination === 'givings'
                ? '/givings'
                : ''
          navigate(`/roster/members/${member.id}${suffix}`)
        }}
        onEdit={
          readOnly
            ? undefined
            : (member) => navigate(`/roster/members/${member.id}/edit`)
        }
        onDelete={readOnly ? undefined : (member) => setDeleteMember(member)}
        onAccept={
          readOnly
            ? undefined
            : (member) => {
                void submitAndRefresh(async () => {
                  await api.post(`/api/structure/members/${member.id}/accept-join`, {})
                  toast.success(`${member.member} is now a member`)
                })
              }
        }
        onDecline={
          readOnly
            ? undefined
            : (member) => {
                void submitAndRefresh(async () => {
                  await api.post(`/api/structure/members/${member.id}/decline-join`, {})
                  toast.success(`${member.member} was declined`)
                })
              }
        }
      />

      {!readOnly && activeSheet && (
        <MemberFormSheet
          tree={tree}
          unitNodeId={scopeParentNodeId ?? undefined}
          busy={busy}
          submit={submitAndRefresh}
          sheet={activeSheet}
          onClose={closeSheet}
        />
      )}

      {!readOnly && deleteMember && (
        <MemberDeleteModal
          member={deleteMember}
          busy={busy}
          onClose={() => setDeleteMember(null)}
          onConfirm={() => {
            void submitAndRefresh(async () => {
              await api.delete(`/api/structure/members/${deleteMember.id}`)
              setDeleteMember(null)
            })
          }}
        />
      )}
    </div>
  )
}

export function MembershipEmptyState({
  needsRoster,
  pastorOnlyStructure = false,
}: {
  needsRoster: boolean
  pastorOnlyStructure?: boolean
}) {
  return (
    <section className="rounded-xl border border-border/60 bg-muted/10 px-5 py-8 text-center">
      <p className="text-sm font-medium">
        {needsRoster ? 'Set up roster units first' : 'Define your structure first'}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {needsRoster
          ? 'Add PFCCs, fellowships, or cells in Roster before registering members.'
          : pastorOnlyStructure
            ? 'Your pastor needs to define the church structure before members appear here.'
            : 'Save your layer chain on the Structure page, then add roster units.'}
      </p>
      {!pastorOnlyStructure && (
        <Button asChild className="mt-4">
          <Link to={needsRoster ? '/roster' : '/structure'}>
            Go to {needsRoster ? 'Roster' : 'Structure'}
          </Link>
        </Button>
      )}
    </section>
  )
}
