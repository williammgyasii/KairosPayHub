import { useParams } from 'react-router-dom'
import { MeetingTypesList } from '@/features/attendance/components/attendance-overview-parts'
import { AttendanceOverviewDetail } from '@/features/attendance/pages/AttendanceOverviewDetail'
import { useListMeetingTypesQuery } from '@/features/attendance/api/attendanceApi'

export function AttendanceOverviewPage() {
  const { meetingTypeId } = useParams<{ meetingTypeId?: string }>()
  const {
    data: meetingTypes = [],
    isLoading: loadingTypes,
    isError: meetingTypesError,
  } = useListMeetingTypesQuery()

  if (!meetingTypeId) {
    return (
      <MeetingTypesList
        meetingTypes={meetingTypes}
        loading={loadingTypes}
        error={meetingTypesError ? 'Could not load attendance data' : null}
      />
    )
  }

  return <AttendanceOverviewDetail />
}
