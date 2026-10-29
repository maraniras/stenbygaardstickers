const DK_TIME = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Copenhagen', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
function localParts(now: Date) {
  return Object.fromEntries(DK_TIME.formatToParts(now).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)])) as Record<string, number>
}
/** Danish calendar day with a 04:00 boundary, independent of server timezone. */
export function gameDay(now = new Date()) {
  const p = localParts(now)
  const day = new Date(Date.UTC(p.year!, p.month! - 1, p.day! - (p.hour! < 4 ? 1 : 0)))
  return day.toISOString().slice(0, 10)
}
export function nextGameReset(now = new Date()) {
  const next = new Date(`${gameDay(now)}T12:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  const target = Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate(), 4)
  let guess = target
  for (let i = 0; i < 3; i++) {
    const p = localParts(new Date(guess))
    guess += target - Date.UTC(p.year!, p.month! - 1, p.day!, p.hour!, p.minute!, p.second!)
  }
  return new Date(guess).toISOString()
}
export function previousGameDay(day: string) {
  return new Date(Date.parse(`${day}T12:00:00Z`) - 86400_000).toISOString().slice(0, 10)
}
