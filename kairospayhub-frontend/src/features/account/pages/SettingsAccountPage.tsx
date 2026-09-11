import { Navigate } from 'react-router-dom'

/** @deprecated Use /settings/profile. Kept so old /settings/account links still land on Profile. */
export function SettingsAccountPage() {
  return <Navigate to="/settings/profile" replace />
}
