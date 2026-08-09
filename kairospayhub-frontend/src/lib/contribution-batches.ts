import type { Contribution } from '@/api/giving'

export type ApprovalDisplayRow =
  | { kind: 'single'; contribution: Contribution }
  | { kind: 'batch'; batchId: string; contributions: Contribution[] }

export type BatchSummary = {
  batchId: string
  memberCount: number
  totalAmount: number
  currency: string
  dateSent: string
  createdAt: string
  programId: string
  programTitle: string
  programPeriodLabel: string
  memberParentNodeId: string
  enteredByName: string | null
  enteredByScopeUnitName: string | null
  enteredByRole: string | null
  sentToPastor: boolean | null
  remittanceMedium: string | null
  remittanceMediumOther: string | null
  notes: string | null
  attachmentKey: string
}

export function summarizeBatch(batchId: string, contributions: Contribution[]): BatchSummary {
  const sorted = [...contributions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  const first = sorted[0]
  return {
    batchId,
    memberCount: contributions.length,
    totalAmount: contributions.reduce((sum, row) => sum + row.amount, 0),
    currency: first.currency,
    dateSent: first.dateSent,
    createdAt: first.createdAt,
    programId: first.programId,
    programTitle: first.programTitle,
    programPeriodLabel: first.programPeriodLabel,
    memberParentNodeId: first.memberParentNodeId,
    enteredByName: first.enteredByName,
    enteredByScopeUnitName: first.enteredByScopeUnitName,
    enteredByRole: first.enteredByRole,
    sentToPastor: first.sentToPastor,
    remittanceMedium: first.remittanceMedium,
    remittanceMediumOther: first.remittanceMediumOther,
    notes: first.notes,
    attachmentKey: first.attachmentKey,
  }
}

export function sortApprovalDisplayRows(rows: ApprovalDisplayRow[]): ApprovalDisplayRow[] {
  return [...rows].sort((a, b) => {
    const aTime =
      a.kind === 'batch'
        ? new Date(a.contributions[0]?.createdAt ?? 0).getTime()
        : new Date(a.contribution.createdAt).getTime()
    const bTime =
      b.kind === 'batch'
        ? new Date(b.contributions[0]?.createdAt ?? 0).getTime()
        : new Date(b.contribution.createdAt).getTime()
    return bTime - aTime
  })
}

export function groupContributionsForApproval(
  contributions: Contribution[],
  batchGroups: Map<string, Contribution[]>,
): ApprovalDisplayRow[] {
  const consumed = new Set<string>()
  const rows: ApprovalDisplayRow[] = []

  for (const [batchId, items] of batchGroups) {
    if (items.length === 0) continue
    rows.push({ kind: 'batch', batchId, contributions: items })
    for (const item of items) consumed.add(item.id)
  }

  for (const contribution of contributions) {
    if (contribution.batchId && batchGroups.has(contribution.batchId)) continue
    if (consumed.has(contribution.id)) continue
    rows.push({ kind: 'single', contribution })
  }

  return sortApprovalDisplayRows(rows)
}

export function paginateApprovalDisplayRows(
  rows: ApprovalDisplayRow[],
  page: number,
  pageSize: number,
) {
  const start = (page - 1) * pageSize
  return rows.slice(start, start + pageSize)
}
