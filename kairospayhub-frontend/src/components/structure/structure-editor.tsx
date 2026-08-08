import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { useApi } from '@/api/useApi'
import type { StructureLayer, StructureTree } from '@/api/structure'
import { StructureChainFromLabels } from '@/components/structure/structure-chain'
import {
  getDeepestLayer,
  getLayers,
  nodesAtLayer,
  parentOptionsForLayer,
} from '@/lib/structure-tree'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface StructureEditorProps {
  tree: StructureTree
  error: string | null
  busy: boolean
  submit: (action: () => Promise<void>) => Promise<void>
}

export function StructureEditor({ tree, error, busy, submit }: StructureEditorProps) {
  const api = useApi()
  const layers = getLayers(tree)
  const deepest = getDeepestLayer(tree)

  const [activeLayerId, setActiveLayerId] = useState(layers[0]?.id ?? '')
  const [nodeName, setNodeName] = useState('')
  const [parentNodeId, setParentNodeId] = useState('')
  const [memberName, setMemberName] = useState('')
  const [memberParentId, setMemberParentId] = useState('')

  const activeLayer = layers.find((l) => l.id === activeLayerId) ?? layers[0]
  const parentOptions = activeLayer ? parentOptionsForLayer(tree, activeLayer) : []
  const cellNodes = deepest ? nodesAtLayer(tree, deepest.id) : []

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <section className="rounded-xl border border-border/60 bg-background">
        <div className="border-b border-border/60 px-5 py-4">
          <h2 className="text-sm font-semibold tracking-tight">Your hierarchy</h2>
          <p className="mt-1 text-xs text-muted-foreground">{tree.churchName}</p>
          <StructureChainFromLabels
            labels={layers.map((layer) => layer.displayName)}
            includeChurch
            className="mt-3"
            size="sm"
          />
        </div>
        <div className="px-5 py-4">
          <StructureTreeView tree={tree} />
        </div>
      </section>

      <aside className="space-y-4">
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {layers.map((layer) => (
          <AddBlock
            key={layer.id}
            title={layer.displayName}
            hint={
              layer.sortOrder === 0
                ? `Add ${layer.displayName} directly under the church.`
                : `Pick a parent ${layers[layer.sortOrder - 1]?.displayName ?? 'node'}.`
            }
            open={activeLayerId === layer.id}
            onOpen={() => setActiveLayerId(layer.id)}
            onSubmit={(e) => {
              e.preventDefault()
              void submit(async () => {
                await api.post('/api/structure/nodes', {
                  layerId: layer.id,
                  parentNodeId: layer.sortOrder === 0 ? null : parentNodeId || null,
                  name: nodeName,
                })
                setNodeName('')
              })
            }}
            busy={busy}
            disabled={layer.sortOrder > 0 && parentOptions.length === 0}
            disabledHint={`Add ${layers[layer.sortOrder - 1]?.displayName ?? 'a parent'} first.`}
          >
            {layer.sortOrder > 0 && (
              <SelectField
                id={`parent-${layer.id}`}
                label="Parent"
                value={parentNodeId}
                onChange={setParentNodeId}
                required
                options={parentOptions.map((n) => ({ value: n.id, label: n.name }))}
              />
            )}
            <Field
              id={`node-${layer.id}`}
              label={`${layer.displayName} name`}
              value={nodeName}
              onChange={setNodeName}
            />
          </AddBlock>
        ))}

        {deepest && (
          <AddBlock
            title="Member"
            hint={`Assign members to a ${deepest.displayName}.`}
            open
            onSubmit={(e) => {
              e.preventDefault()
              void submit(async () => {
                await api.post('/api/structure/members', {
                  name: memberName,
                  parentNodeId: memberParentId,
                })
                setMemberName('')
              })
            }}
            busy={busy}
            disabled={cellNodes.length === 0}
            disabledHint={`Add a ${deepest.displayName} first.`}
          >
            <SelectField
              id="member-parent"
              label={deepest.displayName}
              value={memberParentId}
              onChange={setMemberParentId}
              required
              options={cellNodes.map((n) => ({ value: n.id, label: n.name }))}
            />
            <Field
              id="member-name"
              label="Member name"
              value={memberName}
              onChange={setMemberName}
            />
          </AddBlock>
        )}
      </aside>
    </div>
  )
}

