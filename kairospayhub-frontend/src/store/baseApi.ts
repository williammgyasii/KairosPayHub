import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithAuth } from '@/store/baseQuery'

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: [
    'Me',
    'Structure',
    'Notifications',
    'Calendar',
    'GivingPrograms',
    'GivingDashboard',
    'GivingProgram',
    'Contributions',
    'AttendanceMeetingTypes',
    'AttendanceOccurrences',
    'AttendanceRollup',
    'AttendanceApprovalQueue',
    'AttendanceRollCallReview',
  ],
  keepUnusedDataFor: 300,
  endpoints: () => ({}),
})
