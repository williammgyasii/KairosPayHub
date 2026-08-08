import { Link } from 'react-router-dom'
import { Network } from 'lucide-react'
import type { StructureTree } from '@/api/structure'
import { hasTemplate } from '@/lib/structure-dashboard'
import { Button } from '@/components/ui/button'

export function StructureSetupCallout({
  tree,
  churchName,
}: {
  tree: StructureTree | null
  churchName?: string | null
}) {
  if (hasTemplate(tree)) return null

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-primary/25 bg-primary/5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Network className="size-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Define your church structure</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Choose how {churchName?.trim() || 'your church'} is organized — then populate it in Roster.
          </p>
        </div>
      </div>

      <Button asChild className="shrink-0">
        <Link to="/structure">Define structure</Link>
      </Button>
    </div>
  )
}
