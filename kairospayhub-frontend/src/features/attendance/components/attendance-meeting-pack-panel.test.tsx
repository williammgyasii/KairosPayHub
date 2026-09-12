import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AttendanceMeetingPackPanel } from '@/features/attendance/components/attendance-meeting-pack-panel'

const { api, getMeetingPack } = vi.hoisted(() => ({
  api: {},
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
    getMeetingPack,
    publishMeetingPack: vi.fn(),
    downloadMeetingPackFile: vi.fn(),
  }
})

describe('AttendanceMeetingPackPanel', () => {
  it('hides Share for a cell leader when there is no pack', async () => {
    getMeetingPack.mockRejectedValue(new Error('Not found'))
    render(<AttendanceMeetingPackPanel occurrenceId="occ-1" canManageChurch={false} />)
    await waitFor(() => expect(screen.queryByText(/Loading notes/)).toBeNull())
    expect(screen.queryByText('Share files for this meeting')).toBeNull()
    expect(screen.queryByText('Notes for this meeting')).toBeNull()
  })

  it('shows the note to a leader when a pack exists', async () => {
    getMeetingPack.mockResolvedValue({
      occurrenceId: 'occ-1',
      note: 'Romans 8',
      publishedAt: '2026-09-11T00:00:00Z',
      files: [{ id: 'f1', fileName: 'notes.pdf', contentType: 'application/pdf', sizeBytes: 12 }],
      receipts: null,
    })
    render(<AttendanceMeetingPackPanel occurrenceId="occ-1" canManageChurch={false} />)
    expect(await screen.findByText('Notes for this meeting')).toBeTruthy()
    expect(screen.getByText('Romans 8')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Download notes.pdf' })).toBeTruthy()
    expect(screen.queryByText('Share files for this meeting')).toBeNull()
    expect(screen.queryByText('Who used it')).toBeNull()
  })

  it('tells the parent a leader cannot continue until they download', async () => {
    const onViewerChange = vi.fn()
    getMeetingPack.mockResolvedValue({
      occurrenceId: 'occ-1',
      note: 'Romans 8',
      publishedAt: '2026-09-11T00:00:00Z',
      files: [{ id: 'f1', fileName: 'notes.pdf', contentType: 'application/pdf', sizeBytes: 12 }],
      receipts: null,
      viewerDownloadedAt: null,
    })
    render(
      <AttendanceMeetingPackPanel
        occurrenceId="occ-1"
        canManageChurch={false}
        onViewerChange={onViewerChange}
      />,
    )
    await waitFor(() => expect(onViewerChange).toHaveBeenCalledWith(false))
  })

  it('shows Share for a church manager', async () => {
    getMeetingPack.mockRejectedValue(new Error('Not found'))
    render(<AttendanceMeetingPackPanel occurrenceId="occ-1" canManageChurch />)
    expect(await screen.findByText('Share files for this meeting')).toBeTruthy()
    expect(screen.getByTestId('pack-file-dropzone').className).toMatch(/border-dashed/)
    expect(screen.getByRole('button', { name: /Tap to add PDFs or photos/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Share' })).toBeTruthy()
    expect(screen.getByText('Nothing shared for this day yet.')).toBeTruthy()
  })

  it('splits compose from a table of the shared pack', async () => {
    getMeetingPack.mockResolvedValue({
      occurrenceId: 'occ-1',
      note: 'Romans 8',
      publishedAt: '2026-09-11T00:00:00Z',
      files: [{ id: 'f1', fileName: 'notes.pdf', contentType: 'application/pdf', sizeBytes: 12 }],
      receipts: [
        { authUserId: 'u2', name: 'Ada Cell', seenAt: '2026-09-11T12:00:00Z', downloadedAt: null },
        {
          authUserId: 'u3',
          name: 'Ben Fellowship',
          seenAt: '2026-09-11T12:00:00Z',
          downloadedAt: '2026-09-11T12:05:00Z',
        },
      ],
    })
    render(<AttendanceMeetingPackPanel occurrenceId="occ-1" canManageChurch embedded />)
    expect(await screen.findByTestId('share-files-split')).toBeTruthy()
    const pane = screen.getByTestId('share-files-shared-pane')
    expect(pane.textContent).toMatch(/notes\.pdf/)
    expect(pane.textContent).toMatch(/Ada Cell/)
    expect(pane.textContent).toMatch(/Opened/)
    expect(pane.textContent).toMatch(/Ben Fellowship/)
    expect(pane.textContent).toMatch(/Downloaded/)
  })
})
