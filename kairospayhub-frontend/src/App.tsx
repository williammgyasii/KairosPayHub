import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { RequireAuth } from './auth/RequireAuth'
import { PastorRoute } from './auth/PastorRoute'
import { ScopedLeaderRoute } from './auth/ScopedLeaderRoute'
import { DashboardRoot } from './pages/Dashboard'
import { GivingsPage } from './pages/GivingsPage'
import { OverallGivingsPage } from './pages/OverallGivingsPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { ProgramDetailPage } from './pages/ProgramDetailPage'
import { ProgramStructureContributionsPage } from './pages/ProgramStructureContributionsPage'
import { MembershipPage, DashboardPage, RosterPage, RosterUnitPage, StructurePage } from './pages/DashboardPages'
import { SettingsLayout } from './components/settings/settings-layout'
import { SettingsBrandingPage } from './pages/SettingsBrandingPage'
import { SettingsAccountPage } from './pages/SettingsAccountPage'
import { SettingsAdministratorsPage } from './pages/SettingsAdministratorsPage'
import { AttendanceApprovalsPage } from './pages/AttendanceApprovalsPage'
import { AttendanceOverviewPage } from './pages/AttendanceOverviewPage'
import { AttendanceSubmissionsPage } from './pages/AttendanceSubmissionsPage'
import { AttendanceMeetingTypesPage } from './pages/AttendanceMeetingTypesPage'
import { AttendanceApproverRoute, AttendanceOverviewRoute } from './auth/AttendanceRoute'
import { Login } from './pages/Login'
import { ForgotPassword, ResetPassword, SetPassword } from './pages/PasswordPages'
import { EventsRoute } from './auth/EventsRoute'
import { EventsPage } from './pages/EventsPage'
import { ConfirmEmail } from './pages/ConfirmEmail'
import { SignUp } from './pages/SignUp'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/confirm-email" element={<ConfirmEmail />} />
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
        <Route index element={<DashboardPage />} />
        <Route
          path="structure"
          element={
            <PastorRoute>
              <StructurePage />
            </PastorRoute>
          }
        />
        <Route
          path="roster"
          element={
            <ScopedLeaderRoute>
              <RosterPage />
            </ScopedLeaderRoute>
          }
        />
        <Route
          path="roster/units/:nodeId"
          element={
            <ScopedLeaderRoute>
              <RosterUnitPage />
            </ScopedLeaderRoute>
          }
        />
        <Route
          path="roster/membership"
          element={
            <ScopedLeaderRoute>
              <MembershipPage />
            </ScopedLeaderRoute>
          }
        />
        <Route path="membership" element={<Navigate to="/roster/membership" replace />} />
        <Route
          path="events"
          element={
            <EventsRoute>
              <EventsPage />
            </EventsRoute>
          }
        />
        <Route path="givings/overall" element={<OverallGivingsPage />} />
        <Route path="givings/transactions" element={<TransactionsPage />} />
        <Route path="givings" element={<GivingsPage />} />
        <Route path="givings/:programId/structure/:nodeId" element={<ProgramStructureContributionsPage />} />
        <Route path="givings/:programId" element={<ProgramDetailPage />} />
        <Route path="programs" element={<Navigate to="/givings" replace />} />
        <Route path="programs/:programId" element={<LegacyProgramsRedirect />} />
        <Route
          path="attendance/overview"
          element={
            <AttendanceOverviewRoute>
              <AttendanceOverviewPage />
            </AttendanceOverviewRoute>
          }
        />
        <Route
          path="attendance/approvals"
          element={
            <AttendanceApproverRoute>
              <AttendanceApprovalsPage />
            </AttendanceApproverRoute>
          }
        />
        <Route path="attendance/overall" element={<Navigate to="/attendance/overview" replace />} />
        <Route path="attendance/submissions" element={<AttendanceSubmissionsPage />} />
        <Route
          path="attendance"
          element={
            <PastorRoute>
              <AttendanceMeetingTypesPage />
            </PastorRoute>
          }
        />
        <Route
          path="settings"
          element={
            <PastorRoute>
              <SettingsLayout />
            </PastorRoute>
          }
        >
          <Route index element={<SettingsBrandingPage />} />
          <Route path="branding" element={<Navigate to="/settings" replace />} />
          <Route path="account" element={<SettingsAccountPage />} />
          <Route path="administrators" element={<SettingsAdministratorsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function LegacyProgramsRedirect() {
  const { programId } = useParams<{ programId: string }>()
  return <Navigate to={`/givings/${programId ?? ''}`} replace />
}
