import { useEffect, useMemo, useState } from 'react'
import { Bell, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { ApiError } from '@/shared/api/client'
import { useApi } from '@/shared/api/useApi'
import { shouldShowIosInstallHint } from '@/features/notifications/lib/ios-install-hint'
import { browserDisablePushDeps, browserEnablePushDeps } from '@/features/notifications/lib/browser-push'
import { isEdgeUserAgent, subscribeHangMessage } from '@/features/notifications/lib/subscribe-hang-message'
import { disableWebPush, enableWebPush } from '@/features/notifications/lib/web-push'
import { withTimeout } from '@/features/notifications/lib/with-timeout'

const SUBSCRIBE_TIMEOUT_MS = 20_000
const ADDRESS_BAR_STATUS =
  'Allow notifications in the address bar (lock or bell icon). Nothing changes on this page until you click Allow.'
const SECOND_CLICK_STATUS =
  'Allowed. Click Enable push once more — Edge needs that second click to finish.'

function alreadyWaitingForAddressBar(status: string | null) {
  return status === ADDRESS_BAR_STATUS
}

function enableErrorMessage(err: unknown) {
  if (err instanceof ApiError && err.status === 503) {
    return 'Push is not configured on this server yet.'
  }
  if (err instanceof Error && err.message) return err.message
  return 'Could not enable push.'
}

function enableButtonLabel(busy: boolean, status: string | null) {
  if (busy && alreadyWaitingForAddressBar(status)) return 'Waiting for the address bar…'
  if (busy) return 'Enabling…'
  return 'Enable push'
}

export function AccountNotificationsPage() {
  const api = useApi()
  const [busy, setBusy] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [vapidKey, setVapidKey] = useState<string | undefined>()
  const [status, setStatus] = useState<string | null>(null)
  const iosHint = useMemo(
    () =>
      shouldShowIosInstallHint({
        userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
        standalone:
          typeof window !== 'undefined' &&
          (window.matchMedia('(display-mode: standalone)').matches ||
            ('standalone' in navigator && Boolean((navigator as { standalone?: boolean }).standalone))),
      }),
    [],
  )

  useEffect(() => {
    let cancelled = false
    const { currentEndpoint } = browserDisablePushDeps(api)
    void currentEndpoint()
      .then((endpoint) => {
        if (!cancelled && endpoint) setEnabled(true)
      })
      .catch(() => {})
    void Promise.resolve(api.get<{ publicKey: string }>('/api/notifications/push/vapid-key'))
      .then((row) => {
        if (!cancelled && row?.publicKey) setVapidKey(row.publicKey)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [api])

  async function onEnable() {
    setBusy(true)
    try {
      const deps = browserEnablePushDeps(api)
      const result = await enableWebPush({
        ...deps,
        publicKey: vapidKey,
        stopAfterGrant: () =>
          isEdgeUserAgent(typeof navigator === 'undefined' ? '' : navigator.userAgent),
        onRequestingPermission: () => setStatus(ADDRESS_BAR_STATUS),
        onSubscribing: () => setStatus('Enabling push…'),
        subscribe: (publicKey) =>
          withTimeout(
            deps.subscribe(publicKey),
            SUBSCRIBE_TIMEOUT_MS,
            subscribeHangMessage(typeof navigator === 'undefined' ? '' : navigator.userAgent),
          ),
      })
      if (result === 'needsSecondClick') {
        setStatus(SECOND_CLICK_STATUS)
        return
      }
      if (result === 'denied') {
        setEnabled(false)
        setStatus('Browser permission was declined.')
        toast.error('Browser permission was declined.')
      } else if (result === 'unavailable') {
        setEnabled(false)
        setStatus('Push is not available in this browser. Try Chrome or an installed home-screen app on iPhone.')
        toast.error('Push is not available in this browser.')
      } else {
        setEnabled(true)
        setStatus('Push enabled on this device.')
        toast.success('Push enabled on this device.')
      }
    } catch (err) {
      const message = enableErrorMessage(err)
      setStatus(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  async function onDisable() {
    setBusy(true)
    setStatus('Disabling push…')
    try {
      await disableWebPush(browserDisablePushDeps(api))
      setEnabled(false)
      setStatus('Push disabled on this device.')
      toast.success('Push disabled on this device.')
    } catch {
      setStatus('Could not disable push.')
      toast.error('Could not disable push.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-start gap-3">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-white ${
            enabled ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
        >
          {enabled ? <CheckCircle2 className="size-5" aria-hidden /> : <Bell className="size-5" aria-hidden />}
        </span>
        <div>
          <p className="text-sm font-semibold">Alerts</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            The bell in the top bar updates while this tab is open. Enable push so your phone can
            buzz when the app is closed. Email preferences are still coming later.
          </p>
        </div>
      </div>
      {iosHint ? (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          On iPhone, add KairosPayHub to your Home Screen first (Share → Add to Home Screen), then
          enable push.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {enabled ? (
          <span
            role="status"
            aria-label="Push is on"
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300"
          >
            <CheckCircle2 className="size-4" aria-hidden />
            This device will buzz
          </span>
        ) : (
          <Button size="sm" disabled={busy} onClick={() => void onEnable()}>
            {enableButtonLabel(busy, status)}
          </Button>
        )}
        <Button variant="outline" size="sm" disabled={busy || !enabled} onClick={() => void onDisable()}>
          Disable push
        </Button>
      </div>
      {status && !enabled ? (
        <p role="status" className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          {status}
        </p>
      ) : null}
    </div>
  )
}
