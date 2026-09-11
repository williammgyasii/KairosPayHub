export type AttendanceAllSortBy = 'name' | 'cell' | 'parent' | 'type' | 'phone' | 'invitedBy'

export function attendanceSortByFromColumn(columnId: string): AttendanceAllSortBy {
  switch (columnId) {
    case 'unit':
      return 'cell'
    case 'parentUnit':
      return 'parent'
    case 'cell':
    case 'parent':
    case 'type':
    case 'phone':
    case 'invitedBy':
      return columnId
    default:
      return 'name'
  }
}

export function attendanceColumnFromSortBy(sortBy: AttendanceAllSortBy): string {
  switch (sortBy) {
    case 'cell':
      return 'unit'
    case 'parent':
      return 'parentUnit'
    default:
      return sortBy
  }
}
