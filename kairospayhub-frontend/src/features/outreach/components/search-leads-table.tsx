import { useMemo } from 'react'
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { motion } from 'framer-motion'
import { Check, Eye, Mail, Plus } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { TablePagination } from '@/shared/ui/table-pagination'

export type SearchLead = {
  id: string
  name: string
  email: string
  website: string
  address?: string | null
  city?: string | null
  state?: string | null
  radiusMiles?: number | null
  saved?: boolean
  status?: string
  sentAt?: string | null
  sentSubject?: string | null
  sentBody?: string | null
}

const columnHelper = createColumnHelper<SearchLead>()

export function SearchLeadsTable({
  rows,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onOpen,
  onSave,
  onMessage,
  showStatus = false,
}: {
  rows: SearchLead[]
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onOpen: (lead: SearchLead) => void
  onSave?: (lead: SearchLead) => void
  onMessage?: (lead: SearchLead) => void
  showStatus?: boolean
}) {
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', { header: 'Church' }),
      columnHelper.accessor('email', { header: 'Email' }),
      columnHelper.accessor('state', {
        header: 'State',
        cell: (info) => info.getValue() || 'Unknown',
      }),
      columnHelper.accessor('city', {
        header: 'City',
        cell: (info) => info.getValue() || 'Unknown',
      }),
      ...(showStatus
        ? [
            columnHelper.accessor('status', {
              header: 'Outcome',
              cell: (info) => {
                const status = info.getValue() || 'Scouted'
                const className =
                  status === 'Success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : status === 'Failure'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : status === 'Converted'
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                return <Badge className={className}>{status}</Badge>
              },
            }),
            columnHelper.display({
              id: 'reached',
              header: 'Reached',
              cell: (info) =>
                info.row.original.sentAt ? (
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Sent</Badge>
                ) : (
                  <Badge className="border-slate-200 bg-slate-50 text-slate-600">Not reached</Badge>
                ),
            }),
          ]
        : []),
      columnHelper.display({
        id: 'save',
        header: '',
        cell: (info) =>
          info.row.original.saved ? (
            <Check className="size-4 text-primary" aria-label={`Saved ${info.row.original.name}`} />
          ) : onSave ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Save ${info.row.original.name}`}
              onClick={() => onSave(info.row.original)}
            >
              <Plus className="size-4" />
            </Button>
          ) : null,
      }),
      ...(onMessage
        ? [
            columnHelper.display({
              id: 'message',
              header: '',
              cell: (info) => {
                const name = info.row.original.name
                return (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Message ${name}`}
                    onClick={() => onMessage(info.row.original)}
                  >
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Mail className="size-4" />
                    </motion.span>
                  </Button>
                )
              },
            }),
          ]
        : []),
      columnHelper.display({
        id: 'open',
        header: '',
        cell: (info) => (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`View ${info.row.original.name}`}
            onClick={() => onOpen(info.row.original)}
          >
            <Eye className="size-4" />
          </Button>
        ),
      }),
    ],
    [onOpen, onSave, onMessage, showStatus],
  )

  const table = useReactTable({
    data: rows,
    columns,
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(totalCount / Math.max(pageSize, 1))),
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  })

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th key={header.id} className="px-4 py-3 font-medium">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={table.getVisibleLeafColumns().length} className="px-4 py-10 text-center text-muted-foreground">
                Scout a city to fill this table.
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      <TablePagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  )
}
