export type Pfcc = { id: string; name: string }

export type Fellowship = { id: string; name: string; pfccId: string | null }

export type Cell = { id: string; name: string; fellowshipId: string }

export type Member = {
  id: string
  name: string
  cellId: string
  email: string | null
  phone: string | null
}

export type StructureTree = {
  churchId: string
  churchName: string
  pfccs: Pfcc[]
  fellowships: Fellowship[]
  cells: Cell[]
  members: Member[]
}
