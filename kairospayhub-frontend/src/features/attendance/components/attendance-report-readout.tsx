import type { AttendanceReportDocument } from '@/features/attendance/api'

export function AttendanceReportReadout({
  report,
  showHeading = true,
}: {
  report?: AttendanceReportDocument | null
  showHeading?: boolean
}) {
  if (!report || report.schema.length === 0) return null

  return (
    <section className="space-y-3 rounded-lg border px-4 py-3">
      {showHeading ? <h3 className="text-sm font-semibold">Meeting report</h3> : null}
      <dl className="space-y-3">
        {report.schema.map((field) => {
          const value = report.answers[field.id]
          return (
            <div key={field.id}>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {field.label}
              </dt>
              <dd className="mt-1 text-sm">
                {field.kind === 'photos' ? (
                  <PhotoList urls={Array.isArray(value) ? value : []} />
                ) : (
                  <p className="whitespace-pre-wrap">
                    {typeof value === 'string' && value.trim() ? value : '—'}
                  </p>
                )}
              </dd>
            </div>
          )
        })}
      </dl>
    </section>
  )
}

function PhotoList({ urls }: { urls: string[] }) {
  if (urls.length === 0) return <p>—</p>
  return (
    <ul className="flex flex-wrap gap-2">
      {urls.map((url) => (
        <li key={url}>
          <a href={url} target="_blank" rel="noreferrer">
            <img src={url} alt="Report photo" className="size-24 rounded-md object-cover" />
          </a>
        </li>
      ))}
    </ul>
  )
}
