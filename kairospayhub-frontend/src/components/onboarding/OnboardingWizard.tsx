import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, CheckCircle2, Church } from 'lucide-react'
import { useApi } from '@/api/useApi'
import { displayName, type Me } from '@/api/me'
import { useAuth } from '@/auth/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { initials } from '@/lib/utils'

interface OnboardingWizardProps {
  me: Me & { onboarded: false }
  onComplete: (me: Me) => void
}

const STEPS = ['Welcome', 'Your church', 'Ready'] as const

export function OnboardingWizard({ me, onComplete }: OnboardingWizardProps) {
  const api = useApi()
  const { email } = useAuth()
  const [step, setStep] = useState(0)
  const [churchName, setChurchName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const progress = ((step + 1) / STEPS.length) * 100
  const name = displayName(me, email)

  async function createChurch(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.post('/api/onboarding', { churchName })
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create church')
    } finally {
      setBusy(false)
    }
  }

  async function finish() {
    setBusy(true)
    setError(null)
    try {
      onComplete(await api.get<Me>('/api/me'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your account')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <div className="mb-8 space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
          <span>{STEPS[step]}</span>
        </div>
        <Progress value={progress} />
      </div>

      <Card className="border-none shadow-lg">
        {step === 0 && (
          <>
            <CardHeader className="items-center text-center">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">{initials(me.name, me.email)}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-xl">Welcome, {name.split(' ')[0] || 'Pastor'}</CardTitle>
              <CardDescription>
                Let&apos;s set up your church in KairosPayHub. This only takes a minute.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
              <Button className="w-full" onClick={() => setStep(1)}>
                Get started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </>
        )}

        {step === 1 && (
          <>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Church className="h-5 w-5" />
              </div>
              <CardTitle>Name your church</CardTitle>
              <CardDescription>
                This creates your church tenant and assigns you as pastor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createChurch} className="space-y-4">
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="space-y-2">
                  <Label htmlFor="church">Church name</Label>
                  <Input
                    id="church"
                    placeholder="e.g. Grace Assembly"
                    value={churchName}
                    onChange={(e) => setChurchName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(0)}>
                    Back
                  </Button>
                  <Button className="flex-1" type="submit" disabled={busy}>
                    {busy ? 'Creating…' : 'Create church'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader className="items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <CardTitle>You&apos;re all set</CardTitle>
              <CardDescription>
                <span className="font-medium text-foreground">{churchName}</span> is ready.
                You can add fellowships, cells, and members from your dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
              <Button className="w-full" onClick={finish} disabled={busy}>
                {busy ? 'Loading…' : 'Go to dashboard'}
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
