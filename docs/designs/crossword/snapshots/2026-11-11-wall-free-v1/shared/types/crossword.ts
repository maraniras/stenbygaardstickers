export interface CrosswordImage {
  row: number
  col: number
  width: number
  height: number
  src: string
  alt: string
}
export interface CrosswordClue {
  clue: string
  length: number
  row: number
  col: number
  down: boolean
  image?: CrosswordImage
}
export interface CrosswordState {
  opensAt: string | null
  winner: { name: string; at: string } | null
  finished: Record<string, { name: string; at: string }>
  attempts: Record<string, number>
}
export interface CrosswordView {
  id: '1'
  opensAt: string | null
  open: boolean
  preview: boolean
  winner: CrosswordState['winner']
  completed: boolean
  puzzle?: { columns: number; rows: number; entries: CrosswordClue[] }
}
