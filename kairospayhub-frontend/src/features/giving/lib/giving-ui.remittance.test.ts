import { describe, expect, it } from 'vitest'
import {
  bulkRemittanceAmountLabel,
  bulkRemittanceOtherPlaceholder,
  bulkRemittanceQuestion,
  bulkSubmitLabel,
} from '@/features/giving/lib/giving-ui'

describe('remittance labels from manager approverLabel', () => {
  it('uses parent-layer label instead of hardcoded PFCC/pastor copy', () => {
    expect(bulkRemittanceQuestion('FellowshipLeader', 'PFCC')).toBe(
      'Has this payment been sent to PFCC?',
    )
    expect(bulkRemittanceAmountLabel('CellLeader', 'Fellowship')).toContain('Fellowship')
    expect(bulkRemittanceOtherPlaceholder('FellowshipLeader', 'church leadership')).toBe(
      'e.g. Cash handed to church leadership',
    )
    expect(bulkSubmitLabel('PFCCManager', true, 'church leadership')).toBe(
      'Submit for church leadership approval',
    )
  })
})
