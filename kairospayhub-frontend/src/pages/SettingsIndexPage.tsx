import { Navigate } from 'react-router-dom'

/** Settings root always lands on Profile (church logo lives there for managers). */
export function SettingsIndexPage() {
  return <Navigate to="/settings/profile" replace />
}
