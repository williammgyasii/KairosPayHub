import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { baseApi } from '@/store/baseApi'
import '@/store/meApi'
import '@/store/structureApi'
import '@/store/notificationsApi'
import '@/features/events/api/calendarApi'
import '@/features/giving/api/givingApi'
import '@/features/attendance/api/attendanceApi'

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
})

setupListeners(store.dispatch)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
