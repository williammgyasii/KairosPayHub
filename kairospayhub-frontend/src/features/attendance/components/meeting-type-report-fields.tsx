import { Plus, Trash2 } from 'lucide-react'
import type { ReportField, ReportFieldKind } from '@/features/attendance/lib/report-policy'
import { newReportField, seedReportSchema } from '@/features/attendance/lib/report-policy'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

export function MeetingTypeReportFields({
  requiresReport,
  schema,
  onRequiresReportChange,
  onSchemaChange,
  showToggle = true,
  showSchema = true,
}: {
  requiresReport: boolean
  schema: ReportField[]
  onRequiresReportChange: (next: boolean) => void
  onSchemaChange: (next: ReportField[]) => void
  showToggle?: boolean
  showSchema?: boolean
}) {
  function toggleRequires(next: boolean) {
    onRequiresReportChange(next)
    onSchemaChange(seedReportSchema(next, next ? schema : []))
  }

  function updateField(id: string, patch: Partial<ReportField>) {
    onSchemaChange(schema.map((field) => (field.id === id ? { ...field, ...patch } : field)))
  }

  function addField(kind: ReportFieldKind) {
    onSchemaChange([...schema, newReportField(kind)])
  }

  return (
    <div className="space-y-3">
      {showToggle ? (
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3">
        <input
          type="checkbox"
          checked={requiresReport}
          onChange={(e) => toggleRequires(e.target.checked)}
          className="mt-1"
          aria-label="Requires a meeting report"
        />
        <span className="space-y-0.5">
          <span className="block text-sm font-medium">Requires a meeting report</span>
          <span className="block text-xs text-muted-foreground">
            Leaders fill prompts and photos after the roll-call sheet. Submit stays blocked until
            required fields are complete.
          </span>
        </span>
      </label>
      ) : null}

      {showSchema && requiresReport ? (
        <div className="space-y-3 rounded-lg border px-4 py-3">
          <p className="text-sm font-medium">Report prompts</p>
          <ol className="space-y-3">
            {schema.map((field, index) => (
              <li key={field.id} className="space-y-2 rounded-md border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Prompt {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground"
                    onClick={() => onSchemaChange(schema.filter((row) => row.id !== field.id))}
                    aria-label={`Remove ${field.label || 'prompt'}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`report-label-${field.id}`}>Label</Label>
                    <Input
                      id={`report-label-${field.id}`}
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`report-kind-${field.id}`}>Kind</Label>
                    <select
                      id={`report-kind-${field.id}`}
                      value={field.kind}
                      onChange={(e) =>
                        updateField(field.id, { kind: e.target.value as ReportFieldKind })
                      }
                      className={selectClassName}
                    >
                      <option value="longText">Long text</option>
                      <option value="photos">Photos</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(field.id, { required: e.target.checked })}
                  />
                  Required
                </label>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => addField('longText')}>
              <Plus className="size-3.5" />
              Add text prompt
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addField('photos')}>
              <Plus className="size-3.5" />
              Add photos prompt
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
