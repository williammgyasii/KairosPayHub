import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth/RequireAuth'
import { DashboardRoot } from './pages/Dashboard'
import { ComingSoonPage, MembershipPage, OverviewPage, RosterPage, RosterUnitPage, StructurePage } from './pages/DashboardPages'
import { SettingsPage } from './pages/SettingsPage'
import { Login } from './pages/Login'
import { ForgotPassword, ResetPassword, SetPassword } from './pages/PasswordPages'
import { SignUp } from './pages/SignUp'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/set-password" element={<SetPassword />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardRoot />
          </RequireAuth>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="structure" element={<StructurePage />} />
        <Route path="roster" element={<RosterPage />} />
        <Route path="roster/units/:nodeId" element={<RosterUnitPage />} />
        <Route path="roster/membership" element={<MembershipPage />} />
        <Route path="membership" element={<Navigate to="/roster/membership" replace />} />
        <Route path="programs" element={<ComingSoonPage feature="Programs" />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
