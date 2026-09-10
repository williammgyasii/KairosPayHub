import { Navigate } from 'react-router-dom'

/** @deprecated Use /account routes. Kept so old /settings/account links still land on Profile. */
export function SettingsAccountPage() {
  return <Navigate to="/account" replace />
}
