import { type ReactNode, useState } from 'react'
import { Modal } from '@/shared/ui/modal'
import { cn } from '@/shared/lib/utils'
import type { PhoneListDetail } from '@/shared/lib/phone-list'

export type PhoneListVariant = 'cards' | 'flush'

export type PhoneListItem = {
  id: string
  title: string
  lines: string[]
  details: PhoneListDetail[]
  badges?: ReactNode
  footer?: ReactNode
  actions?: ReactNode
  toneClassName?: string
}

export function PhoneList({
  phone,
  items,
  empty,
  children,
  onItemOpen,
  variant = 'cards',
}: {
  phone: boolean
  items: PhoneListItem[]
  empty?: ReactNode
  children: ReactNode
  onItemOpen?: (id: string) => void
  variant?: PhoneListVariant
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const selected = items.find((item) => item.id === openId) ?? null

  if (!phone) return <>{children}</>

  if (items.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted-foreground">
        {empty ?? 'No rows yet.'}
      </p>
    )
  }

  return (
    <>
      <ul
        className={cn(
          'flex flex-col',
          variant === 'flush' ? 'divide-y divide-border/70' : 'gap-2 p-3',
        )}
      >
        {items.map((item) => (
          <li key={item.id}>
            <div
              data-testid="phone-list-row"
              data-variant={variant}
              className={cn(
                'bg-background',
                variant === 'flush'
                  ? 'grid grid-cols-[minmax(0,1fr)_auto]'
                  : 'flex items-start gap-1 rounded-xl border border-border/60',
                item.toneClassName,
              )}
            >
              <button
                type="button"
                aria-label={item.title}
                className={cn(
                  'min-w-0 text-left',
                  variant === 'flush' ? 'px-4 py-3' : 'flex-1 px-3.5 py-3',
                )}
                onClick={() => {
                  if (onItemOpen) {
                    onItemOpen(item.id)
                    return
                  }
                  setOpenId(item.id)
                }}
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="min-w-0 truncate font-medium">{item.title}</span>
                  {variant === 'cards' ? item.badges : null}
                </div>
                {item.lines.map((line) => (
                  <p key={line} className="mt-0.5 truncate text-xs text-muted-foreground">
                    {line}
                  </p>
                ))}
              </button>
              {item.actions ? (
                <div
                  className={cn('shrink-0', variant === 'flush' ? 'pr-2 pt-2' : 'pr-1.5 pt-1.5')}
                  onClick={(event) => event.stopPropagation()}
                >
                  {item.actions}
                </div>
              ) : null}
              {item.footer || (variant === 'flush' && item.badges) ? (
                <div
                  className={cn(
                    'col-span-2 flex items-center justify-between gap-3',
                    variant === 'flush' ? '-mt-1 px-4 pb-3' : 'w-full px-3.5 pb-3',
                  )}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="min-w-0">{item.footer}</div>
                  {variant === 'flush' ? (
                    <div className="flex shrink-0 items-center gap-1">{item.badges}</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {onItemOpen ? null : (
        <Modal
          open={selected != null}
          onOpenChange={(open) => {
            if (!open) setOpenId(null)
          }}
          title={selected?.title ?? ''}
          description={selected?.lines[0]}
        >
          {selected ? (
            <dl className="divide-y divide-border/60">
              {selected.details.map((detail) => (
                <div key={detail.label} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-2.5">
                  <dt className="text-xs text-muted-foreground">{detail.label}</dt>
                  <dd className="break-words text-sm">{detail.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </Modal>
      )}
    </>
  )
}
