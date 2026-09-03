import { describe, expect, it } from 'vitest'
import { baseApi } from '@/store/baseApi'
import '@/store/meApi'
import '@/store/structureApi'
import '@/store/notificationsApi'
import '@/store/calendarApi'
import '@/store/givingApi'
import '@/store/attendanceApi'

describe('RTK Query baseApi injection', () => {
  it('registers core read endpoints on the shared api slice', () => {
    expect(baseApi.endpoints.getMe).toBeDefined()
    expect(baseApi.endpoints.getStructureTree).toBeDefined()
    expect(baseApi.endpoints.getGivingDashboard).toBeDefined()
    expect(baseApi.endpoints.listNotifications).toBeDefined()
    expect(baseApi.endpoints.getCalendarFeed).toBeDefined()
    expect(baseApi.endpoints.listMeetingTypes).toBeDefined()
  })
})
