import { useEffect, useState } from 'react'
import { isPhoneListViewport, PHONE_LIST_MAX_WIDTH_PX } from '@/shared/lib/phone-list'

export function usePhoneListViewport(): boolean {
  const [phone, setPhone] = useState(() =>
    typeof window === 'undefined' ? false : isPhoneListViewport(window.innerWidth),
  )

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      setPhone(isPhoneListViewport(window.innerWidth))
      return
    }
    const media = window.matchMedia(`(max-width: ${PHONE_LIST_MAX_WIDTH_PX}px)`)
    const onChange = () => setPhone(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return phone
}
