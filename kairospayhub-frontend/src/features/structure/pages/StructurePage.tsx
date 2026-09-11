import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useApi } from '@/shared/api'
import { canManageChurch } from '@/api/auth'
import type { StructureLayerInput } from '@/api/structure'
import { StructureActionsMenu } from '@/features/structure/components/structure-actions-menu'
import { StructureCanvas } from '@/features/structure/components/structure-canvas'
import { StructureLayerEditModal } from '@/features/structure/components/structure-layer-edit-modal'
import {
  StructureLayerRemoveModal,
  StructureResetModal,
} from '@/features/structure/components/structure-reset-modal'
import {
  StructureEvolveWizard,
  type StructureEvolveMode,
} from '@/features/structure/components/structure-evolve-wizard'
import { StructureTemplateWizard } from '@/features/structure/components/structure-template-wizard'
import {
  canRemoveStructureLayer,
  structureLayerRemoveIntent,
} from '@/features/structure/lib/can-remove-structure-layer'
import { hasDesignedStructure } from '@/lib/structure-table-rows'
import { hasTemplate } from '@/lib/structure-dashboard'
import type { DashboardOutletContext } from '@/shared/layout/dashboard-layout'
import { DashboardPageHeader } from '@/shared/layout/dashboard-page-header'
import { getLayers } from '@/shared/lib/structure-tree'
import { useStructureTree } from '@/shared/lib/use-structure-tree'
import { Spinner } from '@/shared/ui/spinner'

