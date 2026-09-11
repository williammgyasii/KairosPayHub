import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithAuth } from '@/store/baseQuery'

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: [
    'Me',
    'TablePreferences',
    'Structure',
    'Notifications',
    'Calendar',
    'GivingPrograms',
    'GivingDashboard',
    'GivingProgram',
    'Contributions',
    'ChildGivingPrograms',
    'GivingRollup',
    'AttendanceMeetingTypes',
    'AttendanceOccurrences',
    'AttendanceRollup',
    'AttendanceApprovalQueue',
    'AttendanceRollCallReview',
    'AttendanceMemberHistory',
  ],
  keepUnusedDataFor: 300,
  endpoints: () => ({}),
})
