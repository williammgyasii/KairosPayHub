import { useEffect, useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { fetchGivingAttachmentBlobUrl } from '@/api/giving'
import { InlineSpinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

type GivingAttachmentImageProps = {
  attachmentKey: string | null | undefined
  alt: string
  className?: string
  frameClassName?: string
  onClick?: (blobUrl: string) => void
}

export function GivingAttachmentImage({
  attachmentKey,
  alt,
  className,
  frameClassName,
  onClick,
}: GivingAttachmentImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')

  useEffect(() => {
    const key = attachmentKey?.trim()
    if (!key) {
      setBlobUrl(null)
      setState('error')
      return
    }

    let active = true
    let objectUrl: string | null = null
    setState('loading')
    setBlobUrl(null)

    void fetchGivingAttachmentBlobUrl(key)
      .then((url) => {
        if (!active) {
          if (url) URL.revokeObjectURL(url)
          return
        }
        if (!url) {
          setState('error')
          return
        }
        objectUrl = url
        setBlobUrl(url)
        setState('ready')
      })
      .catch(() => {
        if (active) setState('error')
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [attachmentKey])

  if (!attachmentKey?.trim() || state === 'error') {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20',
          frameClassName,
        )}
      >
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <ImageIcon className="size-5" />
          <span className="text-[11px]">Proof unavailable</span>
        </div>
      </div>
    )
  }

  if (state === 'loading' || !blobUrl) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg border border-border/60 bg-muted/20',
          frameClassName,
        )}
      >
        <InlineSpinner className="size-5 text-muted-foreground" />
      </div>
    )
  }

  const image = (
    <img src={blobUrl} alt={alt} className={cn('h-full w-full object-cover', className)} />
  )

  if (!onClick) {
    return (
      <div className={cn('overflow-hidden rounded-lg border border-border/60 bg-muted/20', frameClassName)}>
        {image}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onClick(blobUrl)}
      className={cn(
        'group relative overflow-hidden rounded-lg border border-border/60 bg-muted/20',
        frameClassName,
      )}
    >
      {image}
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-xs font-medium text-white opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100">
        View proof
      </span>
    </button>
  )
}
