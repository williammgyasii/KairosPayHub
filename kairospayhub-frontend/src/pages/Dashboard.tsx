import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useApi } from '../api/useApi'
import { displayName, needsOnboarding, type Me } from '../api/me'
import { useAuth } from '../auth/AuthContext'

export function Dashboard() {
  const api = useApi()
  const { email, signOut } = useAuth()
  const [me, setMe] = useState<Me | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [orgName, setOrgName] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      setMe(await api.get<Me>('/api/me'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your account')
    }
  }, [api])

  useEffect(() => {
    // Fetch the current user on mount; state updates happen after the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  async function onOnboard(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.post('/api/onboarding', { organizationName: orgName })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onboarding failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="topbar">
        <span className="brand">KairosPayHub</span>
        <span>
          <span className="muted" style={{ marginRight: 12 }}>
            {email}
          </span>
          <button className="link" onClick={signOut}>
            Sign out
          </button>
        </span>
      </div>

      <div className="page">
        {error && <p className="error">{error}</p>}
        {!me && !error && <p className="muted">Loading…</p>}

        {me && needsOnboarding(me) && (
          <form className="card" onSubmit={onOnboard} style={{ maxWidth: 420 }}>
            <h1>Set up your organization</h1>
            <p className="sub">Name your church or ministry to get started.</p>
            <div className="field">
              <label htmlFor="org">Organization name</label>
              <input
                id="org"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />
            </div>
            <button className="primary" type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create organization'}
            </button>
          </form>
        )}

        {me && me.onboarded && (
          <>
            <h1>Welcome, {displayName(me, email)}</h1>
            <p className="muted">You’re all set up. Feature building starts here.</p>
            <div style={{ marginTop: 24 }}>
              <div className="row">
                <span className="muted">Role</span>
                <span className="badge">{me.role}</span>
              </div>
              <div className="row">
                <span className="muted">Organization ID</span>
                <span>{me.organizationId}</span>
              </div>
              {me.churchId && (
                <div className="row">
                  <span className="muted">Church ID</span>
                  <span>{me.churchId}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
