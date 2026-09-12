import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { DashboardPageHeader } from '@/shared/layout/dashboard-page-header'
import { useApi } from '@/shared/api'
import {
  listMeetingTypes,
  listOccurrences,
  type AttendanceMeetingType,
  type AttendanceOccurrenceSummary,
} from '@/features/attendance/api'
import { AttendanceMeetingPackPanel } from '@/features/attendance/components/attendance-meeting-pack-panel'
import { formatOccurrenceLabel } from '@/features/attendance/lib/attendance-ui'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { InlineSpinner } from '@/shared/ui/spinner'

type ShareFilesFormValues = {
  meetingTypeId: string
  occurrenceId: string
}

export function AttendanceMeetingPacksPage() {
  const api = useApi()
  const form = useForm<ShareFilesFormValues>({
    defaultValues: { meetingTypeId: '', occurrenceId: '' },
  })
  const { control, setValue, watch } = form
  const meetingTypeId = watch('meetingTypeId')
  const occurrenceId = watch('occurrenceId')

  const [types, setTypes] = useState<AttendanceMeetingType[]>([])
  const [occurrences, setOccurrences] = useState<AttendanceOccurrenceSummary[]>([])
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [loadingOccurrences, setLoadingOccurrences] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadingTypes(true)
    setError(null)
    void listMeetingTypes(api)
      .then((next) => {
        if (!cancelled) setTypes(next.filter((type) => type.isActive))
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load meeting types')
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTypes(false)
      })
    return () => {
      cancelled = true
    }
  }, [api])

  useEffect(() => {
    setValue('occurrenceId', '')
    setOccurrences([])
    if (!meetingTypeId) return
    let cancelled = false
    setLoadingOccurrences(true)
    void listOccurrences(api, meetingTypeId)
      .then((next) => {
        if (!cancelled) setOccurrences(next)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load dates')
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingOccurrences(false)
      })
    return () => {
      cancelled = true
    }
  }, [api, meetingTypeId, setValue])

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Attendance', to: '/attendance' },
          { label: 'Share files' },
        ]}
        title="Share files"
        description="Pick the meeting, then the day. Leaders in that meeting’s scope get the note and files."
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loadingTypes ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <InlineSpinner /> Loading meetings…
        </p>
      ) : types.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Create a meeting type under Attendance first.
        </p>
      ) : (
        <Form {...form}>
          <form
            data-testid="share-files-form"
            onSubmit={(event) => event.preventDefault()}
            className="space-y-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={control}
                name="meetingTypeId"
                rules={{ required: 'Choose a meeting' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting</FormLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a meeting…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {types.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Which meeting these files belong to.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="occurrenceId"
                rules={{ required: 'Choose a day' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day</FormLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      disabled={!meetingTypeId || loadingOccurrences || occurrences.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !meetingTypeId
                                ? 'Choose a meeting first…'
                                : loadingOccurrences
                                  ? 'Loading days…'
                                  : occurrences.length === 0
                                    ? 'No days yet'
                                    : 'Select a day…'
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {occurrences.map((occurrence) => (
                          <SelectItem key={occurrence.id} value={occurrence.id}>
                            {formatOccurrenceLabel(occurrence)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Each date has its own pack — next week does not inherit this one.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {occurrenceId ? (
              <AttendanceMeetingPackPanel
                occurrenceId={occurrenceId}
                canManageChurch
                embedded
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Choose a meeting and a day to write a note or attach files.
              </p>
            )}
          </form>
        </Form>
      )}
    </div>
  )
}
