export interface GameMenuState {
  open?: boolean
  winner?: unknown
  completed?: boolean
  opensAt?: string | null
}

/** Live, opening in <48h, open unfinished, completed, then closed. */
export function gameMenuPriority(state: GameMenuState | null | undefined, now: number) {
  if (state?.open && !state.winner) return 0
  const remaining = state?.opensAt ? Date.parse(state.opensAt) - now : NaN
  if (!state?.open && remaining > 0 && remaining < 48 * 3600_000) return 1
  if (state?.open && !state.completed) return 2
  if (state?.completed) return 3
  return 4
}

export function sortGameMenu<T extends { state?: GameMenuState | null }>(
  games: readonly T[],
  now: number,
): T[] {
  return games
    .map((game, index) => ({ game, index }))
    .sort((a, b) => {
      const first = gameMenuPriority(a.game.state, now)
      const second = gameMenuPriority(b.game.state, now)
      return (
        first - second ||
        (first === 1
          ? Date.parse(a.game.state!.opensAt!) - Date.parse(b.game.state!.opensAt!)
          : 0) ||
        a.index - b.index
      )
    })
    .map(({ game }) => game)
}
