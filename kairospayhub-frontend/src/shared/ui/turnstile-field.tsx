import { useEffect, useId, useRef, useState } from 'react'
import { isTurnstileEnabled, turnstileSiteKey } from '@/shared/lib/turnstile-site-key'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          action: string
          callback: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
        },
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId: string) => void
    }
  }
}

let scriptPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-kairos-turnstile]',
    )
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Turnstile failed to load')), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.dataset.kairosTurnstile = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Turnstile failed to load'))
    document.head.appendChild(script)
  })

  return scriptPromise
}

type TurnstileFieldProps = {
  action: 'login' | 'register' | 'forgot_password' | 'join'
  onTokenChange: (token: string | null) => void
}

export function TurnstileField({ action, onTokenChange }: TurnstileFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const fieldId = useId()

  useEffect(() => {
    if (!isTurnstileEnabled()) {
      onTokenChange(null)
      return
    }

    let cancelled = false

    void loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: turnstileSiteKey(),
          action,
          callback: (token) => onTokenChange(token),
          'expired-callback': () => onTokenChange(null),
          'error-callback': () => onTokenChange(null),
        })
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('Could not load verification. Refresh and try again.')
          onTokenChange(null)
        }
      })

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
      onTokenChange(null)
    }
  }, [action, onTokenChange])

  if (!isTurnstileEnabled()) return null

  return (
    <div className="space-y-2">
      <div ref={containerRef} id={fieldId} />
      {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
    </div>
  )
}
