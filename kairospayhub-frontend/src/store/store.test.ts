import { describe, expect, it } from 'vitest'
import { baseApi } from '@/store/baseApi'
import '@/store/meApi'
import '@/store/structureApi'
import '@/store/notificationsApi'
import '@/features/events/api/calendarApi'
import '@/features/giving/api/givingApi'
import '@/features/attendance/api/attendanceApi'
import '@/features/media/api/serviceRecordingsApi'
import '@/features/media/api/serviceRecordingCategoriesApi'

describe('RTK Query baseApi injection', () => {
  it('registers core read endpoints on the shared api slice', () => {
    expect(baseApi.endpoints.getMe).toBeDefined()
    expect(baseApi.endpoints.getTablePreferences).toBeDefined()
    expect(baseApi.endpoints.getStructureTree).toBeDefined()
    expect(baseApi.endpoints.getGivingDashboard).toBeDefined()
    expect(baseApi.endpoints.listChildGivingPrograms).toBeDefined()
    expect(baseApi.endpoints.getProgramRollup).toBeDefined()
    expect(baseApi.endpoints.listNotifications).toBeDefined()
    expect(baseApi.endpoints.getCalendarFeed).toBeDefined()
    expect(baseApi.endpoints.listMeetingTypes).toBeDefined()
    expect(baseApi.endpoints.listServiceRecordings).toBeDefined()
    expect(baseApi.endpoints.listServiceRecordingCategories).toBeDefined()
  })
})
