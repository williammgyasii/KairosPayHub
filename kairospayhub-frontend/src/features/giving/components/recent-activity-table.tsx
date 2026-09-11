import { useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import { formatAmount, type Contribution } from '@/features/giving/api'
import {
  contributionEntererLabel,
  contributionSubGivingLabel,
  formatGivingDate,
  formatGivingDateTime,
} from '@/features/giving/lib/giving-ui'
import {
  summarizeBatch,
  type ApprovalDisplayRow,
} from '@/features/giving/lib/contribution-batches'
import { ContributionStatusBadge, LegacyParentContributionBadge } from '@/features/giving/components/giving-badges'
import { ApprovalRowActionsMenu } from '@/features/giving/components/approval-row-actions-menu'
import { Button } from '@/shared/ui/button'
import { PhoneList } from '@/shared/ui/phone-list'
import { labeledPhoneCard } from '@/shared/lib/phone-list'
import { usePhoneListViewport } from '@/shared/lib/use-phone-list-viewport'
import { cn } from '@/shared/lib/utils'

type ActivityTableRow = {
  id: string
  kind: 'single' | 'batch'
  memberLabel: string
  amount: number
  currency: string
  dateSent: string
  createdAt: string
  status: string
  pendingApproverRole: string | null
  isLegacy: boolean
  campaignLabel: string
  enteredByLabel: string
  canAct: boolean
  contributionId?: string
  programId?: string
  batchContributions?: Contribution[]
}

function toActivityRows(
  rows: ApprovalDisplayRow[],
  actionableIds: Set<string>,
): ActivityTableRow[] {
  return rows.map((row) => {
    if (row.kind === 'batch') {
      const summary = summarizeBatch(row.batchId, row.contributions)
      const sample = row.contributions[0]
      return {
        id: `batch-${row.batchId}`,
        kind: 'batch' as const,
        memberLabel: `Batch · ${summary.memberCount} members`,
        amount: summary.totalAmount,
        currency: summary.currency,
        dateSent: summary.dateSent,
        createdAt: summary.createdAt,
        status: sample.status,
        pendingApproverRole: sample.pendingApproverRole,
        isLegacy: false,
        campaignLabel: contributionSubGivingLabel(sample) ?? sample.programTitle,
        enteredByLabel: contributionEntererLabel(sample),
        canAct: row.contributions.some((c) => actionableIds.has(c.id)),
        programId: sample.programId,
        batchContributions: row.contributions,
      }
    }

    const c = row.contribution
    return {
      id: c.id,
      kind: 'single' as const,
      memberLabel: c.memberName,
      amount: c.amount,
      currency: c.currency,
      dateSent: c.dateSent,
      createdAt: c.createdAt,
      status: c.status,
      pendingApproverRole: c.pendingApproverRole,
      isLegacy: c.isLegacyParentContribution,
      campaignLabel: contributionSubGivingLabel(c) ?? c.programTitle,
      enteredByLabel: contributionEntererLabel(c),
      canAct: actionableIds.has(c.id),
      contributionId: c.id,
      programId: c.programId,
    }
  })
}

const columnHelper = createColumnHelper<ActivityTableRow>()

interface RecentActivityTableProps {
  rows: ApprovalDisplayRow[]
  viewerRole: string
  emptyMessage?: string
  onSeeAll?: () => void
  actionableContributionIds?: string[]
  busy?: boolean
  onApprove?: (contributionId: string, programId: string) => Promise<void>
  onReject?: (contributionId: string, programId: string) => void
  onViewContribution?: (contributionId: string) => void
  onViewBatch?: (batchId: string) => void
}

export function RecentActivityTable({
  rows,
  viewerRole,
  emptyMessage = 'No recent activity yet.',
  onSeeAll,
  actionableContributionIds = [],
  busy,
  onApprove,
  onReject,
  onViewContribution,
}: RecentActivityTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const actionableIds = useMemo(
    () => new Set(actionableContributionIds),
    [actionableContributionIds],
  )
  const data = useMemo(() => toActivityRows(rows, actionableIds), [rows, actionableIds])
  const showActions = Boolean(onApprove || onReject || onViewContribution)

  const columns = useMemo(
    () => [
      columnHelper.accessor('memberLabel', {
        id: 'member',
        header: ({ column }) => <SortHeader column={column} label="Member" />,
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <p className="truncate text-xs font-medium">{row.original.memberLabel}</p>
            <ContributionStatusBadge
              status={row.original.status}
              viewerRole={viewerRole}
              pendingApproverRole={row.original.pendingApproverRole}
              className="h-5 shrink-0 px-1.5 text-[10px] font-medium"
            />
            {row.original.isLegacy && <LegacyParentContributionBadge className="scale-90" />}
          </div>
        ),
      }),
      columnHelper.accessor('amount', {
        id: 'amount',
        header: ({ column }) => <SortHeader column={column} label="Amount" />,
        cell: ({ row }) => (
          <span className="text-xs font-semibold tabular-nums">
            {formatAmount(row.original.amount, row.original.currency)}
          </span>
        ),
      }),
      columnHelper.accessor('dateSent', {
        id: 'dateSent',
        header: ({ column }) => <SortHeader column={column} label="Date sent" />,
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">{formatGivingDate(getValue())}</span>
        ),
      }),
      columnHelper.display({
        id: 'subGiving',
        header: 'Campaign',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{row.original.campaignLabel}</span>
        ),
      }),
      columnHelper.display({
        id: 'enteredBy',
        header: 'Logged by',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{row.original.enteredByLabel}</span>
        ),
      }),
      columnHelper.accessor('createdAt', {
        id: 'createdAt',
        header: ({ column }) => <SortHeader column={column} label="Logged at" />,
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">{formatGivingDateTime(getValue())}</span>
        ),
      }),
      ...(showActions
        ? [
            columnHelper.display({
              id: 'actions',
              header: () => <span className="sr-only">Actions</span>,
              cell: ({ row }) => {
                const item = row.original
                if (!item.canAct && !onViewContribution) return null
                return (
                  <div className="flex justify-end">
                    <ApprovalRowActionsMenu
                      busy={busy}
                      canAct={item.canAct && Boolean(onApprove || onReject)}
                      onView={
                        item.kind === 'single' && item.contributionId
                          ? () => onViewContribution?.(item.contributionId!)
                          : undefined
                      }
                      onApprove={
                        item.kind === 'single' && item.contributionId && item.programId
                          ? () => void onApprove?.(item.contributionId!, item.programId!)
                          : item.kind === 'batch' && item.batchContributions
                            ? () => {
                                void (async () => {
                                  for (const c of item.batchContributions!) {
                                    if (actionableIds.has(c.id)) {
                                      await onApprove?.(c.id, c.programId)
                                    }
                                  }
                                })()
                              }
                            : undefined
                      }
                      onReject={
                        item.kind === 'single' && item.contributionId && item.programId
                          ? () => onReject?.(item.contributionId!, item.programId!)
                          : undefined
                      }
                    />
                  </div>
                )
              },
            }),
          ]
        : []),
    ],
    [viewerRole, showActions, busy, onApprove, onReject, onViewContribution, actionableIds],
  )

  const phone = usePhoneListViewport()
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (rows.length === 0) {
    return <p className="px-4 py-8 text-center text-xs text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <div className="grid w-full min-w-0 overflow-x-auto overscroll-x-contain">
      <PhoneList
        phone={phone}
        empty={emptyMessage}
        onItemOpen={
          onViewContribution
            ? (id) => {
                const row = data.find((item) => item.id === id)
                if (row?.contributionId) onViewContribution(row.contributionId)
              }
            : undefined
        }
        items={data.map((row) => ({
          id: row.id,
          ...labeledPhoneCard(
            row.memberLabel,
            [formatAmount(row.amount, row.currency), row.campaignLabel],
            [
              { label: 'Member', value: row.memberLabel },
              { label: 'Amount', value: formatAmount(row.amount, row.currency) },
              { label: 'Campaign', value: row.campaignLabel },
              { label: 'Date', value: formatGivingDate(row.dateSent) },
              { label: 'Status', value: row.status },
            ],
          ),
        }))}
      >
      <table className="w-full border-collapse text-xs md:min-w-[720px] lg:min-w-[920px]">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-border/60 bg-muted/20 text-left">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-border/40 last:border-0">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2 align-middle">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </PhoneList>
      {onSeeAll && (
        <div className="border-t border-border/60 px-3 py-1.5 text-right">
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onSeeAll}>
            See all
          </Button>
        </div>
      )}
    </div>
  )
}

function SortHeader({
  column,
  label,
}: {
  column: {
    getIsSorted: () => false | 'asc' | 'desc'
    toggleSorting: (desc?: boolean) => void
  }
  label: string
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1 hover:text-foreground',
        column.getIsSorted() && 'text-foreground',
      )}
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      {label}
      <ArrowUpDown className="size-3 opacity-60" />
    </button>
  )
}
