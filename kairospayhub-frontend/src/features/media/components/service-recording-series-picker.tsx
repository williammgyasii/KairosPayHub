import { useState } from 'react'
import { Plus } from 'lucide-react'
import {
  useCreateServiceRecordingSeriesMutation,
  useListServiceRecordingSeriesQuery,
} from '@/features/media/api/serviceRecordingSeriesApi'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Spinner } from '@/shared/ui/spinner'
import { formatRtkQueryError } from '@/store/baseQuery'

const NONE = '__none__'

type ServiceRecordingSeriesPickerProps = {
  value: string | null
  onChange: (seriesId: string | null) => void
  disabled?: boolean
}

export function ServiceRecordingSeriesPicker({
  value,
  onChange,
  disabled = false,
}: ServiceRecordingSeriesPickerProps) {
  const { data: series = [], isLoading } = useListServiceRecordingSeriesQuery()
  const [createSeries, { isLoading: creating }] = useCreateServiceRecordingSeriesMutation()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  async function handleCreate() {
    const trimmed = newName.trim()
    if (!trimmed) return

    setCreateError(null)
    try {
      const created = await createSeries({ name: trimmed }).unwrap()
      onChange(created.id)
      setNewName('')
      setShowCreate(false)
    } catch (err) {
      setCreateError(formatRtkQueryError(err))
    }
  }

  return (
    <div className="space-y-2">
      {isLoading ? (
        <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Loading series…
        </div>
      ) : (
        <Select
          value={value ?? NONE}
          onValueChange={(next) => {
            if (next === NONE) {
              onChange(null)
              return
            }
            onChange(next)
          }}
          disabled={disabled || creating}
        >
          <SelectTrigger id="recording-series">
            <SelectValue placeholder="Choose a message series" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No series</SelectItem>
            {series.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {!showCreate ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground"
          disabled={disabled || creating}
          onClick={() => setShowCreate(true)}
        >
          <Plus className="mr-1 size-3.5" aria-hidden />
          Create series
        </Button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="e.g. Faith Over Fear"
            className="min-w-[12rem] flex-1"
            autoFocus
            disabled={creating}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void handleCreate()
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            disabled={creating || !newName.trim()}
            onClick={() => void handleCreate()}
          >
            {creating ? 'Adding…' : 'Add'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={creating}
            onClick={() => {
              setShowCreate(false)
              setNewName('')
              setCreateError(null)
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      {createError && <p className="text-sm text-destructive">{createError}</p>}
    </div>
  )
}
