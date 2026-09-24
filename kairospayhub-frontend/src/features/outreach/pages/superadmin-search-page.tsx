import { useEffect, useState } from 'react'
import { operatorGet, operatorPost } from '@/features/outreach/lib/operator-session'
import { usStates } from '@/features/outreach/lib/us-states'
import { OperatorShell } from '@/features/outreach/components/operator-shell'
import { SearchLeadsTable, type SearchLead } from '@/features/outreach/components/search-leads-table'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'

const RADII = [10, 25, 50]

type SearchResult = {
  churches: SearchLead[]
  totalCount: number
  page: number
  pageSize: number
}

export function SuperadminSearchPage() {
  const [stateCode, setStateCode] = useState('MD')
  const [city, setCity] = useState('')
  const [cities, setCities] = useState<string[]>([])
  const [radiusMiles, setRadiusMiles] = useState(25)
  const [locationOn, setLocationOn] = useState<boolean | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [rows, setRows] = useState<SearchLead[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [status, setStatus] = useState<'idle' | 'searching' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [openLead, setOpenLead] = useState<SearchLead | null>(null)

  useEffect(() => {
    let cancelled = false
    operatorGet<{ cities: string[] }>(`/api/outreach/cities?state=${stateCode}`)
      .then((result) => {
        if (cancelled) return
        setCities(result.cities)
        setCity((current) => (result.cities.includes(current) ? current : ''))
      })
      .catch(() => {
        if (!cancelled) setCities([])
      })
    return () => {
      cancelled = true
    }
  }, [stateCode])

  useEffect(() => {
    let cancelled = false
    async function fillFromGrantedLocation() {
      if (!navigator.permissions?.query) {
        setLocationOn(false)
        return
      }
      const permission = await navigator.permissions.query({ name: 'geolocation' })
      if (cancelled) return
      if (permission.state !== 'granted') {
        setLocationOn(false)
        return
      }
      setLocationOn(true)
      const position = await readPosition()
      const place = await operatorPost<{ state: string; city: string }>('/api/outreach/locations', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      })
      if (cancelled) return
      setStateCode(place.state)
      setCity(place.city)
    }
    void fillFromGrantedLocation().catch(() => {
      if (!cancelled) setLocationOn(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function scout(nextPage: number, nextPageSize = pageSize) {
    setStatus('searching')
    setMessage('')
    try {
      const result = await operatorPost<SearchResult>('/api/outreach/searches', {
        state: stateCode,
        city: city.trim(),
        radiusMiles,
        page: nextPage,
        pageSize: nextPageSize,
      })
      setRows(result.churches)
      setTotalCount(result.totalCount)
      setPage(result.page)
      setPageSize(result.pageSize)
      setStatus('idle')
      if (result.totalCount === 0) setMessage('No published emails in that city.')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'The search did not finish.')
    }
  }

  async function onLocate() {
    setStatus('searching')
    try {
      const position = await readPosition()
      const place = await operatorPost<{ state: string; city: string }>('/api/outreach/locations', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      })
      setStateCode(place.state)
      setCity(place.city)
      setLocationOn(true)
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Location permission was denied.')
    }
  }

  async function saveLead(lead: SearchLead) {
    await operatorPost(`/api/outreach/churches/${lead.id}/save`, {})
    setRows((current) => current.map((row) => (row.id === lead.id ? { ...row, saved: true } : row)))
  }

  return (
    <OperatorShell>
      <main>
        <h1 className="text-page-title">Search leads</h1>
        <p className="mt-2 text-sm text-muted-foreground">Find churches in a city. This page does not track replies.</p>
        <form
          className="mt-6 flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void scout(1)
          }}
        >
          {locationOn === false ? (
            <Button type="button" variant="outline" onClick={() => void onLocate()}>
              Use my location
            </Button>
          ) : null}
          <label className="flex flex-col gap-1 text-sm">
            State
            <select
              aria-label="State"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={stateCode}
              onChange={(event) => setStateCode(event.target.value)}
            >
              {usStates.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            City
            <select
              aria-label="City"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            >
              <option value="">Choose a city</option>
              {cities.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Radius
            <select
              aria-label="Radius"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={radiusMiles}
              onChange={(event) => setRadiusMiles(Number(event.target.value))}
            >
              {RADII.map((miles) => (
                <option key={miles} value={miles}>
                  {miles} miles
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={status === 'searching' || city.trim().length === 0}>
            {status === 'searching' ? 'Searching…' : 'Search'}
          </Button>
        </form>
        {message ? <p className="mt-4 text-sm">{message}</p> : null}
        <div className="mt-6">
          <SearchLeadsTable
            rows={rows}
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={(next) => void scout(next)}
            onPageSizeChange={(next) => void scout(1, next)}
            onOpen={setOpenLead}
            onSave={(lead) => void saveLead(lead)}
          />
        </div>
        <Modal open={openLead !== null} onOpenChange={(open) => !open && setOpenLead(null)} title={openLead?.name ?? 'Lead'}>
          {openLead ? (
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd>{openLead.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">State</dt>
                <dd>{openLead.state || 'Unknown'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">City</dt>
                <dd>{openLead.city || 'Unknown'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Address</dt>
                <dd>{openLead.address || 'Unknown'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Website</dt>
                <dd>
                  <a className="underline" href={openLead.website}>
                    {openLead.website}
                  </a>
                </dd>
              </div>
            </dl>
          ) : null}
        </Modal>
      </main>
    </OperatorShell>
  )
}

function readPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('Location permission was denied.')))
  })
}
