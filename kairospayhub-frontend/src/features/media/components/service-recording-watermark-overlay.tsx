import { useEffect, useState } from 'react'
import {
  buildServiceRecordingWatermarkText,
  SERVICE_RECORDING_WATERMARK_ROTATE_MS,
  serviceRecordingWatermarkPositionStyle,
  type ServiceRecordingWatermarkViewer,
} from '@/features/media/lib/service-recording-watermark-policy'
import { cn } from '@/shared/lib/utils'

type ServiceRecordingWatermarkOverlayProps = {
  viewer: ServiceRecordingWatermarkViewer
  className?: string
}

export function ServiceRecordingWatermarkOverlay({
  viewer,
  className,
}: ServiceRecordingWatermarkOverlayProps) {
  const [tick, setTick] = useState(0)
  const text = buildServiceRecordingWatermarkText(viewer)
  const position = serviceRecordingWatermarkPositionStyle(tick)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTick((current) => current + 1)
    }, SERVICE_RECORDING_WATERMARK_ROTATE_MS)

    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 z-10 overflow-hidden', className)}
    >
      <p
        className="absolute max-w-[min(88%,22rem)] select-none text-[clamp(0.65rem,1.6vw,0.85rem)] font-medium leading-snug text-white/80"
        style={{
          top: position.top,
          left: position.left,
          right: position.right,
          bottom: position.bottom,
          transform: position.transform,
          textShadow: '0 1px 2px rgb(0 0 0 / 0.85), 0 0 12px rgb(0 0 0 / 0.55)',
        }}
      >
        {text}
      </p>
    </div>
  )
}
