import { useCallback, useEffect, useState } from 'react'
import { MoreHorizontal, Plus } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { useApi } from '@/api/useApi'
import { listMeetingTypes, deleteMeetingType, type AttendanceMeetingType } from '@/api/attendance'
import { canManageChurch } from '@/api/me'
import { MeetingTypeFormModal } from '@/components/attendance/meeting-type-form-modal'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { formatMeetingSchedule, formatSubmissionWindow } from '@/lib/attendance-ui'

export function AttendanceMeetingTypesPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const api = useApi()
  const canManage = canManageChurch(me.role)
  const [types, setTypes] = useState<AttendanceMeetingType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingType, setEditingType] = useState<AttendanceMeetingType | null>(null)
  const [deletingType, setDeletingType] = useState<AttendanceMeetingType | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setTypes(await listMeetingTypes(api))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load meeting types')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  async function onConfirmDelete() {
    if (!deletingType) return
    setDeleteBusy(true)
    setError(null)
    try {
      await deleteMeetingType(api, deletingType.id)
      setDeletingType(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete meeting type')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        breadcrumbs={[
          { label: 'Overview', to: '/' },
          { label: 'Attendance', to: '/attendance' },
          { label: 'Meeting types' },
        ]}
        title="Meeting types"
        description="Recurring meetings with auto-generated occurrences. Leaders roll call after the submission window opens."
        actions={
          canManage ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" />
              Add meeting type
            </Button>
          ) : undefined
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <Spinner label="Loading meeting types…" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Schedule</th>
                <th className="px-4 py-3 font-medium">Scope</th>
                <th className="px-4 py-3 font-medium">Submission window</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {canManage && <th className="px-4 py-3 font-medium" />}
              </tr>
            </thead>
            <tbody>
              {types.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="px-4 py-6 text-muted-foreground">
                    No meeting types yet.{canManage ? ' Click Add meeting type to get started.' : ''}
                  </td>
                </tr>
              ) : (
                types.map((type) => (
                  <tr key={type.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{type.title}</td>
                    <td className="px-4 py-3">
                      {formatMeetingSchedule(type)}
                    </td>
                    <td className="px-4 py-3">{type.scopeKind}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatSubmissionWindow(type)}</td>
                    <td className="px-4 py-3">{type.isActive ? 'Active' : 'Inactive'}</td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingType(type)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeletingType(type)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <MeetingTypeFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        api={api}
        onSaved={load}
      />

      <MeetingTypeFormModal
        open={Boolean(editingType)}
        onOpenChange={(open) => {
          if (!open) setEditingType(null)
        }}
        mode="edit"
        meetingType={editingType}
        api={api}
        onSaved={load}
      />

      <Modal
        open={Boolean(deletingType)}
        onOpenChange={(open) => {
          if (!open) setDeletingType(null)
        }}
        title="Delete meeting type"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Delete &quot;{deletingType?.title}&quot; and all generated occurrences, roll calls, and
            submission history for this meeting? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={deleteBusy}
              onClick={() => setDeletingType(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteBusy}
              onClick={() => void onConfirmDelete()}
            >
              {deleteBusy ? 'Deleting…' : 'Delete meeting type'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
