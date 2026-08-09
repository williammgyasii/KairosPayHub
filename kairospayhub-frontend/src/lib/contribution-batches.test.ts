import { describe, expect, it } from 'vitest'
import type { Contribution } from '@/api/giving'
import { groupContributionsForApproval, summarizeBatch } from '@/lib/contribution-batches'

function contribution(partial: Partial<Contribution> & Pick<Contribution, 'id'>): Contribution {
  return {
    id: partial.id,
    programId: partial.programId ?? 'program-1',
    programTitle: partial.programTitle ?? 'Rhapsody',
    programPeriodLabel: partial.programPeriodLabel ?? '2026',
    isSubGiving: partial.isSubGiving ?? false,
    isLegacyParentContribution: partial.isLegacyParentContribution ?? false,
    memberId: partial.memberId ?? 'member-1',
    memberName: partial.memberName ?? 'Member',
    amount: partial.amount ?? 100,
    currency: partial.currency ?? 'GHS',
    dateSent: partial.dateSent ?? '2026-08-29T12:00:00.000Z',
    attachmentKey: partial.attachmentKey ?? 'giving/test.jpg',
    attachmentUrl: partial.attachmentUrl ?? null,
    notes: partial.notes ?? null,
    memberParentNodeId: partial.memberParentNodeId ?? 'cell-1',
    status: partial.status ?? 'PendingApproval',
    enteredByRole: partial.enteredByRole ?? 'PFCCManager',
    enteredByName: partial.enteredByName ?? 'Paul PFCC',
    enteredByScopeUnitName: partial.enteredByScopeUnitName ?? 'PFCC 1',
    sentToPastor: partial.sentToPastor ?? true,
    remittanceMedium: partial.remittanceMedium ?? null,
    remittanceMediumOther: partial.remittanceMediumOther ?? null,
    batchId: partial.batchId ?? null,
    pendingApproverRole: partial.pendingApproverRole ?? 'Pastor',
    approvedAt: partial.approvedAt ?? null,
    approvedByName: partial.approvedByName ?? null,
    rejectedReason: partial.rejectedReason ?? null,
    createdAt: partial.createdAt ?? '2026-08-29T13:00:00.000Z',
  }
}

describe('contribution-batches', () => {
  it('groups batch members into one approval row', () => {
    const batchId = 'batch-1'
    const batchGroups = new Map([
      [
        batchId,
        [
          contribution({ id: 'c1', batchId, memberId: 'm1', memberName: 'Ama', amount: 50 }),
          contribution({ id: 'c2', batchId, memberId: 'm2', memberName: 'Kofi', amount: 75 }),
        ],
      ],
    ])

    const grouped = groupContributionsForApproval(
      [
        contribution({ id: 'c1', batchId, memberId: 'm1', memberName: 'Ama', amount: 50 }),
        contribution({ id: 'c2', batchId, memberId: 'm2', memberName: 'Kofi', amount: 75 }),
        contribution({ id: 'c3', memberName: 'Mercy', amount: 20 }),
      ],
      batchGroups,
    )

    expect(grouped).toHaveLength(2)
    expect(grouped[0].kind).toBe('batch')
    if (grouped[0].kind === 'batch') {
      expect(grouped[0].contributions).toHaveLength(2)
      expect(summarizeBatch(grouped[0].batchId, grouped[0].contributions).totalAmount).toBe(125)
    }
    expect(grouped[1].kind).toBe('single')
  })
})
