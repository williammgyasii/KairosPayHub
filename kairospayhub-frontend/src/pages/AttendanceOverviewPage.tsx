import { useParams } from 'react-router-dom'
import { MeetingTypesList } from '@/components/attendance/attendance-overview-parts'
import { AttendanceOverviewDetail } from '@/pages/AttendanceOverviewDetail'
import { useListMeetingTypesQuery } from '@/store/attendanceApi'

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
