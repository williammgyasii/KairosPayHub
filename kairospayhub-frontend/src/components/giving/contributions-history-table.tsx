import { useEffect, useMemo, useState } from 'react'
import { ArrowUpDown, Eye } from 'lucide-react'
import type { Contribution } from '@/api/giving'
import { formatAmount } from '@/api/giving'
import type { StructureTree } from '@/api/structure'
import { groupContributionsByMember, type MemberGivingHistory } from '@/lib/contribution-structure'
import { formatGivingDate } from '@/lib/giving-ui'
import { MemberGivingHistorySheet } from '@/components/giving/member-giving-history-sheet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { TablePagination } from '@/components/ui/table-pagination'

type SortColumn =
  | 'memberName'
  | 'structurePath'
  | 'contributionCount'
  | 'approvedTotal'
  | 'lastDateSent'

type SortState = { id: SortColumn; desc: boolean }

const COLUMNS: { id: SortColumn; label: string }[] = [
  { id: 'memberName', label: 'Member' },
  { id: 'structurePath', label: 'Structure' },
  { id: 'contributionCount', label: 'Payments' },
  { id: 'approvedTotal', label: 'Approved' },
  { id: 'lastDateSent', label: 'Last given' },
]

function matchesSearch(member: MemberGivingHistory, query: string) {
  const haystack = [member.memberName, member.structurePath].join(' ').toLowerCase()
  return haystack.includes(query.toLowerCase())
}

function compareMembers(a: MemberGivingHistory, b: MemberGivingHistory, sort: SortState) {
  const dir = sort.desc ? -1 : 1

  switch (sort.id) {
    case 'memberName':
      return dir * a.memberName.localeCompare(b.memberName)
    case 'structurePath':
      return dir * a.structurePath.localeCompare(b.structurePath)
    case 'contributionCount':
      return dir * (a.contributionCount - b.contributionCount)
    case 'approvedTotal':
      return dir * (a.approvedTotal - b.approvedTotal)
    case 'lastDateSent': {
      const aTime = a.lastDateSent ? Date.parse(a.lastDateSent) : 0
      const bTime = b.lastDateSent ? Date.parse(b.lastDateSent) : 0
      return dir * (aTime - bTime)
    }
    default:
      return 0
  }
}

export function ContributionsHistoryTable({
  contributions,
  tree,
  viewerRole,
}: {
  contributions: Contribution[]
  tree: StructureTree | null
  viewerRole?: string
}) {
  const members = useMemo(
    () => groupContributionsByMember(tree, contributions),
    [tree, contributions],
  )
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sorting, setSorting] = useState<SortState>({ id: 'memberName', desc: false })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [selectedMember, setSelectedMember] = useState<MemberGivingHistory | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, pageSize, sorting])

  const filteredMembers = useMemo(() => {
    const filtered = debouncedSearch
      ? members.filter((member) => matchesSearch(member, debouncedSearch))
      : members
    return [...filtered].sort((a, b) => compareMembers(a, b, sorting))
  }, [members, debouncedSearch, sorting])

  const pageMembers = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredMembers.slice(start, start + pageSize)
  }, [filteredMembers, page, pageSize])

  function toggleSort(columnId: SortColumn) {
    setSorting((prev) => {
      if (prev.id === columnId) {
        return { id: columnId, desc: !prev.desc }
      }
      return { id: columnId, desc: columnId === 'lastDateSent' || columnId === 'approvedTotal' }
    })
  }

  return (
    <>
      <Card>
        <CardHeader className="space-y-3">
          <div>
            <CardTitle>Member history</CardTitle>
            <CardDescription>
              One row per person — open a member to see every payment logged for this giving
            </CardDescription>
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search member or structure…"
            className="max-w-sm"
          />
        </CardHeader>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">No contributions logged yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-y border-border/60 bg-muted/20">
                      {COLUMNS.map((column) => (
                        <th key={column.id} className="px-4 py-3 text-left">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                            onClick={() => toggleSort(column.id)}
                          >
                            {column.label}
                            <ArrowUpDown className="size-3.5" />
                          </button>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageMembers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={COLUMNS.length + 1}
                          className="px-4 py-10 text-center text-sm text-muted-foreground"
                        >
                          No members match your search.
                        </td>
                      </tr>
                    ) : (
                      pageMembers.map((member) => (
                        <tr
                          key={member.memberId}
                          className="border-b border-border/40 hover:bg-muted/10"
                        >
                          <td className="px-4 py-3 align-middle font-medium">{member.memberName}</td>
                          <td className="px-4 py-3 align-middle text-muted-foreground">
                            {member.structurePath}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            {member.contributionCount}
                            {member.pendingCount > 0 && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                ({member.pendingCount} pending)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-middle tabular-nums font-medium">
                            {formatAmount(member.approvedTotal)}
                          </td>
                          <td className="px-4 py-3 align-middle text-muted-foreground">
                            {member.lastDateSent ? formatGivingDate(member.lastDateSent) : '—'}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedMember(member)}
                              >
                                <Eye className="size-3.5" />
                                View
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={page}
                pageSize={pageSize}
                totalCount={filteredMembers.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </>
          )}
        </CardContent>
      </Card>

      <MemberGivingHistorySheet
        member={selectedMember}
        open={selectedMember !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedMember(null)
        }}
        viewerRole={viewerRole}
      />
    </>
  )
}
