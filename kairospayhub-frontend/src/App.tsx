import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { RequireAuth } from './auth/RequireAuth'
import { PastorOnlyRoute, PastorRoute } from './auth/PastorRoute'
import { AccessPage } from '@/features/access'
import { ScopedLeaderRoute } from './auth/ScopedLeaderRoute'
import { DashboardRoot } from './pages/Dashboard'
import {
  GivingsPage,
  OverallGivingsPage,
  ProgramDetailPage,
  ProgramStructureContributionsPage,
  TransactionsPage,
} from '@/features/giving'
import { MembershipPage, RosterPage, RosterUnitPage } from '@/features/roster'
import { StructurePage } from '@/features/structure'
import { DashboardPage } from './pages/DashboardPages'
import {
  MemberAttendancePage,
  MemberEditPage,
  MemberGivingsPage,
  MemberProfilePage,
} from './pages/MemberDetailPages'
import {
  AccountNotificationsPage,
  AccountProfilePage,
  AccountSecurityPage,
} from '@/features/account'
import {
  SettingsAdministratorsPage,
  SettingsIndexPage,
  SettingsLayout,
} from '@/features/settings'
import {
  AttendanceApprovalsPage,
  AttendanceApproverRoute,
  AttendanceMeetingPacksPage,
  AttendanceMeetingTypesPage,
  AttendanceOverviewPage,
  AttendanceOverviewRoute,
  AttendanceSubmissionsPage,
} from '@/features/attendance'
import { JoinPage } from './pages/JoinPage'
import { Login } from './pages/Login'
import { ForgotPassword, ResetPassword, SetPassword } from './pages/PasswordPages'
import { EventsPage, EventsRoute } from '@/features/events'
import {
  MediaRoute,
  ServiceRecordingDetailPage,
  ServiceRecordingsPage,
} from '@/features/media'
import { ConfirmEmail } from './pages/ConfirmEmail'
import { SignUp } from './pages/SignUp'
import { SuperadminOutreachPage } from '@/features/outreach/pages/superadmin-outreach-page'
import { SuperadminSearchPage } from '@/features/outreach/pages/superadmin-search-page'
import { SuperadminSavedPage } from '@/features/outreach/pages/superadmin-saved-page'
import { SuperadminReachedPage } from '@/features/outreach/pages/superadmin-reached-page'
import { SuperadminLoginPage } from '@/features/outreach/pages/superadmin-login-page'
import { RequireOperator } from '@/features/outreach/components/require-operator'

export default function App() {
  return (
    <Routes>
      <Route path="/join/:token" element={<JoinPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/confirm-email" element={<ConfirmEmail />} />
      <Route path="/set-password" element={<SetPassword />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/superadmin/login" element={<SuperadminLoginPage />} />
      <Route
        path="/superadmin"
        element={
          <RequireOperator>
            <SuperadminOutreachPage />
          </RequireOperator>
        }
      />
      <Route
        path="/superadmin/search"
        element={
          <RequireOperator>
            <SuperadminSearchPage />
          </RequireOperator>
        }
      />
      <Route
        path="/superadmin/saved"
        element={
          <RequireOperator>
            <SuperadminSavedPage />
          </RequireOperator>
        }
      />
      <Route
        path="/superadmin/reached"
        element={
          <RequireOperator>
            <SuperadminReachedPage />
          </RequireOperator>
        }
      />
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
          path="access"
          element={
            <PastorOnlyRoute>
              <AccessPage />
            </PastorOnlyRoute>
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
        <Route
          path="roster/members/:memberId"
          element={
            <ScopedLeaderRoute>
              <MemberProfilePage />
            </ScopedLeaderRoute>
          }
        />
        <Route
          path="roster/members/:memberId/attendance"
          element={
            <ScopedLeaderRoute>
              <MemberAttendancePage />
            </ScopedLeaderRoute>
          }
        />
        <Route
          path="roster/members/:memberId/givings"
          element={
            <ScopedLeaderRoute>
              <MemberGivingsPage />
            </ScopedLeaderRoute>
          }
        />
        <Route
          path="roster/members/:memberId/edit"
          element={
            <ScopedLeaderRoute>
              <MemberEditPage />
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
        <Route
          path="media/recordings"
          element={
            <MediaRoute>
              <ServiceRecordingsPage />
            </MediaRoute>
          }
        />
        <Route
          path="media/recordings/:recordingId"
          element={
            <MediaRoute>
              <ServiceRecordingDetailPage />
            </MediaRoute>
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
          path="attendance/overview/:meetingTypeId"
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
          path="attendance/packs"
          element={
            <PastorRoute>
              <AttendanceMeetingPacksPage />
            </PastorRoute>
          }
        />
        <Route
          path="attendance"
          element={
            <PastorRoute>
              <AttendanceMeetingTypesPage />
            </PastorRoute>
          }
        />
        <Route path="account" element={<Navigate to="/settings/profile" replace />} />
        <Route path="account/security" element={<Navigate to="/settings/security" replace />} />
        <Route
          path="account/notifications"
          element={<Navigate to="/settings/notifications" replace />}
        />
        <Route path="settings" element={<SettingsLayout />}>
          <Route index element={<SettingsIndexPage />} />
          <Route path="branding" element={<Navigate to="/settings/profile" replace />} />
          <Route path="profile" element={<AccountProfilePage />} />
          <Route path="security" element={<AccountSecurityPage />} />
          <Route path="notifications" element={<AccountNotificationsPage />} />
          <Route path="account" element={<Navigate to="/settings/profile" replace />} />
          <Route
            path="administrators"
            element={
              <PastorRoute>
                <SettingsAdministratorsPage />
              </PastorRoute>
            }
          />
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
