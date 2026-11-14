export interface CrosswordImage {
  row: number
  col: number
  width: number
  height: number
  src: string
  alt: string
}
export type CrosswordPushStatus =
  'development' | 'not-configured' | 'unscheduled' | 'scheduled' | 'failed' | 'pending'
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
  pushSchedule?: { opensAt: string; status: 'scheduled' | 'failed' }
  pushSent?: Record<string, Partial<Record<'reminder' | 'opened', string>>>
  winner: { name: string; at: string } | null
  finished: Record<string, { name: string; at: string }>
  attempts: Record<string, number>
  progress?: Record<
    string,
    {
      letters: Record<string, string>
      startedAt?: string
      checkedDay?: string
      correctLetters?: Record<string, string>
    }
  >
}
export interface CrosswordView {
  id: '1'
  opensAt: string | null
  open: boolean
  preview: boolean
  winner: CrosswordState['winner']
  completed: boolean
  helpAt: string | null
  helpAvailable: boolean
  puzzle?: { revision: string; columns: number; rows: number; entries: CrosswordClue[] }
}

export interface CrosswordAnswerKey {
  puzzle: NonNullable<CrosswordView['puzzle']>
  solution: Record<string, string>
}

export interface CrosswordHelp {
  available: boolean
  availableAt: string | null
  nextAt: string | null
  checkedDay: string | null
  correctLetters: Record<string, string>
}

export interface CrosswordLeaderboard {
  mode: 'filled' | 'correct'
  helpAt: string | null
  totalWords: number
  totalLetters: number
  players: {
    id: string
    name: string | null
    label: string
    words: number
    letters: number
    completed: boolean
    winner: boolean
  }[]
}
