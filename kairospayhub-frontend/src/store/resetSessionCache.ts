import { baseApi } from '@/store/baseApi'
import { store } from '@/store/store'

/** Drop all RTK Query cached data (e.g. after logout or before a new login). */
export function resetSessionCache() {
  store.dispatch(baseApi.util.resetApiState())
}