function StructureTreeView({ tree }: { tree: StructureTree }) {
  const layers = getLayers(tree)

  if (!tree.template) {
    return (
      <p className="text-sm text-muted-foreground">
        Define your structure in the wizard first, then add nodes here.
      </p>
    )
  }

  const roots = layers[0] ? nodesAtLayer(tree, layers[0].id) : []
  const hasInstances = tree.nodes.length > 0 || tree.members.length > 0

  return (
    <div className="space-y-6">
      <TemplateDefinitionTable layers={layers} templateName={tree.template.name} />

      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Live tree
        </p>
        <div className="space-y-4">
          <TreeNode label={tree.churchName} kind="Church" bold />
          <div className="ml-4 border-l border-border/60 pl-4">
            {!hasInstances ? (
              <LayerOutline layers={layers} tree={tree} depth={0} />
            ) : roots.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Add your first {layers[0]?.displayName ?? 'node'} using the panel on the right.
              </p>
            ) : (
              roots.map((node) => (
                <NodeBranch key={node.id} tree={tree} node={node} layers={layers} depth={0} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TemplateDefinitionTable({
  layers,
  templateName,
}: {
  layers: StructureLayer[]
  templateName: string
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <div className="border-b border-border/60 bg-muted/20 px-4 py-2.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Saved in table
        </p>
        <p className="text-sm font-semibold">{templateName}</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/10 text-left text-xs text-muted-foreground">
            <th className="px-4 py-2 font-medium">#</th>
            <th className="px-4 py-2 font-medium">Standard type</th>
            <th className="px-4 py-2 font-medium">Display name</th>
          </tr>
        </thead>
        <tbody>
          {layers.map((layer) => (
            <tr key={layer.id} className="border-b border-border/40 last:border-0">
              <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                {layer.sortOrder + 1}
              </td>
              <td className="px-4 py-2.5">{layer.standardType}</td>
              <td className="px-4 py-2.5 font-medium">{layer.displayName}</td>
            </tr>
          ))}
          <tr className="bg-primary/5">
            <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{layers.length + 1}</td>
            <td className="px-4 py-2.5 text-muted-foreground">Member</td>
            <td className="px-4 py-2.5 font-medium text-primary">Member (leaf)</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/** Shows layer slots and counts when no instances exist yet. */
function LayerOutline({
  tree,
  layers,
  depth,
}: {
  tree: StructureTree
  layers: StructureLayer[]
  depth: number
}) {
  const layer = layers[depth]
  if (!layer) {
    return (
      <div className="mt-2">
        <TreeNode label="Members attach here" kind="Member" small muted />
      </div>
    )
  }

  const count = nodesAtLayer(tree, layer.id).length

  return (
    <div className="mt-3 first:mt-0">
      <TreeNode
        label={count > 0 ? `${count} ${layer.displayName}(s)` : `No ${layer.displayName} yet`}
        kind={layer.displayName}
        muted={count === 0}
      />
      {depth < layers.length - 1 && (
        <div className="ml-4 mt-2 border-l border-dashed border-border/50 pl-4">
          <LayerOutline tree={tree} layers={layers} depth={depth + 1} />
        </div>
      )}
      {depth === layers.length - 1 && (
        <div className="ml-4 mt-2 border-l border-dashed border-border/50 pl-4">
          <TreeNode label="Members attach to deepest layer" kind="Member" small muted />
        </div>
      )}
    </div>
  )
}

function NodeBranch({
  tree,
  node,
  layers,
  depth,
}: {
  tree: StructureTree
  node: StructureTree['nodes'][number]
  layers: StructureLayer[]
  depth: number
}) {
  const nextLayer = layers[depth + 1]
  const children = nextLayer
    ? nodesAtLayer(tree, nextLayer.id).filter((n) => n.parentNodeId === node.id)
    : []
  const members =
    !nextLayer && getDeepestLayer(tree)?.id === node.layerId
      ? tree.members.filter((m) => m.parentNodeId === node.id)
      : []

  const layer = layers[depth]

  return (
    <div className="mt-3 first:mt-0">
      <TreeNode label={node.name} kind={layer?.displayName ?? 'Node'} />
      {(children.length > 0 || members.length > 0) && (
        <div className="ml-4 mt-2 border-l border-border/40 pl-4">
          {children.map((child) => (
            <NodeBranch key={child.id} tree={tree} node={child} layers={layers} depth={depth + 1} />
          ))}
          {members.map((m) => (
            <div key={m.id} className="mt-2">
              <TreeNode label={m.name} kind="Member" small />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TreeNode({
  label,
  kind,
  bold,
  small,
  muted,
}: {
  label: string
  kind: string
  bold?: boolean
  small?: boolean
  muted?: boolean
}) {
  return (
    <div className="flex items-center gap-2 border-l-2 border-primary/20 pl-3">
      <div className="min-w-0">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {kind}
        </span>
        <p
          className={cn(
            'truncate',
            bold ? 'text-sm font-semibold' : small ? 'text-sm' : 'text-sm font-medium',
            muted && 'text-muted-foreground italic',
          )}
        >
          {label}
        </p>
      </div>
    </div>
  )
}

function AddBlock({
  title,
  hint,
  children,
  onSubmit,
  busy,
  disabled,
  disabledHint,
  open,
  onOpen,
}: {
  title: string
  hint: string
  children: React.ReactNode
  onSubmit: (e: FormEvent) => void
  busy: boolean
  disabled?: boolean
  disabledHint?: string
  open?: boolean
  onOpen?: () => void
}) {
  return (
    <section
      className={cn(
        'rounded-xl border border-border/60 bg-background p-4',
        open && 'ring-1 ring-primary/20',
      )}
      onFocus={onOpen}
    >
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      {disabled ? (
        <p className="mt-3 text-xs text-muted-foreground">{disabledHint}</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-3 space-y-2.5">
          {children}
          <Button type="submit" size="sm" disabled={busy} className="w-full">
            <Plus className="size-4" />
            Add {title.toLowerCase()}
          </Button>
        </form>
      )}
    </section>
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
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} required />
    </div>
  )
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  required,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  required?: boolean
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <select
        id={id}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
