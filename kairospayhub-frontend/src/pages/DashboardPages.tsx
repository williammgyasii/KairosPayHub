import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Users, Network, Church, Layers } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { useApi } from '@/api/useApi'
import type { StructureTree } from '@/api/structure'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function OverviewPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const api = useApi()
  const [tree, setTree] = useState<StructureTree | null>(null)

  useEffect(() => {
    api.get<StructureTree>('/api/structure').then(setTree).catch(() => setTree(null))
  }, [api])

  const stats = [
    { label: 'PFCCs', value: tree?.pfccs.length ?? '—', icon: Layers },
    { label: 'Fellowships', value: tree?.fellowships.length ?? '—', icon: Church },
    { label: 'Cells', value: tree?.cells.length ?? '—', icon: Network },
    { label: 'Members', value: tree?.members.length ?? '—', icon: Users },
  ]

  return (
    <div className="space-y-6">
      <Card className="border-none bg-gradient-to-br from-primary/10 via-background to-background shadow-sm">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>
            {me.churchName ?? 'Your church'} is set up on KairosPayHub. Build your structure, then
            we&apos;ll add giving programs next.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick start</CardTitle>
          <CardDescription>Recommended next steps for your church setup.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Add fellowships and cells under Structure.</p>
          <p>2. Add members to cells so cell leaders can record giving later.</p>
          <p>3. Programs &amp; contributions are coming in the next phase.</p>
        </CardContent>
      </Card>
    </div>
  )
}

export function StructurePage() {
  return <StructurePanel />
}

export function ComingSoonPage({ feature }: { feature: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{feature}</CardTitle>
        <CardDescription>This section is coming in the next implementation phase.</CardDescription>
      </CardHeader>
    </Card>
  )
}

function StructurePanel() {
  const api = useApi()
  const [tree, setTree] = useState<StructureTree | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [pfccName, setPfccName] = useState('')
  const [fellowshipName, setFellowshipName] = useState('')
  const [cellName, setCellName] = useState('')
  const [cellFellowshipId, setCellFellowshipId] = useState('')
  const [memberName, setMemberName] = useState('')
  const [memberCellId, setMemberCellId] = useState('')

  const load = useCallback(async () => {
    setError(null)
    try {
      setTree(await api.get<StructureTree>('/api/structure'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load structure')
    }
  }, [api])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  async function submit(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hierarchy</CardTitle>
            <CardDescription>{tree?.churchName ?? 'Loading…'}</CardDescription>
          </CardHeader>
          <CardContent>
            {!tree ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : tree.fellowships.length === 0 && tree.pfccs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing added yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {tree.pfccs.map((p) => (
                  <li key={p.id} className="font-medium">
                    PFCC · {p.name}
                  </li>
                ))}
                {tree.fellowships.map((f) => (
                  <li key={f.id}>
                    <p className="font-medium">Fellowship · {f.name}</p>
                    <ul className="mt-2 space-y-2 border-l pl-4 text-muted-foreground">
                      {tree.cells
                        .filter((c) => c.fellowshipId === f.id)
                        .map((cell) => (
                          <li key={cell.id}>
                            <span className="text-foreground">Cell · {cell.name}</span>
                            <ul className="mt-1 space-y-1 pl-3">
                              {tree.members
                                .filter((m) => m.cellId === cell.id)
                                .map((m) => (
                                  <li key={m.id}>{m.name}</li>
                                ))}
                            </ul>
                          </li>
                        ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <QuickForm
            title="Add PFCC"
            onSubmit={(e) => {
              e.preventDefault()
              return submit(async () => {
                await api.post('/api/structure/pfccs', { name: pfccName })
                setPfccName('')
              })
            }}
            busy={busy}
          >
            <Field id="pfcc" label="Name" value={pfccName} onChange={setPfccName} />
          </QuickForm>

          <QuickForm
            title="Add fellowship"
            onSubmit={(e) => {
              e.preventDefault()
              return submit(async () => {
                await api.post('/api/structure/fellowships', { name: fellowshipName })
                setFellowshipName('')
              })
            }}
            busy={busy}
          >
            <Field id="fellowship" label="Name" value={fellowshipName} onChange={setFellowshipName} />
          </QuickForm>

          <QuickForm
            title="Add cell"
            onSubmit={(e) => {
              e.preventDefault()
              return submit(async () => {
                await api.post('/api/structure/cells', {
                  name: cellName,
                  fellowshipId: cellFellowshipId,
                })
                setCellName('')
              })
            }}
            busy={busy}
          >
            <div className="space-y-2">
              <Label htmlFor="cell-f">Fellowship</Label>
              <select
                id="cell-f"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={cellFellowshipId}
                onChange={(e) => setCellFellowshipId(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {tree?.fellowships.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <Field id="cell" label="Cell name" value={cellName} onChange={setCellName} />
          </QuickForm>

          <QuickForm
            title="Add member"
            onSubmit={(e) => {
              e.preventDefault()
              return submit(async () => {
                await api.post('/api/structure/members', {
                  name: memberName,
                  cellId: memberCellId,
                })
                setMemberName('')
              })
            }}
            busy={busy}
          >
            <div className="space-y-2">
              <Label htmlFor="member-cell">Cell</Label>
              <select
                id="member-cell"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={memberCellId}
                onChange={(e) => setMemberCellId(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {tree?.cells.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Field id="member" label="Member name" value={memberName} onChange={setMemberName} />
          </QuickForm>
        </div>
      </div>
    </div>
  )
}

function QuickForm({
  title,
  children,
  onSubmit,
  busy,
}: {
  title: string
  children: React.ReactNode
  onSubmit: (e: FormEvent) => void
  busy: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          {children}
          <Button type="submit" size="sm" disabled={busy}>
            <Plus className="h-4 w-4" />
            Save
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} required />
    </div>
  )
}
