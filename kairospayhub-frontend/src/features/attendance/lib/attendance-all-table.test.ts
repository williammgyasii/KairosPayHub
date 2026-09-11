import { describe, expect, it } from 'vitest'
import {
  attendanceColumnFromSortBy,
  attendanceSortByFromColumn,
} from '@/features/attendance/lib/attendance-all-table'

describe('attendance all-table sort mapping', () => {
  it('maps TanStack column ids to the rollup API', () => {
    expect(attendanceSortByFromColumn('unit')).toBe('cell')
    expect(attendanceSortByFromColumn('parentUnit')).toBe('parent')
    expect(attendanceSortByFromColumn('invitedBy')).toBe('invitedBy')
  })

  it('maps API sort back to column ids', () => {
    expect(attendanceColumnFromSortBy('cell')).toBe('unit')
    expect(attendanceColumnFromSortBy('parent')).toBe('parentUnit')
    expect(attendanceColumnFromSortBy('name')).toBe('name')
  })
})
