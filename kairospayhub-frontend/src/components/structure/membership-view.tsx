import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { StructureTree } from '@/api/structure'
import { MemberCreateWizard } from '@/components/structure/member-create-wizard'
import { MemberDetailSheet } from '@/components/structure/member-detail-sheet'
import { MemberFormSheet, type MemberSheetState } from '@/components/structure/member-form-sheet'
import { MemberTableToolbar } from '@/components/structure/member-table-toolbar'
import { StructureMemberTable } from '@/components/structure/structure-member-table'
import {
  applyMemberFilterRules,
  applyMemberSearch,
  type MemberFilterField,
  type MemberFilterRule,
} from '@/lib/member-filters'
import { buildMemberRows } from '@/lib/structure-table-rows'
import { getLayers } from '@/lib/structure-tree'
import { Button } from '@/components/ui/button'

interface MembershipViewProps {
  tree: StructureTree
  error: string | null
  busy: boolean
  submit: (action: () => Promise<void>) => Promise<void>
  wizardOpen?: boolean
  onWizardOpenChange?: (open: boolean) => void
}

export function MembershipView({
  tree,
  error,
  busy,
  submit,
  wizardOpen: wizardOpenProp,
  onWizardOpenChange,
}: MembershipViewProps) {
  const [wizardOpenInternal, setWizardOpenInternal] = useState(false)
  const wizardOpen = wizardOpenProp ?? wizardOpenInternal
  const setWizardOpen = onWizardOpenChange ?? setWizardOpenInternal
  const [sheet, setSheet] = useState<MemberSheetState | null>(null)
  const [detailMember, setDetailMember] = useState<ReturnType<typeof buildMemberRows>[number] | null>(
    null,
  )
  const [filterRules, setFilterRules] = useState<MemberFilterRule[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchField, setSearchField] = useState<MemberFilterField | 'all'>('all')

  const rows = useMemo(() => buildMemberRows(tree), [tree])
  const structureLayers = getLayers(tree)
  const filteredRows = useMemo(() => {
    const byRules = applyMemberFilterRules(rows, filterRules)
    return applyMemberSearch(byRules, searchQuery, searchField)
  }, [rows, filterRules, searchQuery, searchField])

  return (
    <div className="min-w-0 space-y-4">
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <StructureMemberTable
        rows={filteredRows}
        structureLayers={structureLayers}
        title="All members"
        extendedColumns
        totalCount={rows.length}
        emptyMessage={
          rows.length === 0
            ? 'No members yet. Click Add member above.'
            : 'No members match your search or filters.'
        }
        showSearch={false}
        hideHeader
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
            totalCount={rows.length}
          />
        }
        onView={(member) => setDetailMember(member)}
        onEdit={(member) => setSheet({ mode: 'edit', member })}
      />

      {wizardOpen && (
        <MemberCreateWizard
          tree={tree}
          busy={busy}
          submit={submit}
          onClose={() => setWizardOpen(false)}
        />
      )}

      {sheet && (
        <MemberFormSheet
          tree={tree}
          busy={busy}
          submit={submit}
          sheet={sheet}
          onClose={() => setSheet(null)}
        />
      )}

      {detailMember && (
        <MemberDetailSheet
          member={detailMember}
          tree={tree}
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
