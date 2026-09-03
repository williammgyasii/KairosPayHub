import type { StructureTree } from '@/api/structure'
import { hasTemplate } from '@/lib/structure-dashboard'
import { getLayers, nodesAtLayer, resolveNodeLeader } from '@/lib/structure-tree'

export type SetupActionStatus = 'done' | 'current' | 'pending'

export type DashboardSetupAction = {
  id: string
  title: string
  description: string
  to: string
  status: SetupActionStatus
  detail?: string
}

const LEADER_LAYER_TYPES = new Set(['PFCC', 'Fellowship', 'Cell'])

export function unitsNeedingLeaders(tree: StructureTree) {
  return tree.nodes.filter((node) => {
    const layer = tree.template?.layers.find((l) => l.id === node.layerId)
    if (!layer || !LEADER_LAYER_TYPES.has(layer.standardType)) return false
    const leader = resolveNodeLeader(tree, node.id)
    return !leader.leaderName.trim()
  })
}

export function isEarlyChurchSetup(tree: StructureTree | null): boolean {
  if (!tree) return true
  if (!hasTemplate(tree)) return true
  if (tree.nodes.length === 0) return true
  if (unitsNeedingLeaders(tree).length > 0) return true
  return tree.members.length === 0
}

export function setupProgress(tree: StructureTree | null): { completed: number; total: number } {
  const actions = dashboardSetupActions(tree)
  const completed = actions.filter((action) => action.status === 'done').length
  return { completed, total: actions.length }
}

export function dashboardWelcomeSubtitle(tree: StructureTree | null): string {
  if (!tree || !hasTemplate(tree)) {
    return 'Define your structure, create units, and assign leaders — that spreads the work across your team.'
  }

  if (tree.nodes.length === 0) {
    return 'Your structure is saved. Set up your units next, then assign leaders for each one.'
  }

  const missingLeaders = unitsNeedingLeaders(tree)
  if (missingLeaders.length > 0) {
    return `${missingLeaders.length} unit${missingLeaders.length === 1 ? '' : 's'} still need${missingLeaders.length === 1 ? 's' : ''} a leader — assign them so your team can help run the church.`
  }

  if (tree.members.length === 0) {
    return 'Leaders are in place. Add members to your roster when you are ready.'
  }

  return "Here's what's happening across your church today."
}

export function dashboardSetupActions(tree: StructureTree | null): DashboardSetupAction[] {
  if (!tree) {
    return [
      {
        id: 'structure',
        title: 'Define your structure',
        description: 'Choose how your church is organized — PFCCs, fellowships, cells, and more.',
        to: '/structure',
        status: 'current',
      },
    ]
  }

  const templateDone = hasTemplate(tree)
  const unitsDone = tree.nodes.length > 0
  const unitsMissingLeaders = unitsNeedingLeaders(tree)
  const leadersDone = unitsDone && unitsMissingLeaders.length === 0
  const membersDone = tree.members.length > 0

  const raw: Omit<DashboardSetupAction, 'status'>[] = [
    {
      id: 'structure',
      title: 'Define your structure',
      description: 'Choose how your church is organized — PFCCs, fellowships, cells, and more.',
      to: '/structure',
    },
    {
      id: 'units',
      title: 'Set up your units',
      description: 'Create PFCCs, fellowships, and cells in Roster so every group has a place.',
      to: '/roster',
      detail: templateDone ? `${tree.nodes.length} unit${tree.nodes.length === 1 ? '' : 's'} created` : undefined,
    },
    {
      id: 'leaders',
      title: 'Assign unit leaders',
      description: 'Give each unit a leader so they can manage members, givings, and attendance.',
      to: '/roster',
      detail:
        unitsDone && !leadersDone
          ? `${unitsMissingLeaders.length} unit${unitsMissingLeaders.length === 1 ? '' : 's'} need a leader`
          : undefined,
    },
    {
      id: 'members',
      title: 'Add members',
      description: 'Register people under Membership once your units and leaders are ready.',
      to: '/roster/membership',
      detail: membersDone ? `${tree.members.length} on roster` : undefined,
    },
  ]

  const doneFlags = [templateDone, unitsDone, leadersDone, membersDone]
  let foundCurrent = false

  return raw.map((action, index) => {
    if (doneFlags[index]) {
      return { ...action, status: 'done' as const }
    }
    if (!foundCurrent) {
      foundCurrent = true
      return { ...action, status: 'current' as const }
    }
    return { ...action, status: 'pending' as const }
  })
}

/** Layer counts for quick setup context (e.g. empty fellowships). */
export function rosterLayerCounts(tree: StructureTree) {
  return getLayers(tree).map((layer) => ({
    label: layer.displayName,
    count: nodesAtLayer(tree, layer.id).length,
  }))
}
