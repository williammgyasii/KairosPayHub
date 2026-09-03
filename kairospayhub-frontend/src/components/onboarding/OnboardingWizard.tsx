import { useState, type ReactNode } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronRight,
  Church,
  MapPin,
  UserRound,
  Users,
} from 'lucide-react'
import { useApi } from '@/api/useApi'
import { displayName, type Me, type MeNotOnboarded } from '@/api/me'
import { useAuth } from '@/auth/AuthContext'
import { AuthAlert } from '@/components/layout/auth-alert'
import { authEase, authFadeUp, authScaleIn, authStagger } from '@/components/layout/auth-motion'
import { CenteredPageShell } from '@/components/layout/centered-page-shell'
import { KairosLogo, KairosWordmark } from '@/components/layout/kairos-logo'
import { OnboardingContinueButton, OnboardingStepFooter } from '@/components/onboarding/onboarding-step-footer'
import {
  ONBOARDING_FINISH_LABELS,
  OnboardingFinishOverlay,
  runOnboardingFinishSequence,
} from '@/components/onboarding/onboarding-finish-overlay'
import { StructureTemplateWizard } from '@/components/structure/structure-template-wizard'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn, initials } from '@/lib/utils'

interface OnboardingWizardProps {
  me: MeNotOnboarded
  onComplete: (me: Me) => void
}

const STEPS = ['Welcome', 'Church details', 'Structure'] as const

const stepMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: authEase } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.25, ease: authEase } },
}

function FieldIcon({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
      {children}
    </span>
  )
}

function StepHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Church
  title: string
  description: string
}) {
  return (
    <div className="mb-4 flex items-start gap-3 text-left">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 pt-0.5">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export function OnboardingWizard({ me, onComplete }: OnboardingWizardProps) {
  const api = useApi()
  const { email } = useAuth()
  const [step, setStep] = useState(() => (me.onboardingStep === 'structure' ? 2 : 0))
  const [churchName, setChurchName] = useState(me.churchName ?? '')
  const [location, setLocation] = useState(me.location ?? '')
  const [pastorName, setPastorName] = useState(me.pastorName ?? displayName(me, email))
  const [memberCount, setMemberCount] = useState(
    me.memberCount != null ? String(me.memberCount) : '',
  )
  const [churchCreated, setChurchCreated] = useState(Boolean(me.churchId))
  const [busy, setBusy] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [finishLabelIndex, setFinishLabelIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const firstName = displayName(me, email).split(' ')[0] || 'Pastor'
  const progress = ((step + 1) / STEPS.length) * 100
  const shellWidth = step === 2 ? '2xl' : 'xl'

  async function createChurch(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const parsedCount = Number.parseInt(memberCount, 10)
      await api.post('/api/onboarding', {
        churchName: churchName.trim(),
        location: location.trim(),
        pastorName: pastorName.trim(),
        memberCount: Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : undefined,
      })
      setChurchCreated(true)
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save church details')
    } finally {
      setBusy(false)
    }
  }

  async function saveStructure(action: () => Promise<void>) {
    setBusy(true)
    setFinishing(true)
    setFinishLabelIndex(0)
    setError(null)
    try {
      let me: Me | null = null
      await runOnboardingFinishSequence(setFinishLabelIndex, async () => {
        await action()
        me = await api.get<Me>('/api/me')
      })
      if (me) onComplete(me)
    } catch (err) {
      setFinishing(false)
      setError(err instanceof Error ? err.message : 'Could not save structure')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <AnimatePresence>
        {finishing && (
          <OnboardingFinishOverlay label={ONBOARDING_FINISH_LABELS[finishLabelIndex]} />
        )}
      </AnimatePresence>

      <CenteredPageShell maxWidth={shellWidth} compact>
      <div className="fixed inset-x-0 top-0 z-10 h-0.5 bg-muted/60">
        <motion.div
          className="h-full bg-primary"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: authEase }}
        />
      </div>

      <motion.div
        variants={authStagger}
        initial="hidden"
        animate="show"
        className="flex w-full flex-col items-center text-center"
      >
        <motion.div variants={authScaleIn} className="mb-4 flex flex-col items-center gap-1.5">
          <KairosLogo size="sm" />
          <KairosWordmark className="text-xs text-muted-foreground" />
        </motion.div>

        <motion.p
          variants={authFadeUp}
          className="mb-4 text-xs font-medium text-muted-foreground"
        >
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </motion.p>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="welcome"
              {...stepMotion}
              className="flex w-full max-w-md flex-col items-center"
            >
              <Avatar className="mb-4 size-16 border border-primary/10">
                <AvatarFallback className="bg-primary/5 text-lg font-semibold text-primary">
                  {initials(me.name, me.email)}
                </AvatarFallback>
              </Avatar>

              <h1 className="text-xl font-semibold tracking-tight">Welcome, {firstName}</h1>
              <p className="mt-2 max-w-sm text-sm leading-snug text-muted-foreground">
                Set up your church, define your structure, and start tracking giving.
              </p>

              {error && (
                <div className="mt-4 w-full">
                  <AuthAlert variant="error">{error}</AuthAlert>
                </div>
              )}

              <Button className="mt-6 w-full max-w-xs" onClick={() => setStep(1)}>
                Get started
                <ChevronRight className="size-4" />
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="church" {...stepMotion} className="w-full text-left">
              <StepHeader
                icon={Church}
                title="Church details"
                description="Creates your workspace and assigns you as pastor."
              />

              <form onSubmit={createChurch}>
                {error && (
                  <div className="mb-3">
                    <AuthAlert variant="error">{error}</AuthAlert>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="church" className="text-xs">
                      Church name
                    </Label>
                    <div className="relative">
                      <FieldIcon>
                        <Church className="size-3.5" />
                      </FieldIcon>
                      <Input
                        id="church"
                        className="h-9 pl-8 text-sm"
                        placeholder="Grace Assembly"
                        value={churchName}
                        onChange={(e) => setChurchName(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="location" className="text-xs">
                      Location
                    </Label>
                    <div className="relative">
                      <FieldIcon>
                        <MapPin className="size-3.5" />
                      </FieldIcon>
                      <Input
                        id="location"
                        className="h-9 pl-8 text-sm"
                        placeholder="City, state"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pastor" className="text-xs">
                      Lead pastor
                    </Label>
                    <div className="relative">
                      <FieldIcon>
                        <UserRound className="size-3.5" />
                      </FieldIcon>
                      <Input
                        id="pastor"
                        className="h-9 pl-8 text-sm"
                        placeholder="Full name"
                        value={pastorName}
                        onChange={(e) => setPastorName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="members" className="text-xs">
                      Member count
                    </Label>
                    <div className="relative">
                      <FieldIcon>
                        <Users className="size-3.5" />
                      </FieldIcon>
                      <Input
                        id="members"
                        type="number"
                        min={1}
                        className="h-9 pl-8 text-sm"
                        placeholder="250"
                        value={memberCount}
                        onChange={(e) => setMemberCount(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <OnboardingStepFooter onBack={() => setStep(0)}>
                      <OnboardingContinueButton type="submit" loading={busy} loadingLabel="Saving…">
                        Continue
                      </OnboardingContinueButton>
                    </OnboardingStepFooter>
                  </div>
                </div>
              </form>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="structure"
              {...stepMotion}
              className={cn('w-full', error && 'space-y-3')}
            >
              {error && <AuthAlert variant="error">{error}</AuthAlert>}

              <StructureTemplateWizard
                variant="embedded"
                churchName={churchName}
                submitLabel={busy ? 'Finishing…' : 'Finish setup'}
                busy={busy}
                submit={saveStructure}
                onBack={
                  churchCreated
                    ? () => {
                        setError(null)
                        setStep(1)
                      }
                    : undefined
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      </CenteredPageShell>
    </>
  )
}
