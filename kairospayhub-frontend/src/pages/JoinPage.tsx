import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { publicJoinApi, type JoinInvitePreview } from '@/api/join'
import { AuthAlert } from '@/shared/layout/auth-alert'
import { AuthLayout } from '@/shared/layout/AuthLayout'
import {
  MemberProfileFields,
  memberProfileInitialValues,
  memberProfilePayload,
} from '@/components/structure/member-profile-fields'
import { JoinSuccessView } from '@/components/structure/join-success-view'
import { Button } from '@/shared/ui/button'
import { canSubmitJoinVitals } from '@/lib/join-link-policy'
import { formatApiError } from '@/shared/lib/structure-tree'

export function JoinPage() {
  const { token } = useParams<{ token: string }>()
  const [preview, setPreview] = useState<JoinInvitePreview | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [profile, setProfile] = useState<ReturnType<typeof memberProfileInitialValues> | null>(null)
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) return
    void publicJoinApi
      .preview(token)
      .then((next) => {
        setPreview(next)
        setProfile(memberProfileInitialValues({ countryCode: next.countryCode }))
        setLoadError(null)
      })
      .catch((err) => {
        setPreview(null)
        setLoadError(formatApiError(err) || 'Ask your leader for a new link.')
      })
  }, [token])

  const canSubmit =
    profile != null &&
    canSubmitJoinVitals({
      name,
      email,
      phoneDialCode: profile.phoneDialCode,
      phoneLocal: profile.phoneLocal,
      dateOfBirth: profile.dateOfBirth,
      state: profile.state,
      countryCode: preview?.countryCode,
    })

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!token || !profile || !canSubmit) return
    setBusy(true)
    setSubmitError(null)
    try {
      await publicJoinApi.submit(token, {
        name: name.trim(),
        email: email.trim(),
        ...memberProfilePayload(profile),
      })
      setDone(true)
    } catch (err) {
      setSubmitError(formatApiError(err) || 'Ask your leader for a new link.')
    } finally {
      setBusy(false)
    }
  }

  if (loadError && !preview) {
    return (
      <AuthLayout
        variant="centered"
        title="This link is no longer valid"
        subtitle="Ask your leader for a new link."
      >
        <AuthAlert variant="error">{loadError}</AuthAlert>
      </AuthLayout>
    )
  }

  if (done) {
    return (
      <JoinSuccessView
        unitName={preview?.unitName ?? 'Your unit'}
        churchName={preview?.churchName}
      />
    )
  }

  return (
    <AuthLayout
      variant="centered"
      maxWidth="2xl"
      title={preview ? `Join ${preview.unitName}` : 'Join'}
      subtitle={
        preview
          ? `${preview.churchName} — enter your details. Your leader will accept you.`
          : 'Loading…'
      }
    >
      {!preview || !profile ? (
        <p className="text-sm text-muted-foreground">Loading form…</p>
      ) : (
        <form className="space-y-5" onSubmit={(e) => void onSubmit(e)}>
          {submitError && <AuthAlert variant="error">{submitError}</AuthAlert>}
          <MemberProfileFields
            layout="grid"
            requirePhoneAndDob
            requireEmail
            churchCountryCode={preview.countryCode}
            values={profile}
            onChange={(patch) => setProfile((current) => (current ? { ...current, ...patch } : current))}
            identity={{
              name,
              email,
              onName: setName,
              onEmail: setEmail,
            }}
          />
          <Button type="submit" className="w-full" disabled={!canSubmit || busy}>
            {busy ? 'Submitting…' : 'Submit'}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
