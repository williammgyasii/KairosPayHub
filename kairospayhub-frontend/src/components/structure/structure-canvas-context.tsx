import { createContext, useContext, type ReactNode } from 'react'

export type StructureCanvasActions = {
  editable: boolean
  busy: boolean
  onInsertAt: (insertAt: number) => void
  onRemoveAt: (layerIndex: number) => void
  onEditLayer: (layerIndex: number | null) => void
}

const StructureCanvasContext = createContext<StructureCanvasActions | null>(null)

export function StructureCanvasProvider({
  value,
  children,
}: {
  value: StructureCanvasActions
  children: ReactNode
}) {
  return <StructureCanvasContext.Provider value={value}>{children}</StructureCanvasContext.Provider>
}

export function useStructureCanvasActions() {
  const ctx = useContext(StructureCanvasContext)
  if (!ctx) throw new Error('useStructureCanvasActions must be used within StructureCanvasProvider')
  return ctx
}
