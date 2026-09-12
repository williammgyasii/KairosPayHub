import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/shared/layout/dashboard-layout'
import { DashboardPageHeader } from '@/shared/layout/dashboard-page-header'
import { useApi } from '@/shared/api'
import { listMeetingTypes, deleteMeetingType, type AttendanceMeetingType } from '@/features/attendance/api'
import { canManageChurch } from '@/api/auth'
import { MeetingTypeFormModal } from '@/features/attendance/components/meeting-type-form-modal'
import { MeetingTypesTable } from '@/features/attendance/components/meeting-types-table'
import { Modal } from '@/shared/ui/modal'
import { Button } from '@/shared/ui/button'

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
          { label: 'Dashboard', to: '/' },
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

      <MeetingTypesTable
        types={types}
        loading={loading}
        canManage={canManage}
        timeZoneId={me.timeZoneId}
        emptyMessage={
          canManage
            ? 'No meeting types yet. Click Add meeting type to get started.'
            : 'No meeting types yet.'
        }
        onEdit={setEditingType}
        onDelete={setDeletingType}
      />

      <MeetingTypeFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        api={api}
        timeZoneId={me.timeZoneId}
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
        timeZoneId={me.timeZoneId}
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
