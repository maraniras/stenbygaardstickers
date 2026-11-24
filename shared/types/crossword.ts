export interface CrosswordImage {
  row: number
  col: number
  width: number
  height: number
  src: string
  alt: string
  fit?: string
  position?: string
  hideCaption?: boolean
  arrowRow?: number
  arrowCol?: number
}
export type CrosswordPushStatus =
  'development' | 'not-configured' | 'unscheduled' | 'scheduled' | 'failed' | 'pending'
export interface CrosswordClue {
  clueRow?: number
  clueCol?: number
  icon?: string
  iconKind?: string
  clue: string
  length: number
  row: number
  col: number
  down: boolean
  image?: CrosswordImage
}
export interface CrosswordState {
  id?: import('../utils/crosswords').CrosswordId
  opensAt: string | null
  pushSchedule?: {
    opensAt: string
    status: 'scheduled' | 'failed'
    version?: number
    tokenKey?: string
  }
  pushSent?: Record<
    string,
    Partial<Record<'announced' | 'day-before' | 'reminder' | 'opened', string>>
  >
  winnerPushSentAt?: string
  winner: { name: string; at: string } | null
  /** The unique physical winner prize; entitlement follows winner, not later completions. */
  prizeDeliveredAt?: string
  finished: Record<string, { name: string; at: string }>
  attempts: Record<string, number>
  progress?: Record<
    string,
    {
      letters: Record<string, string>
      startedAt?: string
      checkedDay?: string
      correctLetters?: Record<string, string>
      incorrectLetters?: Record<string, string>
    }
  >
}
export interface CrosswordView {
  letterShop?: import('../utils/crossword-letters').CrosswordLetterShop
  id: import('../utils/crosswords').CrosswordId
  title: string
  winnerPrize: number
  completionPrize: number
  opensAt: string | null
  open: boolean
  preview: boolean
  winner: CrosswordState['winner']
  completed: boolean
  helpAt: string | null
  helpAvailable: boolean
  puzzle?: {
    revision: string
    columns: number
    rows: number
    entries: CrosswordClue[]
    decorations?: CrosswordImage[]
  }
}

export interface CrosswordAnswerKey {
  puzzle: NonNullable<CrosswordView['puzzle']>
  solution: Record<string, string>
}

export interface CrosswordAdminProgress {
  puzzle: NonNullable<CrosswordView['puzzle']>
  totalLetters: number
  players: {
    id: string
    label: string
    completed: boolean
    letters: Record<string, string>
    correctLetters: Record<string, string>
  }[]
}

export interface CrosswordHelp {
  /** Entered wrong values from the daily snapshot, never the correct answer. */
  incorrectLetters?: Record<string, string>
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