export function StructurePage() {
  const api = useApi()
  const { me } = useOutletContext<DashboardOutletContext>()
  const { tree, error, busy, loading, submit, load } = useStructureTree()
  const [layerEditOpen, setLayerEditOpen] = useState(false)
  const [editLayerIndex, setEditLayerIndex] = useState<number | null>(null)
  const [evolveMode, setEvolveMode] = useState<StructureEvolveMode | null>(null)
  const [evolveInsertAt, setEvolveInsertAt] = useState(0)
  const [removeLayerIndex, setRemoveLayerIndex] = useState<number | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const churchManager = canManageChurch(me.role)

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !tree) {
    return <Spinner label="Loading structure…" />
  }

  if (!tree) {
    return (
      <p className="text-sm text-destructive">{error ?? 'Could not load structure.'}</p>
    )
  }

  const templated = hasTemplate(tree)
  const hasRoster = hasDesignedStructure(tree)
  const layers = getLayers(tree)

  function layerInputs(): StructureLayerInput[] {
    return layers.map((l) => ({
      standardType: l.standardType,
      displayName: l.displayName,
    }))
  }

  function resolveInsertEvolveMode(insertAt: number): StructureEvolveMode {
    if (insertAt === 0) return 'appendTop'
    if (insertAt >= layers.length) return 'appendBeforeMember'
    return 'insertAt'
  }

  function handleInsertAt(insertAt: number) {
    if (!churchManager) return
    if (hasRoster) {
      setEvolveInsertAt(insertAt)
      setEvolveMode(resolveInsertEvolveMode(insertAt))
      return
    }
    void submit(async () => {
      const template = tree!.template!
      const next = layerInputs()
      next.splice(insertAt, 0, { standardType: 'Fellowship', displayName: 'New layer' })
      await api.put('/api/structure/template', {
        name: template.name,
        layers: next,
      })
    })
  }

  function handleEditLayer(layerIndex: number | null) {
    if (!churchManager) return
    setEditLayerIndex(layerIndex)
    setLayerEditOpen(true)
  }

  function handleRemoveAt(layerIndex: number) {
    if (!churchManager) return
    if (!canRemoveStructureLayer(layers, layerIndex)) return
    setRemoveLayerIndex(layerIndex)
  }

  async function handleConfirmRemoveLayer() {
    if (removeLayerIndex === null || !tree?.template) return
    const next = layerInputs().filter((_, index) => index !== removeLayerIndex)
    await submit(async () => {
      await api.put('/api/structure/template', {
        name: tree.template!.name,
        layers: next,
      })
    })
    setRemoveLayerIndex(null)
  }

  async function handleConfirmReset() {
    await submit(async () => {
      await api.delete('/api/structure/template')
    })
    setResetOpen(false)
    setRemoveLayerIndex(null)
  }

  async function handleSaveLayerEdit(payload: {
    structureName: string
    layer: StructureLayerInput | null
  }) {
    await submit(async () => {
      if (hasRoster) {
        const nextLayers = layerInputs().map((layer, index) =>
          editLayerIndex === index && payload.layer ? payload.layer : layer,
        )
        await api.post('/api/structure/template/evolve', {
          operation: 'rename',
          name: payload.structureName,
          layers: nextLayers,
          dryRun: false,
        })
        return
      }

      const nextLayers = layerInputs().map((layer, index) =>
        editLayerIndex === index && payload.layer ? payload.layer : layer,
      )
      await api.put('/api/structure/template', {
        name: payload.structureName,
        layers: nextLayers,
      })
    })
  }

  if (!templated) {
    return (
      <div className="space-y-5">
        <DashboardPageHeader
          breadcrumbs={[
            { label: 'Dashboard', to: '/' },
            { label: 'Structure' },
          ]}
          title="Structure"
          description="Define how your church is organized — layer names only. Add actual PFCCs, cells, and members in Roster."
        />
        <StructureTemplateWizard
          churchName={tree.churchName}
          submitLabel="Save structure definition"
          busy={busy}
          submit={submit}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <DashboardPageHeader
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Structure' },
        ]}
        title="Structure"
        description={`How ${tree.churchName} is organized — layer names only, not individual units.`}
        actions={
          churchManager ? (
            <StructureActionsMenu
              hasRoster={hasRoster}
              busy={busy}
              onRename={() => setEvolveMode('rename')}
              onDelete={() => setResetOpen(true)}
            />
          ) : undefined
        }
      />

      <StructureCanvas
        tree={tree}
        editable={churchManager}
        busy={busy}
        onInsertAt={handleInsertAt}
        onRemoveAt={handleRemoveAt}
        onEditLayer={handleEditLayer}
      />

      <StructureLayerRemoveModal
        layerName={
          removeLayerIndex !== null ? layers[removeLayerIndex]?.displayName ?? null : null
        }
        intent={
          removeLayerIndex === null ? null : structureLayerRemoveIntent(hasRoster)
        }
        busy={busy}
        onConfirmRemove={() => {
          void handleConfirmRemoveLayer()
        }}
        onOfferReset={() => {
          setRemoveLayerIndex(null)
          setResetOpen(true)
        }}
        onClose={() => setRemoveLayerIndex(null)}
      />

      <StructureResetModal
        open={resetOpen}
        busy={busy}
        onConfirm={() => {
          void handleConfirmReset()
        }}
        onClose={() => setResetOpen(false)}
      />

      <StructureLayerEditModal
        open={layerEditOpen}
        onClose={() => {
          setLayerEditOpen(false)
          setEditLayerIndex(null)
        }}
        structureName={tree.template?.name ?? 'Main structure'}
        layer={
          editLayerIndex !== null
            ? {
                standardType: layers[editLayerIndex]!.standardType,
                displayName: layers[editLayerIndex]!.displayName,
              }
            : null
        }
        layerIndex={editLayerIndex}
        isCellLayer={editLayerIndex === layers.length - 1}
        busy={busy}
        onSave={handleSaveLayerEdit}
      />

      {evolveMode && (
        <StructureEvolveWizard
          tree={tree}
          mode={evolveMode}
          busy={busy}
          submit={submit}
          initialInsertAt={evolveInsertAt}
          onClose={() => {
            setEvolveMode(null)
            setEvolveInsertAt(0)
          }}
        />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
