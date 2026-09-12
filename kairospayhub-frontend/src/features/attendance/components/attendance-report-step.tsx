import { Save, Send } from 'lucide-react'
import type { ReportAnswers, ReportField, ReportPolicyInput } from '@/features/attendance/lib/report-policy'
import { MAX_REPORT_PHOTOS, reportPolicy } from '@/features/attendance/lib/report-policy'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'

export function AttendanceReportStep({
  type,
  answers,
  onChange,
  busy = false,
  busyAction = null,
  onSaveDraft,
  onSubmit,
  onUploadPhoto,
}: {
  type: ReportPolicyInput
  answers: ReportAnswers
  onChange: (next: ReportAnswers) => void
  busy?: boolean
  busyAction?: 'save' | 'submit' | null
  onSaveDraft: () => void
  onSubmit: () => void
  onUploadPhoto?: (fieldId: string, file: File) => Promise<void>
}) {
  const policy = reportPolicy(type, answers)

  function setText(fieldId: string, value: string) {
    onChange({ ...answers, [fieldId]: value })
  }

  function setPhotos(fieldId: string, urls: string[]) {
    onChange({ ...answers, [fieldId]: urls })
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">Meeting report</h2>
        <p className="text-sm text-muted-foreground">
          Fill every required prompt. Save draft anytime; submit stays off until the report is
          complete.
        </p>
      </div>

      <ol className="space-y-4">
        {policy.fields.map((field) => (
          <li key={field.id} className="space-y-2">
            <Label htmlFor={`report-answer-${field.id}`}>
              {field.label}
              {field.required ? <span className="ml-1 text-destructive">*</span> : null}
            </Label>
            {field.kind === 'longText' ? (
              <textarea
                id={`report-answer-${field.id}`}
                value={typeof answers[field.id] === 'string' ? (answers[field.id] as string) : ''}
                onChange={(e) => setText(field.id, e.target.value)}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            ) : (
              <PhotoPrompt
                field={field}
                urls={Array.isArray(answers[field.id]) ? (answers[field.id] as string[]) : []}
                disabled={busy}
                onChange={(urls) => setPhotos(field.id, urls)}
                onUpload={onUploadPhoto}
              />
            )}
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-2 gap-2 lg:flex lg:justify-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          loading={busyAction === 'save'}
          loadingLabel="Saving…"
          onClick={onSaveDraft}
        >
          <Save className="size-3.5" />
          Save draft
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!policy.complete || busy}
          loading={busyAction === 'submit'}
          loadingLabel="Submitting…"
          onClick={onSubmit}
        >
          <Send className="size-3.5" />
          Submit for approval
        </Button>
      </div>
    </section>
  )
}

function PhotoPrompt({
  field,
  urls,
  disabled,
  onChange,
  onUpload,
}: {
  field: ReportField
  urls: string[]
  disabled?: boolean
  onChange: (urls: string[]) => void
  onUpload?: (fieldId: string, file: File) => Promise<void>
}) {
  return (
    <div className="space-y-2">
      <input
        id={`report-answer-${field.id}`}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled || urls.length >= MAX_REPORT_PHOTOS || !onUpload}
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file && onUpload) void onUpload(field.id, file)
        }}
      />
      {urls.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {urls.map((url) => (
            <li key={url} className="relative">
              <img src={url} alt="" className="size-20 rounded-md object-cover" />
              <button
                type="button"
                className="absolute right-1 top-1 rounded bg-background/90 px-1 text-xs"
                onClick={() => onChange(urls.filter((item) => item !== url))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          {field.required ? 'At least one photo is required.' : 'Optional. JPEG, PNG, or WebP, 2 MB max.'}
        </p>
      )}
    </div>
  )
}
