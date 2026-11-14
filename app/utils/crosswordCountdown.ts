/** Show a live countdown only during the final 48 hours before opening. */
export function crosswordCountdown(opensAt: string | null | undefined, now: number) {
  if (!opensAt) return null
  const remaining = Date.parse(opensAt) - now
  if (!Number.isFinite(remaining) || remaining <= 0 || remaining > 48 * 60 * 60 * 1000) return null
  const seconds = Math.ceil(remaining / 1000)
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}
