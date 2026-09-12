import { render, screen } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Me } from '@/api/auth'
import { AttendanceMeetingPacksPage } from '@/features/attendance/pages/AttendanceMeetingPacksPage'
import { navForRole } from '@/shared/lib/dashboard-nav'

const { api, listMeetingTypes, listOccurrences, getMeetingPack } = vi.hoisted(() => ({
  api: {},
  listMeetingTypes: vi.fn(),
  listOccurrences: vi.fn(),
  getMeetingPack: vi.fn(),
}))

vi.mock('@/shared/api', () => ({
  useApi: () => api,
}))

vi.mock('@/features/attendance/api', async () => {
  const actual = await vi.importActual<typeof import('@/features/attendance/api')>(
    '@/features/attendance/api',
  )
  return {
    ...actual,
    listMeetingTypes,
    listOccurrences,
    getMeetingPack,
    publishMeetingPack: vi.fn(),
    downloadMeetingPackFile: vi.fn(),
  }
})

function pastor(): Me & { onboarded: true } {
  return {
    onboarded: true,
    id: 'p1',
    churchId: 'c1',
    churchName: 'Hilltop',
    churchLogoUrl: null,
    organizationId: 'o1',
    role: 'Pastor',
    legacyChurchId: null,
    email: 'pastor@example.com',
    name: 'Pastor',
  }
}

function cellLeader(): Me & { onboarded: true } {
  return {
    ...pastor(),
    id: 'c1-leader',
    role: 'CellLeader',
    canMarkAttendance: true,
    name: 'Cell Leader',
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/attendance/packs']}>
      <Routes>
        <Route element={<Outlet context={{ me: pastor() }} />}>
          <Route path="attendance/packs" element={<AttendanceMeetingPacksPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AttendanceMeetingPacksPage', () => {
  it('asks for a meeting and a day before the share form appears', async () => {
    listMeetingTypes.mockResolvedValue([
      {
        id: 'mt-1',
        title: 'Sunday Service',
        recurrenceKind: 'Weekly',
        dayOfWeek: 'Sunday',
        scopeKind: 'Church',
        scopeNodeId: null,
        isAlwaysOpen: false,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        opensDayOffset: 0,
        opensTimeUtc: '00:00',
        deadlineDayOffset: 1,
        deadlineTimeUtc: '00:00',
        autoGenerateWeeksAhead: 4,
      },
    ])
    listOccurrences.mockResolvedValue([
      {
        id: 'occ-1',
        meetingDate: '2026-09-13',
        status: 'Open',
        submissionOpensAt: '2026-09-13T00:00:00Z',
        submissionDeadlineAt: '2026-09-14T00:00:00Z',
        scopeSubmissionCount: 0,
      },
    ])
    getMeetingPack.mockRejectedValue(new Error('Not found'))

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Share files' })).toBeTruthy()
    expect(screen.getByTestId('share-files-form')).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Meeting' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Day' })).toHaveAttribute('data-disabled')
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull()
    expect(screen.getByText(/Choose a meeting and a day/)).toBeTruthy()
  })

  it('is a church-manager nav item, never a cell-leader destination', () => {
    const pastorNav = navForRole(pastor())
    const attendance = pastorNav.find((entry) => entry.kind === 'group' && entry.label === 'Attendance')
    expect(attendance?.kind === 'group' && attendance.children.map((child) => child.label)).toContain(
      'Share files',
    )

    const labels = navForRole(cellLeader()).flatMap((entry) =>
      entry.kind === 'item' ? [entry.label] : entry.children.map((child) => child.label),
    )
    expect(labels).not.toContain('Share files')
  })
})
