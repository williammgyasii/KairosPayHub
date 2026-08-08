import { Link } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { StructureTree } from '@/api/structure'
import { StructureChainFromLabels } from '@/components/structure/structure-chain'
import { getLayers } from '@/lib/structure-tree'
import { hasDesignedStructure } from '@/lib/structure-table-rows'
import { Button } from '@/components/ui/button'

interface StructureDefinitionCardProps {
  tree: StructureTree
  onEdit: () => void
  onRename: () => void
  onAddLayer: () => void
  onDelete: () => void
  busy: boolean
}

export function StructureDefinitionCard({
  tree,
  onEdit,
  onRename,
  onAddLayer,
  onDelete,
  busy,
}: StructureDefinitionCardProps) {
  const template = tree.template!
  const layers = getLayers(tree)
  const hasRoster = hasDesignedStructure(tree)

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-border/60 bg-background">
        <div className="border-b border-border/60 bg-muted/20 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Saved structure
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">{template.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{tree.churchName}</p>
          <StructureChainFromLabels
            labels={layers.map((layer) => layer.displayName)}
            includeChurch
            className="mt-3"
          />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/10 text-left text-xs text-muted-foreground">
              <th className="px-5 py-2.5 font-medium">#</th>
              <th className="px-5 py-2.5 font-medium">Standard type</th>
              <th className="px-5 py-2.5 font-medium">Display name</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((layer) => (
              <tr key={layer.id} className="border-b border-border/40">
                <td className="px-5 py-3 tabular-nums text-muted-foreground">
                  {layer.sortOrder + 1}
                </td>
                <td className="px-5 py-3">{layer.standardType}</td>
                <td className="px-5 py-3 font-medium">{layer.displayName}</td>
              </tr>
            ))}
            <tr className="bg-primary/5">
              <td className="px-5 py-3 tabular-nums text-muted-foreground">{layers.length + 1}</td>
              <td className="px-5 py-3 text-muted-foreground">Member</td>
              <td className="px-5 py-3 font-medium text-primary">Member (leaf)</td>
            </tr>
          </tbody>
        </table>
      </section>

      <div className="flex flex-wrap gap-2">
        {hasRoster ? (
          <>
            <Button variant="outline" disabled={busy} onClick={onRename}>
              <Pencil className="size-4" />
              Rename labels
            </Button>
            <Button variant="outline" disabled={busy} onClick={onAddLayer}>
              <Plus className="size-4" />
              Add layer
            </Button>
          </>
        ) : (
          <Button variant="outline" disabled={busy} onClick={onEdit}>
            <Pencil className="size-4" />
            Edit definition
          </Button>
        )}
        <Button variant="outline" disabled={busy} onClick={onDelete}>
          <Trash2 className="size-4" />
          Delete
        </Button>
        <Button asChild variant="outline">
          <Link to="/roster">Go to roster</Link>
        </Button>
        <Button asChild>
          <Link to="/roster/membership">Go to membership</Link>
        </Button>
      </div>

      {hasRoster ? (
        <p className="text-sm text-muted-foreground">
          Your structure is one-way: church, org layers, then members. You can rename labels or
          append / insert layers with automatic re-linking. Removing or reordering layers comes in
          a later version. Clearing the full definition still requires an empty roster.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Edit the full layer chain while roster is empty. After you add units in Roster, use rename
          or add layer instead of replacing the definition.
        </p>
      )}
    </div>
  )
}
